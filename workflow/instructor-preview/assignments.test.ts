import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localDatabase } from './database';
import {
  syntheticIdentity,
  cookieName,
  previewOrigin,
  previewCourse,
  allowedTransport,
} from './identity';
import { D1Assignments } from '../../src/server/instructor/assignments/repository';
import { AssignmentService } from '../../src/server/instructor/assignments/service';
import {
  assignmentHandler,
  PREVIEW_API,
  readJson,
} from '../../src/server/instructor/assignments/http';
import {
  authoringSchema,
  emptyAuthoring,
  type Authoring,
} from '../../src/shared/instructor-contracts/authoring';
import { publicationSchema } from '../../src/shared/instructor-contracts/publication';
import payloads from './payloads.json';
import {
  createDraftSchema,
  saveDraftSchema,
  publishDraftSchema,
} from '../../src/shared/instructor-contracts/authoring';
import { verifyPublicationProducer } from './producer-checks';
export function validAuthoring(): Authoring {
  return {
    title: 'Synthetic loops',
    deadlineAt: '2027-01-01T00:00:00.000Z',
    questions: [
      {
        questionId: 'q_loop',
        rubricId: 'rub_loop',
        title: 'Count items',
        instructions: 'Write a Python function.',
        language: 'python',
        starterCode: 'def count(items):\n    pass\n',
        privateReference: 'PRIVATE_SYNTHETIC_REFERENCE\n',
        criteria: [
          {
            criterionId: 'criterion_count',
            comparisonKey: 'count',
            descriptor: 'Counts every item',
            minimumScore: 0,
            maximumScore: 10.25,
          },
        ],
      },
    ],
  };
}
const request = (method = 'GET', headers: Record<string, string> = {}) =>
  new Request(previewOrigin + PREVIEW_API + '/assignments', {
    method,
    headers: {
      cookie: `${cookieName}=test-secret`,
      origin: previewOrigin,
      ...headers,
    },
  });
describe('instructor authoring contracts', () => {
  it('validates the exact synthetic handoff commands and public producer payload', () => {
    createDraftSchema.parse(payloads.create);
    saveDraftSchema.parse(payloads.save);
    publishDraftSchema.parse(payloads.publish);
    verifyPublicationProducer(payloads.public, 'version_synthetic_1');
    expect(() =>
      verifyPublicationProducer(
        { ...payloads.public, privateReferences: payloads.privateReferences },
        'version_synthetic_1',
      ),
    ).toThrow();
    expect(() =>
      verifyPublicationProducer(payloads.public, 'other_version'),
    ).toThrow();
  });
  it('permits incomplete drafts but closes fields and preserves canonical source', () => {
    expect(authoringSchema.parse(emptyAuthoring()).questions).toEqual([]);
    const p = validAuthoring();
    p.questions[0].starterCode = 'a\r\nb\r';
    expect(authoringSchema.parse(p).questions[0].starterCode).toBe('a\nb\n');
    expect(() => authoringSchema.parse({ ...p, role: 'instructor' })).toThrow();
    p.questions[0].criteria[0].maximumScore = 0.001;
    expect(() => authoringSchema.parse(p)).toThrow();
    p.questions[0].starterCode = 'x'.repeat(32769);
    expect(() => authoringSchema.parse(p)).toThrow();
  });
  it('enforces 20/50 and aggregate request bounds', async () => {
    const p = validAuthoring();
    p.questions = Array.from({ length: 21 }, (_, i) => ({
      ...p.questions[0],
      questionId: `q${i}`,
      rubricId: `r${i}`,
    }));
    expect(() => authoringSchema.parse(p)).toThrow();
    await expect(
      readJson(
        new Request(previewOrigin, {
          method: 'POST',
          body: ' '.repeat(1048577),
        }),
      ),
    ).rejects.toThrow();
  });
});
describe('actual local D1 instructor publication', () => {
  let local: Awaited<ReturnType<typeof localDatabase>>,
    repo: D1Assignments,
    service: AssignmentService;
  let folder: string;
  beforeAll(async () => {
    folder = await mkdtemp(join(tmpdir(), 'cw-authoring-'));
    local = await localDatabase(folder);
    repo = new D1Assignments(local.db);
    service = new AssignmentService(
      repo,
      syntheticIdentity(repo, 'test-secret'),
      () => new Date('2026-11-06T00:00:00.000Z'),
    );
  }, 30000);
  afterAll(async () => {
    await local?.close();
    if (folder) await rm(folder, { recursive: true, force: true });
  });
  async function saved(payload = validAuthoring()) {
    const d = await service.create(request('POST'), {
      courseId: previewCourse,
      requestKey: crypto.randomUUID(),
    });
    return service.save(request('PUT'), d.assignmentId, {
      expectedRevision: d.revision,
      payload,
    });
  }
  it('rejects invalid saved publication content without any receipt', async () => {
    const cases = [
      (p: Authoring) => {
        p.title = '';
      },
      (p: Authoring) => {
        p.deadlineAt = null;
      },
      (p: Authoring) => {
        p.deadlineAt = '2026-11-06T00:00:00.000Z';
      },
      (p: Authoring) => {
        p.questions[0].criteria = [];
      },
      (p: Authoring) => {
        p.questions[0].criteria[0].maximumScore = 0;
      },
      (p: Authoring) => {
        const c = p.questions[0].criteria[0];
        p.questions[0].criteria.push({ ...c, criterionId: 'second' });
      },
    ];
    for (const change of cases) {
      const p = validAuthoring();
      change(p);
      const d = await saved(p);
      await expect(
        service.publish(request('POST'), d.assignmentId, {
          expectedRevision: d.revision,
          idempotencyKey: 'invalid',
        }),
      ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
      expect(await service.history(request(), d.assignmentId)).toEqual([]);
    }
  });
  it('enforces foreign keys in the actual migration', async () => {
    await expect(
      repo.db
        .prepare(
          "INSERT INTO instructor_rubric_versions(id,rubric_id,question_version_id) VALUES('orphan','rubric','missing')",
        )
        .run(),
    ).rejects.toThrow('FOREIGN KEY');
    const names = await repo.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all<{ name: string }>();
    expect(
      names.results.some((r) =>
        /^(users|courses|submissions|assessments)$/.test(r.name),
      ),
    ).toBe(false);
  });
  it('denies revoked replay before receipt lookup and allows only explicit public student projection', async () => {
    const d = await saved(),
      cmd = { expectedRevision: d.revision, idempotencyKey: 'revoked' };
    const published = await service.publish(
      request('POST'),
      d.assignmentId,
      cmd,
    );
    const identity = syntheticIdentity(repo, 'test-secret');
    identity.requireCourse = async () => {
      throw new (
        await import('../../src/shared/instructor-contracts/schema')
      ).BoundaryError('FORBIDDEN');
    };
    const receipt = vi.spyOn(repo, 'receipt');
    await expect(
      new AssignmentService(repo, identity).publish(
        request('POST'),
        d.assignmentId,
        cmd,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(receipt).not.toHaveBeenCalled();
    receipt.mockRestore();
    const student = new AssignmentService(
      repo,
      syntheticIdentity(repo, 'test-secret', { role: 'student' }),
    );
    expect(
      await student.publicVersion(request(), published.assignmentVersionId),
    ).toEqual(published.publication);
    await expect(
      student.privateVersion(request(), published.assignmentVersionId),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('scopes create retries, incomplete save, revision conflicts and persisted reopen', async () => {
    const cmd = { courseId: previewCourse, requestKey: 'create_retry' };
    const d = await service.create(request('POST'), cmd);
    expect((await service.create(request('POST'), cmd)).assignmentId).toBe(
      d.assignmentId,
    );
    const p = validAuthoring();
    p.title = '';
    const s = await service.save(request('PUT'), d.assignmentId, {
      expectedRevision: 1,
      payload: p,
    });
    await expect(
      service.save(request('PUT'), d.assignmentId, {
        expectedRevision: 1,
        payload: p,
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    await local.close();
    local = await localDatabase(folder);
    repo = new D1Assignments(local.db);
    service = new AssignmentService(
      repo,
      syntheticIdentity(repo, 'test-secret'),
      () => new Date('2026-11-06T00:00:00.000Z'),
    );
    expect(await service.load(request(), d.assignmentId)).toEqual(s);
    expect(
      (await service.list(request(), previewCourse)).items.some(
        (x) => x.assignmentId === d.assignmentId,
      ),
    ).toBe(true);
    await expect(
      service.publish(request('POST'), d.assignmentId, {
        expectedRevision: 2,
        idempotencyKey: 'invalid',
      }),
    ).rejects.toThrow();
  });
  it('publishes immutable identities, exact sources, public allowlist and fresh versions for reference/deadline edits', async () => {
    let d = await saved();
    const a = await service.publish(request('POST'), d.assignmentId, {
      expectedRevision: d.revision,
      idempotencyKey: 'first',
    });
    expect(publicationSchema.parse(a.publication)).toEqual(a.publication);
    expect(JSON.stringify(a)).not.toContain('PRIVATE_SYNTHETIC');
    expect(JSON.stringify(a)).not.toContain('privateReference');
    expect(
      (await service.privateVersion(request(), a.assignmentVersionId))
        .privateReferences[0].source,
    ).toBe(d.payload.questions[0].privateReference);
    const prepare = vi.spyOn(repo.db, 'prepare');
    await service.publicVersion(request(), a.assignmentVersionId);
    expect(
      prepare.mock.calls.every(([sql]) => !sql.includes('private_reference')),
    ).toBe(true);
    prepare.mockRestore();
    for (const kind of ['reference', 'deadline']) {
      const p = structuredClone(d.payload);
      if (kind === 'reference')
        p.questions[0].privateReference = 'changed private';
      else p.deadlineAt = '2027-02-01T00:00:00.000Z';
      d = await service.save(request('PUT'), d.assignmentId, {
        expectedRevision: d.revision,
        payload: p,
      });
      const b = await service.publish(request('POST'), d.assignmentId, {
        expectedRevision: d.revision,
        idempotencyKey: kind,
      });
      expect(b.assignmentVersionId).not.toBe(a.assignmentVersionId);
      expect(b.publication.questions[0].questionId).toBe(
        a.publication.questions[0].questionId,
      );
      expect(b.publication.questions[0].rubricId).toBe(
        a.publication.questions[0].rubricId,
      );
      expect(b.publication.questions[0].questionVersionId).not.toBe(
        a.publication.questions[0].questionVersionId,
      );
      expect(b.publication.questions[0].rubricVersionId).not.toBe(
        a.publication.questions[0].rubricVersionId,
      );
    }
    expect(
      await service.publicVersion(request(), a.assignmentVersionId),
    ).toEqual(a.publication);
    for (const [table, column] of [
      ['instructor_assignment_publications', 'title'],
      ['instructor_question_versions', 'title'],
      ['instructor_rubric_versions', 'rubric_id'],
      ['instructor_criterion_versions', 'descriptor'],
    ]) {
      await expect(
        repo.db.prepare(`UPDATE ${table} SET ${column}=${column}`).run(),
      ).rejects.toThrow('immutable_publication');
      await expect(
        repo.db.prepare(`DELETE FROM ${table}`).run(),
      ).rejects.toThrow('immutable_publication');
    }
  });
  it('deduplicates concurrent retries, rejects changed-key content and replays after deadline/current edits', async () => {
    const d = await saved(),
      cmd = { expectedRevision: d.revision, idempotencyKey: 'concurrent' };
    const [a, b] = await Promise.all([
      service.publish(request('POST'), d.assignmentId, cmd),
      service.publish(request('POST'), d.assignmentId, cmd),
    ]);
    expect(b).toEqual(a);
    await service.save(request('PUT'), d.assignmentId, {
      expectedRevision: d.revision,
      payload: validAuthoring(),
    });
    await expect(
      service.publish(request('POST'), d.assignmentId, {
        ...cmd,
        expectedRevision: d.revision + 1,
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    const later = new AssignmentService(
      repo,
      syntheticIdentity(repo, 'test-secret'),
      () => new Date('2028-01-01T00:00:00.000Z'),
    );
    expect(await later.publish(request('POST'), d.assignmentId, cmd)).toEqual(
      a,
    );
    expect(await service.history(request(), d.assignmentId)).toHaveLength(1);
  });
  it('aborts stale publication before child writes and rolls back receipt on injected child failure', async () => {
    const d = await saved(),
      original = repo.publish.bind(repo);
    const spy = vi
      .spyOn(repo, 'publish')
      .mockImplementationOnce(async (value) => {
        await repo.save(
          d.assignmentId,
          previewCourse,
          d.revision,
          validAuthoring(),
          '2026-11-06T00:01:00.000Z',
        );
        return original(value);
      });
    await expect(
      service.publish(request('POST'), d.assignmentId, {
        expectedRevision: d.revision,
        idempotencyKey: 'stale',
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    spy.mockRestore();
    expect(await service.history(request(), d.assignmentId)).toEqual([]);
    await repo.db
      .prepare(
        "CREATE TRIGGER test_child_failure BEFORE INSERT ON instructor_criterion_versions BEGIN SELECT RAISE(ABORT,'injected_failure'); END",
      )
      .run();
    try {
      await expect(
        service.publish(request('POST'), d.assignmentId, {
          expectedRevision: d.revision + 1,
          idempotencyKey: 'failure',
        }),
      ).rejects.toThrow('injected_failure');
    } finally {
      await repo.db.prepare('DROP TRIGGER test_child_failure').run();
    }
    expect(
      await repo.receipt(
        d.assignmentId,
        previewCourse,
        'instructor_synthetic',
        'failure',
      ),
    ).toBeNull();
    expect(await service.history(request(), d.assignmentId)).toEqual([]);
  });
  it('publishes maximum 20 × 50 short criteria in four snapshot statements', async () => {
    const p = validAuthoring();
    p.questions = Array.from({ length: 20 }, (_, i) => ({
      ...p.questions[0],
      questionId: `q${i}`,
      rubricId: `r${i}`,
      criteria: Array.from({ length: 50 }, (_, j) => ({
        ...p.questions[0].criteria[0],
        criterionId: `c${j}`,
        comparisonKey: `k${j}`,
      })),
    }));
    const d = await saved(p),
      batch = vi.spyOn(repo.db, 'batch');
    const result = await service.publish(request('POST'), d.assignmentId, {
      expectedRevision: d.revision,
      idempotencyKey: 'max',
    });
    expect(batch.mock.calls[0][0]).toHaveLength(4);
    batch.mockRestore();
    expect(result.publication.questions).toHaveLength(20);
    expect(result.publication.questions[19].criteria).toHaveLength(50);
  });
  it('fails closed for missing/forged sessions, wrong course, student writes and missing origin without private reads', async () => {
    const d = await saved(),
      draft = vi.spyOn(repo, 'draft');
    await expect(
      service.load(
        request('GET', { cookie: '', 'x-role': 'instructor' }),
        d.assignmentId,
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    const foreign = new AssignmentService(
      repo,
      syntheticIdentity(repo, 'test-secret', { courseId: 'foreign' }),
    );
    await expect(foreign.load(request(), d.assignmentId)).rejects.toMatchObject(
      { code: 'NOT_FOUND' },
    );
    const student = new AssignmentService(
      repo,
      syntheticIdentity(repo, 'test-secret', { role: 'student' }),
    );
    await expect(student.load(request(), d.assignmentId)).rejects.toMatchObject(
      { code: 'FORBIDDEN' },
    );
    await expect(
      service.save(request('PUT', { origin: '' }), d.assignmentId, {
        expectedRevision: d.revision,
        payload: validAuthoring(),
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(draft).not.toHaveBeenCalled();
    draft.mockRestore();
    const response = await assignmentHandler(
      new AssignmentService(repo, undefined),
    )(request());
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain('PRIVATE_SYNTHETIC');
  });
});
it('rejects foreign Host, Origin and identity forwarding in local transport', () => {
  expect(allowedTransport(new Headers({ host: '127.0.0.1:5175' }))).toBe(true);
  const cases: Record<string, string>[] = [
    { host: 'evil.example' },
    { host: '127.0.0.1:5175', origin: 'https://evil.example' },
    { host: '127.0.0.1:5175', 'x-role': 'instructor' },
    { host: '127.0.0.1:5175', 'x-forwarded-host': 'localhost' },
  ];
  for (const headers of cases)
    expect(allowedTransport(new Headers(headers))).toBe(false);
});
