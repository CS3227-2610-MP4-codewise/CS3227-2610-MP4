import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import {
  BoundaryError,
  ContractError,
} from '../../shared/instructor-contracts/schema';
import {
  MAX_ATTEMPT_RELEASES_BATCH,
  type AttemptReleases,
  type TrustedPrincipal,
} from '../instructor/ports/contracts';
import {
  currentnessSchema,
  currentnessToken,
  releaseSchema,
  withdrawnSchema,
  type Currentness,
  type Release,
  type Withdrawn,
} from '../../shared/instructor-contracts/release';
import { publicFeedbackFixtures } from '../../../workflow/assessment-preview/public-fixtures';
import type { StudentReleasePort } from './feedback';

/** Synthetic test fixtures only: no real learners, code or credentials. */
export const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
export const iso = (ms: number) => new Date(ms).toISOString();
export const PRIVATE = 'PRIVATE-REFERENCE-MARKER';
export const principal = (user: string): TrustedPrincipal =>
  ({ userId: user, sessionHandle: 'session-' + user }) as TrustedPrincipal;

export async function createDatabase(
  name: string,
  /** Extra migrations, e.g. 0008 assessments for composed feedback tests. */
  extra: string[] = [],
) {
  const mf = new Miniflare({
    ...convertV4MiniflareOptions({
      modules: true,
      script: 'export default {fetch(){return new Response()}}',
      compatibilityDate: '2026-11-04',
      d1Databases: { DB: name },
    }),
  });
  const db = (await mf.getD1Database('DB')) as unknown as D1Database;
  await db.batch([
    db.prepare(
      'CREATE TABLE auth_accounts(id TEXT PRIMARY KEY, active INTEGER NOT NULL)',
    ),
    db.prepare(
      'CREATE TABLE auth_sessions(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, revoked_at INTEGER, expires_at INTEGER, last_seen INTEGER)',
    ),
    // SW-11: the tables AuthStore.rate touches, as in migration 0003 (transactions reduced to
    // the columns its expiry cleanup reads).
    db.prepare(
      'CREATE TABLE auth_rate_limits(bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)',
    ),
    db.prepare('CREATE INDEX auth_rate_expiry ON auth_rate_limits(expires_at)'),
    db.prepare(
      'CREATE TABLE auth_transactions(id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)',
    ),
  ]);
  for (const migration of [
    '0002_instructor_assignments.sql',
    '0007_courses.sql',
    '0015_student_submissions.sql',
    ...extra,
  ].sort()) {
    const sql = await readFile('src/server/db/migrations/' + migration, 'utf8');
    await db.batch(
      sql
        .split(/^-- statement\s*$/m)
        .map((s) => s.trim())
        .filter((s) => s.replace(/^--.*$/gm, '').trim())
        .map((s) => db.prepare(s)),
    );
  }
  return { mf, db };
}

export async function seedPeople(
  db: D1Database,
  users: string[],
  memberships: [string, string, 'student' | 'instructor'][],
  courses: string[] = ['course-a', 'course-b'],
) {
  await db.batch([
    ...users.flatMap((u) => [
      db.prepare('INSERT INTO auth_accounts VALUES (?,1)').bind(u),
      db
        .prepare('INSERT INTO auth_sessions VALUES (?,?,NULL,?,?)')
        .bind('session-' + u, u, NOW + 3_600_000, NOW),
    ]),
    ...courses.map((c) =>
      db
        .prepare('INSERT INTO courses(id,name) VALUES (?,?)')
        .bind(c, 'Synthetic ' + c),
    ),
    ...memberships.map(([c, u, r]) =>
      db
        .prepare(
          'INSERT INTO course_memberships(course_id,user_id,role) VALUES (?,?,?)',
        )
        .bind(c, u, r),
    ),
  ]);
}

/** Publishes assignment `assignment` as version `version` with `count` questions q0..qN. */
export async function publish(
  db: D1Database,
  o: {
    course: string;
    assignment: string;
    version: string;
    number: number;
    deadline: string;
    count?: number;
    starter?: (i: number) => string;
    /** Test only: leave this question position without a rubric version. */
    skipRubricFor?: number;
  },
) {
  const count = o.count ?? 2;
  await db.batch([
    db
      .prepare(
        `INSERT INTO instructor_assignment_drafts(id,course_id,revision,payload,created_by,create_key,created_at,updated_at)
         VALUES(?,?,?,?, 'instructor-a', ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET revision=excluded.revision`,
      )
      .bind(
        o.assignment,
        o.course,
        o.number,
        JSON.stringify({ title: 'draft' }),
        'key-' + o.assignment,
        iso(NOW - 864e5),
        iso(NOW - 864e5),
      ),
    db
      .prepare(
        `INSERT INTO instructor_assignment_publications(id,assignment_id,course_id,publication_number,source_revision,published_by,published_at,request_key,fingerprint,title,deadline_at)
         VALUES(?,?,?,?,?,'instructor-a',?,?,'fingerprint-secret',?,?)`,
      )
      .bind(
        o.version,
        o.assignment,
        o.course,
        o.number,
        o.number,
        iso(NOW - 3600_000 + o.number),
        'req-' + o.version,
        'Synthetic ' + o.assignment,
        o.deadline,
      ),
    ...Array.from({ length: count }, (_, i) => [
      db
        .prepare(
          `INSERT INTO instructor_question_versions(id,question_id,publication_id,position,title,instructions,language,starter_code,private_reference)
           VALUES(?,?,?,?, 'Question', 'Use loops', 'python', ?, ?)`,
        )
        .bind(
          `qv-${o.version}-${i}`,
          'q' + i,
          o.version,
          i,
          o.starter?.(i) ?? `def solve${i}():\n    return ${i}\n`,
          PRIVATE,
        ),
      ...(i === o.skipRubricFor
        ? []
        : [
            db
              .prepare(
                'INSERT INTO instructor_rubric_versions(id,rubric_id,question_version_id) VALUES(?,?,?)',
              )
              .bind(`rv-${o.version}-${i}`, 'r' + i, `qv-${o.version}-${i}`),
            db
              .prepare(
                "INSERT INTO instructor_criterion_versions(rubric_version_id,criterion_id,position,comparison_key,descriptor,minimum_units,maximum_units) VALUES(?, 'c1', 0, 'k1', 'Correct output', 0, 500)",
              )
              .bind(`rv-${o.version}-${i}`),
          ]),
    ]).flat(),
  ]);
}

/** Sessions port for handler tests: header-selected user, origin and CSRF gate. */
export const ORIGIN = 'https://app.example.test';
export const testSessions = {
  async requireSession(request: Request) {
    const user = request.headers.get('x-test-user');
    if (!user) throw new BoundaryError('UNAUTHENTICATED');
    return { principal: principal(user) };
  },
  async requireMutationOrigin(request: Request) {
    if (
      request.headers.get('origin') !== ORIGIN ||
      request.headers.get('x-csrf') !== 'valid'
    )
      throw new BoundaryError('FORBIDDEN');
  },
};

/**
 * SF-02, SF-05, SF-08: in-memory C-REL producer fake, built from the public fixtures. It mirrors
 * the producer's observable rules (all-or-nothing own-attempt authorization, monotonic
 * availabilityRevision, P4 withdrawal without revival, currentness re-check around each read). It
 * is a fixture, not integration evidence.
 */
type FakeAssessment = {
  assessmentId: string;
  owner: string;
  availabilityRevision: number;
  current: number | null;
  releases: Map<number, Release>;
  withdrawn: Map<number, string>;
};
export class FakeReleasePort implements StudentReleasePort {
  readonly calls: string[] = [];
  readonly assessments = new Map<string, FakeAssessment>();
  /** Runs once inside the next getAuthorized, between its read and its own currentness re-check. */
  duringRead?: () => void;
  /** Runs once when the next getAuthorized returns, before the consumer's own re-check. */
  afterRead?: () => void;
  /** Makes the next call fail as if the producer were unavailable. */
  unavailable = false;
  constructor(readonly at: () => string = () => iso(NOW)) {}

  /** An assessment that exists but has no release yet (draft or approved only). */
  assess(attemptId: string, owner: string) {
    this.assessments.set(attemptId, {
      assessmentId: 'assessment-' + attemptId,
      owner,
      availabilityRevision: 0,
      current: null,
      releases: new Map(),
      withdrawn: new Map(),
    });
  }
  /** Releases the next version, built from the public fixture with this attempt's identities. */
  release(
    attemptId: string,
    patch: Partial<Pick<Release, 'criteria' | 'annotations'>> = {},
  ): Release {
    const a = this.assessments.get(attemptId)!;
    const version = a.releases.size + 1;
    const release = releaseSchema.parse({
      ...publicFeedbackFixtures().first,
      id: a.assessmentId,
      submissionAttemptId: attemptId,
      assessmentRevisionId: `revision-${attemptId}-${version}`,
      releaseVersion: version,
      releasedAt: iso(NOW + version * 60_000),
      state: 'released',
      ...patch,
    });
    a.releases.set(version, release);
    a.current = version;
    a.availabilityRevision++;
    return release;
  }
  withdraw(attemptId: string, version: number) {
    const a = this.assessments.get(attemptId)!;
    a.withdrawn.set(version, iso(NOW + (10 + version) * 60_000));
    if (a.current === version) a.current = null;
    a.availabilityRevision++;
  }

  private gate(principal: TrustedPrincipal, attemptId: string) {
    if (this.unavailable) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    const a = this.assessments.get(attemptId);
    if (a && a.owner !== principal.userId) throw new BoundaryError('FORBIDDEN');
    return a;
  }
  private byAssessment(principal: TrustedPrincipal, assessmentId: string) {
    for (const [attemptId, a] of this.assessments)
      if (a.assessmentId === assessmentId) {
        this.gate(principal, attemptId);
        return { attemptId, a };
      }
    throw new BoundaryError('NOT_FOUND');
  }
  private snapshot(attemptId: string, a: FakeAssessment): Currentness {
    return currentnessSchema.parse({
      schemaVersion: 1,
      assessmentId: a.assessmentId,
      submissionAttemptId: attemptId,
      availabilityRevision: a.availabilityRevision,
      currentReleaseVersion: a.current,
      withdrawnReleaseVersions: [...a.withdrawn.keys()].sort((x, y) => x - y),
      checkedAt: this.at(),
    });
  }

  async attemptReleases(
    principal: TrustedPrincipal,
    attemptIds: readonly string[],
  ) {
    this.calls.push('attemptReleases:' + attemptIds.length);
    if (
      attemptIds.length < 1 ||
      attemptIds.length > MAX_ATTEMPT_RELEASES_BATCH ||
      new Set(attemptIds).size !== attemptIds.length
    )
      throw new ContractError('$.attemptIds', 'array');
    for (const id of attemptIds) this.gate(principal, id);
    const out = new Map<string, AttemptReleases | null>();
    for (const id of attemptIds) {
      const a = this.assessments.get(id);
      out.set(
        id,
        a && a.releases.size
          ? {
              assessmentId: a.assessmentId,
              currentness: this.snapshot(id, a),
              releaseVersions: [...a.releases.keys()].sort((x, y) => x - y),
            }
          : null,
      );
    }
    return out;
  }
  async getAuthorized(
    principal: TrustedPrincipal,
    assessmentId: string,
    version: number,
  ): Promise<Release | Withdrawn> {
    this.calls.push('getAuthorized:' + version);
    const { attemptId, a } = this.byAssessment(principal, assessmentId);
    const before = currentnessToken(this.snapshot(attemptId, a));
    const r = a.releases.get(version);
    if (!r) throw new BoundaryError('NOT_FOUND');
    const withdrawnAt = a.withdrawn.get(version);
    const value: Release | Withdrawn = withdrawnAt
      ? withdrawnSchema.parse({
          schemaVersion: 1,
          id: a.assessmentId,
          submissionAttemptId: attemptId,
          releaseVersion: version,
          state: 'withdrawn',
          withdrawnAt,
        })
      : releaseSchema.parse({
          ...r,
          state: a.current === version ? 'released' : 'superseded',
        });
    const during = this.duringRead;
    this.duringRead = undefined;
    during?.();
    if (currentnessToken(this.snapshot(attemptId, a)) !== before)
      throw new BoundaryError('STALE_EVIDENCE');
    const after = this.afterRead;
    this.afterRead = undefined;
    after?.();
    return value;
  }
  async currentness(principal: TrustedPrincipal, assessmentId: string) {
    this.calls.push('currentness');
    const { attemptId, a } = this.byAssessment(principal, assessmentId);
    return this.snapshot(attemptId, a);
  }
}
