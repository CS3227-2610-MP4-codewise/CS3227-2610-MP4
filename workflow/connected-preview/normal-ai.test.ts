import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { authDatabase } from '../auth/database';
import { SyntheticFirebase } from '../auth/synthetic-firebase';
import { ManagedStore } from '../../src/server/auth/managed-store';
import { FirebaseCredentials } from '../../src/server/auth/firebase';
import { csrfToken, hash, randomToken } from '../../src/server/auth/primitives';
import { createApplication } from '../../src/server/index';
import { evaluationGateway } from '../ai-quality-evaluation/gateway';
import { SoclaasTransportError } from '../../src/server/ai/transport';
import type { Environment } from '../../src/server/environment';
import { publish } from '../../src/server/student/test-fixture';
import { StudentWork } from '../../src/server/student/work';
import {
  draftSaveRequestSchema,
  submitRequestSchema,
} from '../../src/shared/student-work';
import type { TrustedPrincipal } from '../../src/server/instructor/ports/contracts';

let database: Awaited<ReturnType<typeof authDatabase>>;
const provider = new SyntheticFirebase();
const origin = 'https://app.example.test';
const uid = 'synthetic-instructor';
const email = 'instructor@u.nus.edu';
let token: string, userId: string, sessionId: string;
const config = {
  model: 'synthetic-model',
  promptVersion: 'synthetic-v1',
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
let env: Environment;
let assessmentId: string, revisionId: string;
let providerCalls = 0;
const realFetch = globalThis.fetch;

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
  userId = session.user_id;
  sessionId = session.id;
  await database.db.batch(
    ['instructor', 'student'].map((role) =>
      database.db
        .prepare(
          'INSERT INTO course_memberships(course_id,user_id,role) VALUES(?,?,?)',
        )
        .bind('course-a', userId, role),
    ),
  );
  await publish(database.db, {
    course: 'course-a',
    assignment: 'assignment',
    version: 'publication',
    number: 1,
    deadline: new Date(now + 86400000).toISOString(),
    count: 1,
  });
  const principal = { userId, sessionHandle: sessionId } as TrustedPrincipal;
  const work = new StudentWork(database.db);
  await work.save(
    principal,
    'qv-publication-0',
    draftSaveRequestSchema.parse({
      schemaVersion: 1,
      baseRevision: 0,
      source: 'print(1)\n',
    }),
  );
  const draft = await work.work(principal, 'publication');
  const submitted = await work.submit(
    principal,
    'publication',
    submitRequestSchema.parse({
      schemaVersion: 1,
      idempotencyKey: 'app-submit',
      answers: draft.questions.map((q) => ({
        questionVersionId: q.questionVersionId,
        draftRevision: q.revision,
        sourceHash: q.sourceHash,
      })),
    }),
  );
  vi.spyOn(FirebaseCredentials.prototype, 'current').mockImplementation(
    async (id) => provider.current(id),
  );
  vi.stubGlobal(
    'fetch',
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://soclaas-api.comp.nus.edu.sg/v1/chat/completions') {
        providerCalls++;
        const body = JSON.parse(String(init?.body)) as {
          messages: Array<{ content: string }>;
        };
        const context = JSON.parse(body.messages[1].content) as {
          questions: Array<{
            questionVersionId: string;
            rubricVersionId: string;
            criteria: Array<{
              criterionId: string;
              comparisonKey: string;
              minimumScore: number;
              maximumScore: number;
            }>;
          }>;
        };
        const payload = {
          kind: 'assessment-draft',
          codeExecuted: false,
          criteria: context.questions.flatMap((q) =>
            q.criteria.map((c) => ({
              questionVersionId: q.questionVersionId,
              rubricVersionId: q.rubricVersionId,
              criterionId: c.criterionId,
              comparisonKey: c.comparisonKey,
              minimumScore: c.minimumScore,
              maximumScore: c.maximumScore,
              score: c.minimumScore,
              explanation: 'Synthetic review.',
            })),
          ),
          annotations: [],
          reviewFlags: ['Synthetic only'],
        };
        return Response.json({
          choices: [
            {
              finish_reason: 'stop',
              message: { content: JSON.stringify(payload) },
            },
          ],
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
    SOCLAAS_INSTRUCTOR_API_KEY: 'synthetic-secret',
    SOCLAAS_INSTRUCTOR_CONFIG: JSON.stringify(config),
  } as unknown as Environment;
  const created = await call('/api/instructor/assessments', 'POST', {
    attemptId: submitted.attemptId,
    requestKey: 'app-create',
  });
  expect(created.status).toBe(201);
  const view = (await created.json()) as {
    head: { id: string; headRevisionId: string };
  };
  assessmentId = view.head.id;
  revisionId = view.head.headRevisionId;
}, 120000);
afterAll(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  await database?.close();
});
async function call(path: string, method = 'GET', body?: unknown) {
  return createApplication().fetch(
    new Request(origin + path, {
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
  'normal instructor AI composition with offline providers',
  { timeout: 120000 },
  () => {
    it('uses the loopback evaluation gateway without retrying provider 429', async () => {
      const localOrigin = 'http://localhost:8787';
      const localEnv = {
        ...env,
        APP_ENV: 'development',
        AUTH_ORIGIN: localOrigin,
        SOCLAAS_INSTRUCTOR_ENABLED: 'true',
      };
      const transport = vi.fn(async () => {
        throw new SoclaasTransportError('rate_limited', 0);
      });
      const app = createApplication({
        localAssessmentGateway: evaluationGateway(localEnv, transport),
      });
      const response = await app.fetch(
        new Request(
          localOrigin +
            '/api/instructor/assessments/' +
            assessmentId +
            '/generate-ai',
          {
            method: 'POST',
            headers: {
              cookie: 'codewise-dev-session=' + token,
              'x-csrf-token': await csrfToken(token),
              origin: localOrigin,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              expectedRevisionId: revisionId,
              requestKey: 'evaluation-no-retry',
              includePrivateReferences: false,
            }),
          },
        ),
        localEnv,
      );
      expect(
        transport,
        JSON.stringify(await response.clone().json()),
      ).toHaveBeenCalledTimes(1);
      expect(transport).toHaveBeenCalledTimes(1);
    });
    it('stays disabled by default, then uses the real gateway with validated server configuration', async () => {
      const path =
        '/api/instructor/assessments/' + assessmentId + '/generate-ai';
      const request = {
        expectedRevisionId: revisionId,
        requestKey: 'app-ai',
        includePrivateReferences: false,
      };
      expect((await call(path, 'POST', request)).status).toBe(503);
      expect(providerCalls).toBe(0);
      env = { ...env, SOCLAAS_INSTRUCTOR_ENABLED: 'true' };
      const response = await call(path, 'POST', request);
      expect(
        response.status,
        JSON.stringify(await response.clone().json()),
      ).toBe(200);
      const first = await response.json();
      expect(first).toMatchObject({
        status: 'succeeded',
        payload: { kind: 'assessment-draft' },
      });
      expect(providerCalls).toBe(1);
      const replay = await call(path, 'POST', request);
      expect(replay.status).toBe(200);
      expect(await replay.json()).toEqual(first);
      expect(providerCalls).toBe(1);
    });
  },
);
