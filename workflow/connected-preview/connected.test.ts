import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { assessmentDatabase } from '../assessment-preview/database';
import { fixture } from '../assessment-preview/fixture';
import { CourseAuthority } from '../../src/server/courses/authority';
import { D1Assignments } from '../../src/server/instructor/assignments/repository';
import { AssignmentService } from '../../src/server/instructor/assignments/service';
import { AssessmentRepository } from '../../src/server/instructor/assessments/repository';
import { AssessmentWorkflow } from '../../src/server/instructor/assessments/workflow';
import { createApplication, allowLocalSamples } from '../../src/server/index';
import { returnDestination } from '../../src/server/auth/primitives';
import type { Environment } from '../../src/server/environment';
import { localSamples } from './samples';
import { syntheticAssessmentGateway } from './worker';
let db: Awaited<ReturnType<typeof assessmentDatabase>>,
  f: Awaited<ReturnType<typeof fixture>>,
  assignments: AssignmentService,
  repo: AssessmentRepository,
  base: typeof f.identity;
beforeEach(async () => {
  db = await assessmentDatabase();
  f = await fixture(db.db);
  await db.db.batch([
    db.db.prepare(
      'CREATE TABLE auth_accounts(id TEXT PRIMARY KEY,active INTEGER NOT NULL)',
    ),
    db.db.prepare(
      'CREATE TABLE auth_sessions(id TEXT PRIMARY KEY,user_id TEXT,revoked_at INTEGER,expires_at INTEGER,last_seen INTEGER)',
    ),
  ]);
  const sql = await readFile(
    'src/server/db/migrations/0007_courses.sql',
    'utf8',
  );
  await db.db.batch(
    sql
      .split(/^-- statement\s*$/m)
      .filter((s) => s.replace(/^--.*$/gm, '').trim())
      .map((s) => db.db.prepare(s)),
  );
  const now = Date.now();
  await db.db.batch([
    db.db.prepare("INSERT INTO auth_accounts VALUES('instructor_synthetic',1)"),
    db.db
      .prepare('INSERT INTO auth_sessions VALUES(?,?,NULL,?,?)')
      .bind(f.principal.sessionHandle, f.principal.userId, now + 600000, now),
    db.db
      .prepare('INSERT INTO courses(id,name) VALUES(?,?)')
      .bind(f.publication.courseId, 'Connected local course'),
    db.db
      .prepare(
        "INSERT INTO course_memberships(course_id,user_id,role) VALUES(?,?,'instructor')",
      )
      .bind(f.publication.courseId, f.principal.userId),
  ]);
  const authority = new CourseAuthority(db.db);
  base = {
    ...f.identity,
    requireCourse: authority.requireCourse.bind(authority),
    requireObject: authority.requireObject.bind(authority),
  };
  const shared = new D1Assignments(db.db, { enforceAuthority: true });
  assignments = new AssignmentService(shared, base);
  repo = new AssessmentRepository(db.db, {
    guardedBatch: (s, p, c) => shared.guarded(s, p, c),
  });
}, 20000);
afterEach(async () => {
  await db?.close();
});
function workflow(request = f.request(), samples = true) {
  return new AssessmentWorkflow(
    request,
    base,
    assignments,
    repo,
    samples ? localSamples(assignments, request) : undefined,
  );
}
// Keep structural inference at actual service return, without a new submission producer/storage.
async function created() {
  const r = f.request('/', 'POST');
  const port = localSamples(assignments, r);
  return workflow(r).service.create(r, {
    attemptId: (await port.list(f.principal, f.publication))[0].attemptId,
    requestKey: 'connected_create',
  });
}
describe('IAL-10 connected instructor composition', { timeout: 30000 }, () => {
  it('generates, recovers and adopts a synthetic gateway draft through the connected workflow', async () => {
    for (const migration of [
      '0013_ai_gateway.sql',
      '0014_assessment_ai_candidates.sql',
    ]) {
      const sql = await readFile(
        'src/server/db/migrations/' + migration,
        'utf8',
      );
      await db.db.batch(
        sql
          .split(/^-- statement\s*$/m)
          .filter((s) => s.replace(/^--.*$/gm, '').trim())
          .map((s) => db.db.prepare(s)),
      );
    }
    const v = await created();
    const path = '/api/instructor/assessments/' + v.head.id;
    const run = (request: Request) =>
      new AssessmentWorkflow(
        request,
        base,
        assignments,
        repo,
        localSamples(assignments, request),
        // Keep this successful-flow test away from real quota-window rollovers.
        // Deadline and expiry behavior is covered separately by the gateway tests.
        syntheticAssessmentGateway(db.db, () => 1_800_000_000_000),
      ).handle();
    let response = await run(
      f.request(path + '/generate-ai', 'POST', {
        expectedRevisionId: v.head.headRevisionId,
        requestKey: 'connected_ai',
        includePrivateReferences: true,
      }),
    );
    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200);
    const generated = (await response.json()) as {
      status: string;
      candidateId: string;
      payload: { reviewFlags: string[] };
    };
    expect(generated.status).toBe('succeeded');
    expect(generated.payload.reviewFlags[0]).toContain('Synthetic preview');
    await db.db
      .prepare(
        "UPDATE course_memberships SET active=0 WHERE course_id=? AND user_id=? AND role='instructor'",
      )
      .bind(f.publication.courseId, f.principal.userId)
      .run();
    response = await run(f.request(path + '/ai-candidate'));
    expect(response.status).toBe(403);
    response = await run(
      f.request(path + '/adopt-ai', 'POST', {
        expectedRevisionId: v.head.headRevisionId,
        candidateId: generated.candidateId,
      }),
    );
    expect(response.status).toBe(403);
    await db.db
      .prepare(
        "UPDATE course_memberships SET active=1 WHERE course_id=? AND user_id=? AND role='instructor'",
      )
      .bind(f.publication.courseId, f.principal.userId)
      .run();
    response = await run(f.request(path + '/ai-candidate'));
    expect(await response.json()).toMatchObject({
      status: 'succeeded',
      candidateId: generated.candidateId,
    });
    response = await run(
      f.request(path + '/adopt-ai', 'POST', {
        expectedRevisionId: v.head.headRevisionId,
        candidateId: generated.candidateId,
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      revision: { provenance: 'ai-assisted' },
      head: { approvedRevisionId: null, currentReleaseVersion: null },
    });
  });
  it('lists real authorized assignments/publications and opens a pinned sample in the same service', async () => {
    let r = await workflow(
      f.request('/api/instructor/review?courseId=' + f.publication.courseId),
    ).handle();
    expect(r.status).toBe(200);
    const list = (await r.json()) as { items: unknown[]; sampleMode: boolean };
    expect(list.items).toHaveLength(1);
    expect(list.sampleMode).toBe(true);
    r = await workflow(
      f.request(
        '/api/instructor/review/assignments/' + f.publication.assignmentId,
      ),
    ).handle();
    expect(r.status).toBe(200);
    const v = await created();
    expect(v.attempt.attemptId).toBe(
      'sample_' + f.publication.assignmentVersionId,
    );
    expect(v.attempt.submittedByUserId).toBe('sample_student');
    expect(v.attempt.answers[0].source).toBe(
      f.publication.questions[0].starterCode,
    );
    expect(
      await db.db.prepare('SELECT count(*) AS n FROM auth_accounts').first('n'),
    ).toBe(1);
    expect(
      await db.db
        .prepare('SELECT count(*) AS n FROM course_memberships')
        .first('n'),
    ).toBe(1);
  });
  it('reconstructs immutable sample evidence independently of instructor edits and producer instance', async () => {
    const a = localSamples(assignments, f.request()),
      b = localSamples(assignments, f.request()),
      key = 'sample_' + f.publication.assignmentVersionId;
    const first = await a.getAuthorized(f.principal, key);
    const second = await b.getAuthorized(f.principal, key);
    expect(second).toEqual(first);
    first.answers[0].source = 'tampered';
    expect(
      (await b.getAuthorized(f.principal, key)).answers[0].source,
    ).not.toBe('tampered');
    expect(first.submittedAt).toBe(f.publication.publishedAt);
  });
  it('returns honest unavailable states without a submission producer and refuses sample creation', async () => {
    const r = await workflow(
      f.request(
        '/api/instructor/review/publications/' +
          f.publication.assignmentVersionId,
      ),
      false,
    ).handle();
    const body = (await r.json()) as {
      available: boolean;
      attempts: unknown[];
    };
    expect(body.available).toBe(false);
    expect(body.attempts).toEqual([]);
    const post = f.request(
      '/api/instructor/review/publications/' +
        f.publication.assignmentVersionId +
        '/sample-assessment',
      'POST',
      { requestKey: 'no_producer' },
    );
    expect((await workflow(post, false).handle()).status).toBe(503);
    expect(
      await db.db
        .prepare('SELECT count(*) AS n FROM instructor_assessments')
        .first('n'),
    ).toBe(0);
  });
  it('denies unauthenticated, foreign course and missing-CSRF requests before content/writes', async () => {
    expect(
      (
        await workflow(
          new Request(
            'http://127.0.0.1:5177/api/instructor/review?courseId=' +
              f.publication.courseId,
          ),
        ).handle()
      ).status,
    ).toBe(401);
    await db.db
      .prepare("INSERT INTO courses(id,name) VALUES('foreign','Other course')")
      .run();
    expect(
      (
        await workflow(
          f.request('/api/instructor/review?courseId=foreign'),
        ).handle()
      ).status,
    ).toBe(403);
    const forged = new Request(
      'http://127.0.0.1:5177/api/instructor/review/publications/' +
        f.publication.assignmentVersionId +
        '/sample-assessment',
      {
        method: 'POST',
        headers: {
          Cookie: 'cw_assessment_fixture=synthetic_test_token',
          Origin: 'http://127.0.0.1:5177',
          'Content-Type': 'application/json',
          'X-Role': 'instructor',
        },
        body: JSON.stringify({ requestKey: 'forged' }),
      },
    );
    expect((await workflow(forged).handle()).status).toBe(403);
  });
  it('atomically refuses an assessment create after membership revocation immediately before persistence', async () => {
    const original = repo.create.bind(repo);
    vi.spyOn(repo, 'create').mockImplementationOnce(async (...args) => {
      await db.db.prepare('UPDATE course_memberships SET active=0').run();
      return original(...args);
    });
    await expect(created()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(
      await db.db
        .prepare('SELECT count(*) AS n FROM instructor_assessments')
        .first('n'),
    ).toBe(0);
  });
  it('atomically refuses save after session revocation immediately before persistence', async () => {
    const v = await created(),
      original = repo.commit.bind(repo);
    vi.spyOn(repo, 'commit').mockImplementationOnce(async (...args) => {
      await db.db.prepare('UPDATE auth_sessions SET revoked_at=1').run();
      return original(...args);
    });
    const feedback = structuredClone(v.revision.feedback);
    feedback.criteria[0].score = 2;
    await expect(
      workflow(f.request('/', 'PUT')).service.save(
        f.request('/', 'PUT'),
        v.head.id,
        { expectedRevisionId: v.head.headRevisionId, feedback },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect((await repo.read(v.head.id)).head.headRevisionId).toBe(
      v.head.headRevisionId,
    );
    expect(
      await db.db
        .prepare(
          "SELECT count(*) AS n FROM instructor_assessment_audit WHERE action='save'",
        )
        .first('n'),
    ).toBe(0);
  });
  it('returns instructor-only safe released content and tombstones without impersonating a student', async () => {
    let v = await created();
    const r = f.request('/', 'POST'),
      service = workflow(r).service;
    v = await service.save(f.request('/', 'PUT'), v.head.id, {
      expectedRevisionId: v.head.headRevisionId,
      feedback: {
        ...v.revision.feedback,
        criteria: v.revision.feedback.criteria.map((c) => ({
          ...c,
          score: 4,
          explanation: 'Local static inspection.',
        })),
      },
    });
    v = await service.approve(r, v.head.id, {
      expectedRevisionId: v.head.headRevisionId,
      expectedAvailabilityRevision: 1,
    });
    await service.release(r, v.head.id, {
      schemaVersion: 1,
      assessmentId: v.head.id,
      assessmentRevisionId: v.head.headRevisionId,
      expectedAvailabilityRevision: 1,
      idempotencyKey: 'connected_release',
    });
    let response = await workflow(
      f.request('/api/instructor/assessments/' + v.head.id + '/feedback/1'),
    ).handle();
    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toContain(
      'PRIVATE_REFERENCE',
    );
    await service.withdraw(r, v.head.id, {
      schemaVersion: 1,
      assessmentId: v.head.id,
      releaseVersion: 1,
      expectedAvailabilityRevision: 2,
      idempotencyKey: 'connected_withdraw',
      reason: 'Private local reason',
    });
    response = await workflow(
      f.request('/api/instructor/assessments/' + v.head.id + '/feedback/1'),
    ).handle();
    const data = (await response.json()) as { feedback: { state: string } };
    expect(data.feedback.state).toBe('withdrawn');
    expect(JSON.stringify(data)).not.toMatch(/criteria|Private local reason/);
  });
  it('ignores local sample injection in staging/production/non-loopback and keeps untrusted destinations denied', async () => {
    const env = {
      APP_ENV: 'production',
      APP_VERSION: 'test',
      DB: db.db,
      ASSETS: { fetch: async () => new Response('asset') },
      AUTH_ORIGIN: 'https://codewise.example',
      FIREBASE_PROJECT_ID: 'codewise-test',
      FIREBASE_API_KEY: 'synthetic-key',
      FIREBASE_SERVICE_ACCOUNT_EMAIL: 'server@example.invalid',
      FIREBASE_PRIVATE_KEY: 'synthetic-not-a-private-key',
    } as unknown as Environment;
    const factory = vi.fn(() => localSamples(assignments, f.request()));
    for (const environment of ['staging', 'production'] as const) {
      const r = await createApplication({ localSubmissions: factory }).fetch(
        new Request(
          'https://codewise.example/api/instructor/review?courseId=' +
            f.publication.courseId,
        ),
        { ...env, APP_ENV: environment },
      );
      expect(r.status).toBe(401);
    }
    expect(factory).not.toHaveBeenCalled();
    expect(
      allowLocalSamples(
        { ...env, APP_ENV: 'development' },
        new Request('https://codewise.example/'),
        'https://codewise.example',
      ),
    ).toBe(false);
    expect(
      allowLocalSamples(
        { ...env, APP_ENV: 'development' },
        f.request(),
        'http://127.0.0.1:5177',
      ),
    ).toBe(true);
    expect(returnDestination('/instructor/assessments/assessment_demo')).toBe(
      '/instructor/assessments/assessment_demo',
    );
    expect(() => returnDestination('//foreign.example')).toThrow();
  });
});
