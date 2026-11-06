import { describe, expect, it, vi } from 'vitest';
import {
  AssignmentController,
  singaporeInput,
  singaporeUtc,
} from './controller';
import {
  emptyAuthoring,
  type AssignmentClient,
  type AssignmentDraft,
  type PublicationResult,
} from '../../../shared/instructor-contracts/authoring';
function draft(id = 'a', revision = 1): AssignmentDraft {
  return {
    schemaVersion: 1,
    assignmentId: id,
    courseId: 'course',
    revision,
    createdAt: '2026-11-06T00:00:00.000Z',
    updatedAt: '2026-11-06T00:00:00.000Z',
    payload: emptyAuthoring(),
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (e: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function fixture() {
  const client: AssignmentClient = {
    list: vi.fn(),
    create: vi.fn(async () => draft()),
    load: vi.fn(async (id) => draft(id)),
    save: vi.fn(async (id, cmd) => ({
      ...draft(id, cmd.expectedRevision + 1),
      payload: cmd.payload,
    })),
    publish: vi.fn(),
    history: vi.fn(async () => []),
    snapshot: vi.fn(),
  };
  return { client, c: new AssignmentController(client) };
}
describe('revision-aware assignment controller', () => {
  it('points to the incomplete question and criterion, then permits review after correction', async () => {
    const { c, client } = fixture();
    await c.open('a');
    const question = {
      questionId: 'q1',
      rubricId: 'r1',
      title: 'First',
      instructions: 'Write a function.',
      language: 'python' as const,
      starterCode: '',
      privateReference: '',
      criteria: [
        {
          criterionId: 'c1',
          comparisonKey: 'Correctness',
          descriptor: 'Meets the task',
          minimumScore: 0,
          maximumScore: 10 as number | null,
        },
      ],
    };
    const payload = {
      title: 'Loops',
      deadlineAt: '2099-01-01T00:00:00.000Z',
      questions: [
        question,
        {
          ...question,
          questionId: 'q2',
          rubricId: 'r2',
          title: 'Second',
          criteria: [{ ...question.criteria[0], maximumScore: null }],
        },
      ],
    };
    c.edit(payload);
    await c.save();
    c.review();
    expect(c.state.review).toBe(false);
    expect(c.state.message).toContain('question 2, criterion 1');
    expect(c.state.message).not.toContain('$.questions');
    expect(client.publish).not.toHaveBeenCalled();
    payload.questions[1].criteria[0].maximumScore = 10;
    c.edit(payload);
    await c.save();
    c.review();
    expect(c.state.review).toBe(true);
    expect(client.publish).not.toHaveBeenCalled();
  });
  it('hides denied content and restores access without overwriting retained edits or silently rebasing', async () => {
    const { c, client } = fixture();
    await c.open('a');
    c.edit({ ...emptyAuthoring(), title: 'Retain me' });
    vi.mocked(client.save).mockRejectedValueOnce(
      new Error('Your session is unavailable'),
    );
    await c.save();
    expect(c.state.denied).toBe(true);
    expect(c.state.dirty).toBe(true);
    vi.mocked(client.load).mockRejectedValueOnce(new Error('Failed to fetch'));
    await c.recoverAccess();
    expect(c.state.denied).toBe(true);
    vi.mocked(client.load).mockResolvedValueOnce({
      ...draft('a', 9),
      payload: { ...emptyAuthoring(), title: 'Someone else' },
    });
    await c.recoverAccess();
    expect(c.state.denied).toBe(false);
    expect(c.state.payload?.title).toBe('Retain me');
    expect(c.state.draft?.revision).toBe(1);
    expect(c.state.dirty).toBe(true);
  });
  it('retains newer edits on late save acknowledgment and advances only saved base revision', async () => {
    const { c, client } = fixture();
    await c.open('a');
    c.edit({ ...emptyAuthoring(), title: 'first' });
    const pending = deferred<AssignmentDraft>();
    vi.mocked(client.save).mockReturnValueOnce(pending.promise);
    const saving = c.save();
    c.edit({ ...emptyAuthoring(), title: 'newer' });
    await c.save();
    expect(client.save).toHaveBeenCalledTimes(1);
    pending.resolve({
      ...draft('a', 2),
      payload: { ...emptyAuthoring(), title: 'first' },
    });
    await saving;
    expect(c.state.payload?.title).toBe('newer');
    expect(c.state.dirty).toBe(true);
    expect(c.state.draft?.revision).toBe(2);
    expect(c.state.message).toContain('newer changes remain unsaved');
    await c.save();
    expect(c.state.dirty).toBe(false);
    expect(c.state.draft?.revision).toBe(3);
  });
  it('blocks context switching during save and edits during opening/creating', async () => {
    const { c, client } = fixture();
    await c.open('a');
    const opening = deferred<AssignmentDraft>();
    vi.mocked(client.load).mockReturnValueOnce(opening.promise);
    const task = c.open('b');
    c.edit({ ...emptyAuthoring(), title: 'must not edit hidden old context' });
    expect(c.state.payload?.title).toBe('');
    opening.resolve(draft('b'));
    await task;
    expect(c.state.draft?.assignmentId).toBe('b');
    const creating = deferred<AssignmentDraft>();
    vi.mocked(client.create).mockReturnValueOnce(creating.promise);
    const create = c.create();
    c.edit({ ...emptyAuthoring(), title: 'ignored while changing context' });
    creating.resolve(draft('c'));
    await create;
    expect(c.state.payload?.title).toBe('');
  });
  it('retains all questions during navigation and conflict recovery without publishing', async () => {
    const { c, client } = fixture();
    await c.open('a');
    const q = {
      questionId: 'q',
      rubricId: 'r',
      title: 'Q',
      instructions: 'I',
      language: 'python' as const,
      starterCode: 'first\n',
      privateReference: 'secret',
      criteria: [],
    };
    c.edit({
      ...emptyAuthoring(),
      questions: [
        q,
        { ...q, questionId: 'q2', rubricId: 'r2', starterCode: 'second' },
      ],
    });
    c.question(1);
    c.question(0);
    expect(c.state.payload?.questions.map((q) => q.starterCode)).toEqual([
      'first\n',
      'second',
    ]);
    vi.mocked(client.save).mockRejectedValueOnce(new Error('Save conflict'));
    await c.save();
    expect(c.state.payload?.questions).toHaveLength(2);
    expect(c.state.dirty).toBe(true);
    c.review();
    await c.publish();
    expect(client.publish).not.toHaveBeenCalled();
  });
  it('retains create retry key after ambiguous failure', async () => {
    const { c, client } = fixture();
    vi.mocked(client.create).mockRejectedValueOnce(
      new Error('network unavailable'),
    );
    await c.create();
    await c.create();
    expect(vi.mocked(client.create).mock.calls[0][0]).toBe(
      vi.mocked(client.create).mock.calls[1][0],
    );
  });
  it('requires saved valid review and explicit confirmation, retaining a publication key across failure', async () => {
    const { c, client } = fixture();
    await c.open('a');
    const p = {
      title: 'Loops',
      deadlineAt: '2099-01-01T00:00:00.000Z',
      questions: [
        {
          questionId: 'q',
          rubricId: 'r',
          title: 'Q',
          instructions: 'I',
          language: 'python' as const,
          starterCode: '',
          privateReference: 'private',
          criteria: [
            {
              criterionId: 'c',
              comparisonKey: 'count',
              descriptor: 'count',
              minimumScore: 0,
              maximumScore: 10,
            },
          ],
        },
      ],
    };
    c.edit(p);
    c.review();
    expect(c.state.review).toBe(false);
    await c.save();
    c.review();
    expect(c.state.review).toBe(true);
    expect(client.publish).not.toHaveBeenCalled();
    vi.mocked(client.publish).mockRejectedValueOnce(
      new Error('network unavailable'),
    );
    await c.publish();
    expect(c.state.review).toBe(true);
    vi.mocked(client.publish).mockResolvedValueOnce({
      publicationNumber: 1,
      sourceDraftRevision: 2,
    } as PublicationResult);
    vi.mocked(client.history).mockRejectedValueOnce(
      new Error('history unavailable'),
    );
    await c.publish();
    expect(vi.mocked(client.publish).mock.calls[0][1]).toEqual(
      vi.mocked(client.publish).mock.calls[1][1],
    );
    expect(c.state.message).toContain('Published version 1');
    expect(c.state.message).toContain('History could not refresh');
    expect(c.state.error).toBe(false);
    expect(c.state.review).toBe(false);
    await c.retryHistory();
  });
  it('converts explicitly named Singapore deadlines independently of browser timezone', () => {
    expect(singaporeUtc('2027-01-01T08:30')).toBe('2027-01-01T00:30:00.000Z');
    expect(singaporeUtc('2027-01-01T08:30:00')).toBe(
      '2027-01-01T00:30:00.000Z',
    );
    expect(singaporeInput('2027-01-01T00:30:00.000Z')).toBe('2027-01-01T08:30');
    expect(singaporeUtc('')).toBeNull();
  });
});
