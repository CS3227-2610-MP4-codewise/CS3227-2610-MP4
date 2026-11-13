import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { authDatabase } from '../auth/database';
import { SyntheticFirebase } from '../auth/synthetic-firebase';
import { ManagedStore } from '../../src/server/auth/managed-store';
import { FirebaseCredentials } from '../../src/server/auth/firebase';
import { csrfToken, hash, randomToken } from '../../src/server/auth/primitives';
import { createApplication } from '../../src/server/index';
import type { Environment } from '../../src/server/environment';
import { publish } from '../../src/server/student/test-fixture';
import { StudentWork } from '../../src/server/student/work';
import { CourseAuthority } from '../../src/server/courses/authority';
import { D1Assignments } from '../../src/server/instructor/assignments/repository';
import { AssignmentService } from '../../src/server/instructor/assignments/service';
import { AssessmentRepository } from '../../src/server/instructor/assessments/repository';
import { AssessmentWorkflow } from '../../src/server/instructor/assessments/workflow';
import { D1SubmissionCatalog } from '../../src/server/student/catalog';
import type {
  IdentityCoursePort,
  TrustedPrincipal,
} from '../../src/server/instructor/ports/contracts';
import {
  draftSaveRequestSchema,
  submitRequestSchema,
} from '../../src/shared/student-work';

/**
 * student-progress 4.2 (D7, AI-01, OPS-01): the composed Worker's progress routes with real
 * auth, real released assessments (Darryl's workflow) and the real gateway over a stubbed
 * provider fetch. Disabled by default; enabled only by the student switch and config.
 * Synthetic data only; no network.
 */
let database: Awaited<ReturnType<typeof authDatabase>>;
const provider = new SyntheticFirebase();
const origin = 'https://app.example.test';
const uid = 'synthetic-progress-user';
const email = 'progress-student@u.nus.edu';
let token: string;
let env: Environment;
let providerCalls = 0;
const keysSeen: string[] = [];
const realFetch = globalThis.fetch;
const config = {
  model: 'synthetic-model',
  promptVersion: 'synthetic-progress-v1',
  outputTokenLimit: 1024,
  inputTokenReservation: 10000,
  maxInputBytes: 100000,
  deadlineMs: 60000,
  cacheMs: 0,
  userRequestLimit: 10,
  providerRequestLimit: 10,
  userTokenLimit: 100000,
  providerTokenLimit: 100000,
  concurrencyLimit: 1,
  windowMs: 86400000,
};

beforeAll(async () => {
  database = await authDatabase();
  for (const name of [
    '0002_instructor_assignments.sql',
    '0007_courses.sql',
    '0008_instructor_assessments.sql',
    '0013_ai_gateway.sql',
    '0014_assessment_ai_candidates.sql',
    '0015_student_submissions.sql',
    '0016_instructor_ai_recovery.sql',
    '0017_student_progress.sql',
  ]) {
    const sql = await readFile('src/server/db/migrations/' + name, 'utf8');
    await database.db.batch(
      sql
        .split(/^-- statement\s*$/m)
        .filter((s) => s.replace(/^--.*$/gm, '').trim())
        .map((s) => database.db.prepare(s)),
    );
  }
  const now = Date.now();
  await database.db
    .prepare("INSERT INTO courses(id,name) VALUES('course-a','Synthetic')")
    .run();
  await provider.provision(uid, email);
  await provider.verifyEmail(uid);
  const invite = randomToken();
  await database.db
    .prepare(
      'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(?,?,?,?,?)',
    )
    .bind(crypto.randomUUID(), await hash(invite), email, now, now + 86400000)
    .run();
  const store = new ManagedStore(database.db);
  token = await store.loginManaged(
    randomToken(),
    await provider.current(uid),
    provider.issuer,
    '/workspace',
    invite,
  );
  const session = await store.session(token);
  const principal = {
    userId: session.user_id,
    sessionHandle: session.id,
  } as TrustedPrincipal;
  await database.db.batch(
    ['instructor', 'student'].map((role) =>
      database.db
        .prepare(
          'INSERT INTO course_memberships(course_id,user_id,role) VALUES(?,?,?)',
        )
        .bind('course-a', principal.userId, role),
    ),
  );

  // Two released assignments that share comparison key k1 (fixture rubric).
  const db = database.db;
  const work = new StudentWork(db);
  const authority = new CourseAuthority(db);
  const identity: IdentityCoursePort = {
    async requireSession() {
      return principal;
    },
    async requireMutationOrigin() {},
    requireCourse: authority.requireCourse.bind(authority),
    requireObject: authority.requireObject.bind(authority),
  };
  const inst = (method = 'GET') =>
    new Request(origin + '/api/instructor/assessments', { method });
  const service = () =>
    new AssessmentWorkflow(
      inst(),
      identity,
      new AssignmentService(new D1Assignments(db), identity),
      new AssessmentRepository(db),
      new D1SubmissionCatalog(db),
    ).service;
  for (const [i, score] of [
    [1, 1],
    [2, 2],
  ]) {
    await publish(db, {
      course: 'course-a',
      assignment: 'assignment-' + i,
      version: 'publication-' + i,
      number: 1,
      deadline: new Date(now + 86400000).toISOString(),
      count: 1,
    });
    await work.save(
      principal,
      `qv-publication-${i}-0`,
      draftSaveRequestSchema.parse({
        schemaVersion: 1,
        baseRevision: 0,
        source: 'print(1)\n',
      }),
    );
    const draft = await work.work(principal, 'publication-' + i);
    const { attemptId } = await work.submit(
      principal,
      'publication-' + i,
      submitRequestSchema.parse({
        schemaVersion: 1,
        idempotencyKey: 'submit-' + i,
        answers: draft.questions.map((q) => ({
          questionVersionId: q.questionVersionId,
          draftRevision: q.revision,
          sourceHash: q.sourceHash,
        })),
      }),
    );
    const created = await service().create(inst('POST'), {
      attemptId,
      requestKey: 'create-' + i,
    });
    const saved = await service().save(inst('PUT'), created.head.id, {
      expectedRevisionId: created.head.headRevisionId,
      feedback: {
        ...created.revision.feedback,
        criteria: created.revision.feedback.criteria.map((c) => ({
          ...c,
          score,
          explanation: 'Static inspection only.',
        })),
      },
    });
    const approved = await service().approve(inst('POST'), saved.head.id, {
      expectedRevisionId: saved.head.headRevisionId,
      expectedAvailabilityRevision: saved.head.availabilityRevision,
    });
    await service().release(inst('POST'), saved.head.id, {
      schemaVersion: 1,
      assessmentId: saved.head.id,
      assessmentRevisionId: approved.head.headRevisionId,
      expectedAvailabilityRevision: approved.head.availabilityRevision,
      idempotencyKey: 'release-' + i,
    });
  }

  vi.spyOn(FirebaseCredentials.prototype, 'current').mockImplementation(
    async (id) => provider.current(id),
  );
  vi.stubGlobal(
    'fetch',
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://soclaas-api.comp.nus.edu.sg/v1/chat/completions') {
        providerCalls++;
        keysSeen.push(
          new Headers(init?.headers).get('authorization') ?? 'none',
        );
        const { facts } = JSON.parse(
          (
            JSON.parse(String(init?.body)) as {
              messages: { content: string }[];
            }
          ).messages[1].content,
        ) as {
          facts: {
            recent: {
              ref: string;
              criteria: { key: string; atMaximum: boolean }[];
            }[];
          };
        };
        const payload = {
          kind: 'progress-explanation',
          recentAssignments: facts.recent.map((r) => ({
            evidence: r.ref,
            strengths: [],
            focus: r.criteria
              .filter((c) => !c.atMaximum)
              .slice(0, 1)
              .map((c) => ({ key: c.key, text: 'Work on this part next.' })),
          })),
          recurringIssues: [],
          improvements: [],
          suggestions: [
            {
              text: 'Practise explaining your output format before submitting.',
              evidence: ['R1'],
            },
          ],
          limitations: ['Only two released assignments were available.'],
        };
        return Response.json({
          choices: [
            {
              finish_reason: 'stop',
              message: { content: JSON.stringify(payload) },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        });
      }
      if (/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/)/.test(url))
        return realFetch(input, init);
      throw new Error('Unexpected network request in offline test');
    },
  );
  env = {
    APP_ENV: 'staging',
    APP_VERSION: 'test',
    DB: database.db,
    ASSETS: { fetch: async () => new Response('asset') },
    AUTH_ORIGIN: origin,
    FIREBASE_PROJECT_ID: 'synthetic-project',
    FIREBASE_API_KEY: 'synthetic',
    FIREBASE_SERVICE_ACCOUNT_EMAIL: 'synthetic@example.invalid',
    FIREBASE_PRIVATE_KEY: 'synthetic',
    SOCLAAS_INSTRUCTOR_API_KEY: 'synthetic-instructor-secret',
    SOCLAAS_STUDENT_API_KEY: 'synthetic-student-secret',
    SOCLAAS_STUDENT_CONFIG: JSON.stringify(config),
  } as unknown as Environment;
}, 120000);
afterAll(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await database?.close();
});

async function call(method = 'GET', body?: unknown) {
  return createApplication().fetch(
    new Request(origin + '/api/student/courses/course-a/progress', {
      method,
      headers: {
        cookie: '__Host-codewise-session=' + token,
        'x-csrf-token': await csrfToken(token),
        origin,
        'content-type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env,
  );
}

describe(
  'composed student progress (student-progress 4.2)',
  { timeout: 120000 },
  () => {
    it('is disabled by default, then uses the real gateway with the student key', async () => {
      const off = await call();
      expect(off.status).toBe(200);
      expect(await off.json()).toMatchObject({
        state: 'ready',
        aiAvailable: false,
      });
      const refused = await call('POST', { idempotencyKey: 'p1' });
      expect(refused.status).toBe(503);
      expect((await refused.json()).error.code).toBe('AI_DISABLED');
      expect(providerCalls).toBe(0);

      env = { ...env, SOCLAAS_STUDENT_ENABLED: 'true' };
      const generated = await call('POST', { idempotencyKey: 'p2' });
      const body = await generated.json();
      expect(generated.status, JSON.stringify(body)).toBe(200);
      expect(body).toMatchObject({ state: 'explained', aiAvailable: true });
      expect(body.evidence).toHaveLength(2);
      expect(providerCalls).toBe(1);
      expect(keysSeen[0]).toContain('synthetic-student-secret');
      expect(keysSeen[0]).not.toContain('instructor');

      const revisit = await call();
      expect(await revisit.json()).toMatchObject({ state: 'explained' });
      expect(providerCalls).toBe(1);
    });
  },
);
