import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { assessmentDatabase } from './database';
import { fixture } from './fixture';
import {
  assessmentHandler,
  ASSESSMENT_API,
} from '../../src/server/instructor/assessments/http';
import { verifyAssessmentProducer } from './conformance';
import { publicFeedbackFixtures } from './public-fixtures';
import { assertCurrentRelease } from '../../src/shared/instructor-contracts/release';
it('IAL-07/09 safe fixtures and producer conformance against actual local D1 transitions', async () => {
  const db = await assessmentDatabase();
  try {
    const f = await fixture(db.db);
    let v = await f.service().create(f.request('/', 'POST'), {
      attemptId: f.attempt.attemptId,
      requestKey: 'conformance_create',
    });
    const approve = async () => {
      v = await f.service().approve(f.request('/', 'POST'), v.head.id, {
        expectedRevisionId: v.head.headRevisionId,
        expectedAvailabilityRevision: v.head.availabilityRevision,
      });
      return {
        assessmentId: v.head.id,
        assessmentRevisionId: v.head.headRevisionId,
      };
    };
    const result = await verifyAssessmentProducer({
      prepareReviewed: async () => {
        v = await f.service().save(f.request('/', 'PUT'), v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          feedback: {
            ...v.revision.feedback,
            criteria: v.revision.feedback.criteria.map((c) => ({
              ...c,
              score: 4,
              explanation: 'Synthetic source inspection.',
            })),
          },
        });
        return approve();
      },
      correctReviewed: async () => {
        v = await f.service().load(f.request(), v.head.id);
        v = await f.service().correct(f.request('/', 'POST'), v.head.id, {
          expectedRevisionId: v.head.headRevisionId,
          sourceRevisionId: v.head.headRevisionId,
        });
        return approve();
      },
      release: (cmd) =>
        f.service().release(f.request('/', 'POST'), v.head.id, cmd),
      withdraw: (cmd) =>
        f.service().withdraw(f.request('/', 'POST'), v.head.id, cmd),
      read: async (version) =>
        (
          await f.repository.publicState(
            v.head.id,
            version,
            new Date().toISOString(),
          )
        ).feedback,
      currentness: () =>
        f.repository.currentness(v.head.id, new Date().toISOString()),
    });
    expect(result.final.withdrawnReleaseVersions).toEqual([1, 2]);
    const examples = publicFeedbackFixtures();
    expect(
      assertCurrentRelease(
        examples.correction,
        examples.currentAfterHistoricalWithdrawal,
      ).releaseVersion,
    ).toBe(2);
    expect(JSON.stringify(examples)).not.toMatch(
      /privateReference|privateReason|actorId/,
    );
  } finally {
    await db.close();
  }
}, 30000);
it('IAL-01/09 guarded HTTP denies missing session/origin, malformed/oversized payload and has no production registration', async () => {
  const db = await assessmentDatabase();
  try {
    const f = await fixture(db.db),
      handler = assessmentHandler(f.service());
    const mixed = new Request('http://127.0.0.1:5177/', {
      headers: {
        Cookie:
          'other_local_cookie=unrelated; cw_assessment_fixture=synthetic_test_token',
      },
    });
    expect((await f.identity.requireSession(mixed)).userId).toBe(
      'instructor_synthetic',
    );
    const duplicate = new Request('http://127.0.0.1:5177/', {
      headers: {
        Cookie:
          'cw_assessment_fixture=synthetic_test_token; cw_assessment_fixture=synthetic_test_token',
      },
    });
    await expect(f.identity.requireSession(duplicate)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    let r = await handler(
      new Request('http://127.0.0.1:5177' + ASSESSMENT_API + '/assessments', {
        method: 'POST',
        body: '{}',
      }),
    );
    expect(r.status).toBe(401);
    r = await handler(
      f.request(ASSESSMENT_API + '/assessments', 'POST', {
        attemptId: f.attempt.attemptId,
        requestKey: 'http_create',
      }),
    );
    expect(r.status).toBe(201);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const v = (await r.json()) as { head: { id: string } };
    const forged = new Request(
      'http://127.0.0.1:5177' + ASSESSMENT_API + '/assessments/' + v.head.id,
      {
        method: 'PUT',
        headers: {
          Cookie: 'cw_assessment_fixture=synthetic_test_token',
          Origin: 'https://foreign.example',
        },
        body: '{}',
      },
    );
    expect((await handler(forged)).status).toBe(403);
    expect(
      (
        await handler(
          f.request(ASSESSMENT_API + '/assessments/' + v.head.id, 'PUT', {
            role: 'instructor',
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handler(
          f.request(ASSESSMENT_API + '/assessments', 'POST', {
            attemptId: f.attempt.attemptId,
            requestKey: 'x'.repeat(1048576),
          }),
        )
      ).status,
    ).toBe(400);
    expect((await handler(f.request('/api/assessments'))).status).toBe(404);
    expect(await readFile('src/server/index.ts', 'utf8')).not.toContain(
      'assessmentHandler',
    );
  } finally {
    await db.close();
  }
}, 20000);
