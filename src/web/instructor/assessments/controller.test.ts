import { describe, it, expect, vi } from 'vitest';
import { AssessmentController } from './controller';
import type { AssessmentClient, Workspace } from './client';
import { examples } from '../../../../workflow/fixtures/instructor-contracts/graph';
import { publicationSchema } from '../../../shared/instructor-contracts/publication';
import { attemptSchema } from '../../../shared/instructor-contracts/submission';
import { BoundaryError } from '../../../shared/instructor-contracts/schema';
function view(revision = 'revision_1'): Workspace {
  const p = publicationSchema.parse(examples[2]),
    a = attemptSchema.parse(examples[3]);
  return {
    head: {
      id: 'assessment_demo',
      courseId: a.courseId,
      attemptId: a.attemptId,
      publicationId: p.assignmentVersionId,
      evidence: 'a'.repeat(64) + ':' + 'b'.repeat(64),
      headRevisionId: revision,
      approvedRevisionId: null,
      availabilityRevision: 1,
      currentReleaseVersion: null,
      maximumReleaseVersion: 0,
    },
    revision: {
      id: revision,
      assessmentId: 'assessment_demo',
      parentRevisionId: null,
      actorId: 'instructor_demo',
      createdAt: '2026-11-07T00:00:00.000Z',
      provenance: 'manual',
      feedback: {
        criteria: [
          {
            questionVersionId: 'question_v1',
            rubricVersionId: 'rubric_v1',
            criterionId: 'criterion_demo',
            score: null,
            explanation: '',
          },
        ],
        annotations: [],
      },
    },
    history: [],
    historyCursor: null,
    releases: [],
    publication: p,
    attempt: a,
  };
}
function deferred<T>() {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function setup() {
  const api: AssessmentClient = {
    load: vi.fn(async () => view()),
    save: vi.fn(async () => view('revision_2')),
    action: vi.fn(async () => {}),
  };
  return { api, c: new AssessmentController(api) };
}
describe('IAL-08 workbook acknowledgements and version context', () => {
  it('keeps newer edits dirty after an older save acknowledgement', async () => {
    const { api, c } = setup();
    await c.open('assessment_demo');
    const old = structuredClone(c.state.feedback!);
    old.criteria[0].explanation = 'older';
    c.edit(old);
    const pending = deferred<Workspace>();
    vi.mocked(api.save).mockReturnValueOnce(pending.promise);
    const save = c.save();
    const newer = structuredClone(old);
    newer.criteria[0].explanation = 'newer';
    c.edit(newer);
    await c.save();
    expect(api.save).toHaveBeenCalledTimes(1);
    pending.resolve(view('revision_2'));
    await save;
    expect(c.state.feedback!.criteria[0].explanation).toBe('newer');
    expect(c.state.dirty).toBe(true);
    expect(c.state.view!.head.headRevisionId).toBe('revision_2');
  });
  it('clears previous private context while loading and after access denial', async () => {
    const { api, c } = setup();
    await c.open('assessment_demo');
    const next = deferred<Workspace>();
    vi.mocked(api.load).mockReturnValueOnce(next.promise);
    const load = c.open('foreign_assessment');
    expect(c.state.view).toBeNull();
    next.reject(new BoundaryError('FORBIDDEN'));
    await load;
    expect(c.state.view).toBeNull();
    expect(c.state.feedback).toBeNull();
    expect(c.state.message).toContain('Access');
  });
  it('does not let a late load replace a newly selected revision', async () => {
    const { api, c } = setup(),
      old = deferred<Workspace>();
    vi.mocked(api.load).mockReturnValueOnce(old.promise);
    const first = c.open('assessment_demo');
    await c.open('assessment_demo', 'historical');
    old.resolve(view('old'));
    await first;
    expect(c.state.selectedRevision).toBe('historical');
    expect(c.state.view!.revision.id).toBe('revision_1');
  });
  it('preserves local feedback after a conflicting save', async () => {
    const { api, c } = setup();
    await c.open('assessment_demo');
    const local = structuredClone(c.state.feedback!);
    local.criteria[0].explanation = 'unsaved';
    c.edit(local);
    vi.mocked(api.save).mockRejectedValueOnce(
      new BoundaryError('REVISION_CONFLICT'),
    );
    await c.save();
    expect(c.state.feedback).toEqual(local);
    expect(c.state.dirty).toBe(true);
    expect(c.state.message).toContain('compare');
    expect(c.state.busy).toBeNull();
  });
  it('keeps historical views read only but allows an explicit correction', async () => {
    const { api, c } = setup();
    await c.open('assessment_demo', 'historical');
    c.edit(view().revision.feedback);
    await c.save();
    await c.action('approve');
    await c.action('release');
    expect(api.save).not.toHaveBeenCalled();
    expect(api.action).not.toHaveBeenCalled();
    await c.action('correct');
    expect(api.action).toHaveBeenCalledTimes(1);
    expect(c.state.selectedRevision).toBeNull();
  });
  it('reuses the same idempotency key after an ambiguous release response', async () => {
    const { api, c } = setup();
    await c.open('assessment_demo');
    vi.mocked(api.action).mockRejectedValueOnce(
      new BoundaryError('UPSTREAM_UNAVAILABLE'),
    );
    await c.action('release');
    await c.action('release');
    const calls = vi.mocked(api.action).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][2]).toEqual(calls[1][2]);
  });
  it('blocks mutations while unsaved or pending and ignores their late acknowledgement after navigation', async () => {
    const { api, c } = setup();
    await c.open('assessment_demo');
    const pending = deferred<void>();
    vi.mocked(api.action).mockReturnValueOnce(pending.promise);
    const action = c.action('approve');
    await c.action('release');
    expect(api.action).toHaveBeenCalledTimes(1);
    await c.open('assessment_demo', 'history');
    pending.resolve();
    await action;
    expect(c.state.selectedRevision).toBe('history');
    c.dispose();
  });
});
