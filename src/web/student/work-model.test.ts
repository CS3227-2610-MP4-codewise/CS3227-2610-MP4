// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseStudentRoute } from './model';
import { saveLabel } from './Workbook';
import {
  ApiError,
  BackupStore,
  DraftController,
  backoffDelay,
  diffLines,
  workApi,
  type SaveAck,
} from './work-model';

/** SW-02–SW-04, UI-08: save state machine, backup and diff, with synthetic data and fake timers. */
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const row = (id: string, revision = 0, source = 'start\n') => ({
  questionVersionId: id,
  revision,
  source,
  sourceHash: sha(source),
});
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
const ack = (revision: number, source: string): SaveAck => ({
  revision,
  sourceHash: sha(source),
  savedAt: '2026-11-10T00:00:00.000Z',
});
const key = (q: string) => `cw:draft:u1:pub1:${q}`;

function setup(
  save: (q: string, base: number, source: string) => Promise<SaveAck>,
  rows = [row('q1'), row('q2')],
  hooks: { onSession?: () => void } = {},
) {
  const ctl = new DraftController({
    save,
    backup: new BackupStore('u1', 'pub1'),
    ...hooks,
  });
  ctl.load(rows);
  return ctl;
}
const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  window.sessionStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('save timing (SW-03/04, task 5.1)', () => {
  it('saves 1.5 s after typing stops, not before', async () => {
    const save = vi.fn(async (_q: string, _b: number, s: string) => ack(1, s));
    const ctl = setup(save);
    ctl.edit('q1', 'a');
    expect(ctl.get('q1')!.status).toBe('unsaved');
    await tick(1499);
    expect(save).not.toHaveBeenCalled();
    await tick(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('q1', 0, 'a');
    expect(ctl.get('q1')!.status).toBe('saved');
  });

  it('saves at least every 10 s while typing continues', async () => {
    const save = vi.fn(async (_q: string, b: number, s: string) =>
      ack(b + 1, s),
    );
    const ctl = setup(save);
    let typed = '';
    for (let t = 0; t < 9; t++) {
      typed += 'x';
      ctl.edit('q1', typed); // a new edit every second resets the 1.5 s debounce
      await tick(1000);
    }
    expect(save).not.toHaveBeenCalled(); // 9 s in
    typed += 'x';
    ctl.edit('q1', typed);
    await tick(1000); // 10 s since the first unsaved edit
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][2]).toBe(typed);
  });

  it('saves on blur/navigation/submit paths through flush and flushAll', async () => {
    const save = vi.fn(async (_q: string, b: number, s: string) =>
      ack(b + 1, s),
    );
    const ctl = setup(save);
    ctl.edit('q1', 'a');
    await ctl.flush('q1'); // blur or Previous/Next, well before 1.5 s
    expect(save).toHaveBeenCalledTimes(1);
    ctl.edit('q2', 'b');
    await ctl.flushAll();
    expect(save).toHaveBeenCalledTimes(2);
    // An untouched question is saved (revision 0 -> 1) only when forced, as submit does.
    const untouched = setup(save, [row('q3')]);
    await untouched.flushAll();
    expect(save).toHaveBeenCalledTimes(2);
    await untouched.flushAll(true);
    expect(save).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenLastCalledWith('q3', 0, 'start\n');
  });

  it('keeps one save in flight and queues edits made during it', async () => {
    const first = deferred<SaveAck>();
    const second = deferred<SaveAck>();
    const save = vi
      .fn<(q: string, b: number, s: string) => Promise<SaveAck>>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const ctl = setup(save);
    ctl.edit('q1', 'a');
    await tick(1500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(ctl.get('q1')!.status).toBe('saving');
    ctl.edit('q1', 'ab');
    await tick(1500);
    ctl.edit('q1', 'abc');
    await tick(20000);
    expect(save).toHaveBeenCalledTimes(1); // still only one in flight
    first.resolve(ack(1, 'a'));
    await tick(0);
    // The queued latest text is sent right after the response, on the new base revision.
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith('q1', 1, 'abc');
    expect(ctl.get('q1')!.status).toBe('saving');
    second.resolve(ack(2, 'abc'));
    await tick(0);
    expect(ctl.get('q1')!.status).toBe('saved');
    expect(ctl.get('q1')!.baseRevision).toBe(2);
  });
});

describe('truthful state and stale acknowledgements (SW-04)', () => {
  it('does not label newer typing saved when an older save is acknowledged', async () => {
    const d = deferred<SaveAck>();
    const save = vi.fn().mockReturnValue(d.promise);
    const ctl = setup(save);
    ctl.edit('q1', 'one');
    await tick(1500);
    ctl.edit('q1', 'one two'); // typed after the request was sent
    expect(ctl.get('q1')!.status).toBe('unsaved');
    d.resolve(ack(1, 'one'));
    await tick(0);
    const q1 = ctl.get('q1')!;
    expect(q1.status).toBe('unsaved'); // never "saved" for text that was not acknowledged
    expect(q1.baseRevision).toBe(1);
    expect(saveLabel(q1)).toBe('Unsaved changes');
    expect(window.sessionStorage.getItem(key('q1'))).toContain('one two');
  });

  it('applies an acknowledgement only to its own question', async () => {
    const d = deferred<SaveAck>();
    const save = vi.fn().mockReturnValue(d.promise);
    const ctl = setup(save);
    ctl.edit('q1', 'first');
    await tick(1500);
    ctl.edit('q2', 'second'); // the student moved to question 2 and typed
    d.resolve(ack(1, 'first'));
    await tick(0);
    expect(ctl.get('q1')!.status).toBe('saved');
    expect(ctl.get('q2')!.source).toBe('second');
    expect(ctl.get('q2')!.status).toBe('unsaved');
    expect(ctl.get('q2')!.baseRevision).toBe(0);
  });

  it('ignores an acknowledgement that arrives after the session was lost', async () => {
    const d = deferred<SaveAck>();
    const ctl = setup(vi.fn().mockReturnValue(d.promise));
    ctl.edit('q1', 'a');
    await tick(1500);
    ctl.sessionLost();
    d.resolve(ack(1, 'a'));
    await tick(0);
    expect(ctl.get('q1')!.status).toBe('failed');
    expect(ctl.get('q1')!.baseRevision).toBe(0);
  });

  it('labels Saved only for an acknowledged revision', () => {
    const ctl = setup(vi.fn());
    expect(saveLabel(ctl.get('q1')!)).toBe('Starter code. Not saved yet.');
    const loaded = setup(vi.fn(), [row('q1', 3, 'kept\n')]);
    expect(saveLabel(loaded.get('q1')!)).toBe('Saved. Revision 3.');
  });
});

describe('failure, backoff and retry (SW-04)', () => {
  it('keeps the text, backs off 2 s doubling up to a 30 s cap, and allows manual retry', async () => {
    const save = vi.fn().mockRejectedValue(new ApiError('network'));
    const ctl = setup(save);
    ctl.edit('q1', 'keep me');
    await tick(1500);
    const q1 = () => ctl.get('q1')!;
    expect(q1().status).toBe('failed');
    expect(q1().source).toBe('keep me');
    expect(saveLabel(q1())).toBe('Not saved. Connection problem.');
    expect([1, 2, 3, 4, 5, 6, 7].map(backoffDelay)).toEqual([
      2000, 4000, 8000, 16000, 30000, 30000, 30000,
    ]);
    let calls = 1;
    for (const delay of [2000, 4000, 8000, 16000, 30000, 30000]) {
      await tick(delay - 1);
      expect(save).toHaveBeenCalledTimes(calls);
      await tick(1);
      expect(save).toHaveBeenCalledTimes(++calls);
      expect(q1().status).toBe('failed');
    }
    // A manual retry is always available and succeeds once the network returns.
    save.mockResolvedValueOnce(ack(1, 'keep me'));
    await ctl.retry('q1');
    expect(q1().status).toBe('saved');
    expect(q1().failures).toBe(0);
  });

  it('refuses to send text over 32 KiB and keeps it', async () => {
    const save = vi.fn();
    const ctl = setup(save);
    ctl.edit('q1', 'x'.repeat(32769));
    await ctl.flush('q1');
    expect(save).not.toHaveBeenCalled();
    expect(ctl.get('q1')!.status).toBe('failed');
    expect(ctl.get('q1')!.failure).toBe('too-large');
    expect(ctl.get('q1')!.source.length).toBe(32769);
  });
});

describe('sessionStorage backup (SW-04)', () => {
  it('writes under the specified key and clears it on an acknowledged save', async () => {
    const save = vi.fn(async (_q: string, _b: number, s: string) => ack(1, s));
    const ctl = setup(save);
    ctl.edit('q1', 'draft text');
    expect(JSON.parse(window.sessionStorage.getItem(key('q1'))!)).toEqual({
      source: 'draft text',
      baseRevision: 0,
    });
    await tick(1500);
    expect(window.sessionStorage.getItem(key('q1'))).toBeNull();
  });

  it('is kept while a save fails', async () => {
    const ctl = setup(vi.fn().mockRejectedValue(new ApiError('network')));
    ctl.edit('q1', 'draft text');
    await tick(1500);
    expect(window.sessionStorage.getItem(key('q1'))).not.toBeNull();
  });

  it('is cleared on a 401 from a save', async () => {
    const onSession = vi.fn();
    const ctl = setup(
      vi.fn().mockRejectedValue(new ApiError('session')),
      undefined,
      { onSession },
    );
    window.sessionStorage.setItem('cw:draft:u1:pub1:other', '{}');
    ctl.edit('q1', 'secret-ish text');
    await tick(1500);
    expect(onSession).toHaveBeenCalled();
    expect(ctl.get('q1')!.failure).toBe('session');
    expect(window.sessionStorage.length).toBe(0);
    expect(ctl.get('q1')!.source).toBe('secret-ish text'); // still on screen, never claimed saved
  });

  it('is cleared on sign-out', () => {
    const ctl = setup(vi.fn());
    ctl.edit('q1', 'x');
    ctl.edit('q2', 'y');
    expect(window.sessionStorage.length).toBe(2);
    ctl.dispose(true);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('opens the choice on reload and never applies the local copy silently', () => {
    window.sessionStorage.setItem(
      key('q1'),
      JSON.stringify({ source: 'unsaved local\n', baseRevision: 2 }),
    );
    const save = vi.fn();
    const ctl = setup(save, [row('q1', 2, 'server copy\n'), row('q2')]);
    const q1 = ctl.get('q1')!;
    expect(q1.status).toBe('conflict');
    expect(q1.recovered).toBe(true);
    expect(q1.source).toBe('unsaved local\n');
    expect(q1.conflict!.source).toBe('server copy\n');
    expect(save).not.toHaveBeenCalled();
  });

  it('drops a backup identical to the server copy', () => {
    window.sessionStorage.setItem(
      key('q1'),
      JSON.stringify({ source: 'same\n', baseRevision: 1 }),
    );
    const ctl = setup(vi.fn(), [row('q1', 1, 'same\n')]);
    expect(ctl.get('q1')!.status).toBe('saved');
    expect(window.sessionStorage.getItem(key('q1'))).toBeNull();
  });
});

describe('conflicts (SW-03/04)', () => {
  const current = {
    revision: 4,
    source: 'other tab\n',
    sourceHash: sha('other tab\n'),
  };
  it('enters conflict on a 409 and keeps both copies', async () => {
    const save = vi.fn().mockRejectedValue(new ApiError('conflict', current));
    const ctl = setup(save, [row('q1', 3, 'old\n')]);
    ctl.edit('q1', 'mine\n');
    await tick(1500);
    const q1 = ctl.get('q1')!;
    expect(q1.status).toBe('conflict');
    expect(q1.source).toBe('mine\n');
    expect(q1.conflict).toEqual(current);
    await tick(60000);
    expect(save).toHaveBeenCalledTimes(1); // no automatic retry over a conflict
  });

  it('Keep my version saves on top of the server revision', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new ApiError('conflict', current))
      .mockResolvedValueOnce(ack(5, 'mine\n'));
    const ctl = setup(save, [row('q1', 3, 'old\n')]);
    ctl.edit('q1', 'mine\n');
    await tick(1500);
    await ctl.keepMine('q1');
    expect(save).toHaveBeenLastCalledWith('q1', 4, 'mine\n');
    expect(ctl.get('q1')!.status).toBe('saved');
    expect(ctl.get('q1')!.baseRevision).toBe(5);
    expect(ctl.get('q1')!.conflict).toBeNull();
  });

  it('Use saved version takes the server text and revision', async () => {
    const save = vi.fn().mockRejectedValue(new ApiError('conflict', current));
    const ctl = setup(save, [row('q1', 3, 'old\n')]);
    ctl.edit('q1', 'mine\n');
    await tick(1500);
    ctl.useSaved('q1');
    const q1 = ctl.get('q1')!;
    expect(q1.source).toBe('other tab\n');
    expect(q1.baseRevision).toBe(4);
    expect(q1.status).toBe('saved');
    expect(window.sessionStorage.getItem(key('q1'))).toBeNull();
  });

  it('treats a 409 whose current text equals the sent text as saved (lost response)', async () => {
    const save = vi.fn().mockRejectedValue(
      new ApiError('conflict', {
        revision: 4,
        source: 'mine\n',
        sourceHash: sha('mine\n'),
      }),
    );
    const ctl = setup(save, [row('q1', 3, 'old\n')]);
    ctl.edit('q1', 'mine\n');
    await tick(1500);
    expect(ctl.get('q1')!.status).toBe('saved');
    expect(ctl.get('q1')!.baseRevision).toBe(4);
  });

  it('reconcile shows both copies instead of replacing local text', () => {
    const ctl = setup(vi.fn(), [row('q1', 1, 'a\n')]);
    ctl.edit('q1', 'local\n');
    ctl.reconcile([row('q1', 2, 'server\n')]);
    expect(ctl.get('q1')!.status).toBe('conflict');
    expect(ctl.get('q1')!.source).toBe('local\n');
  });
});

describe('line diff', () => {
  it('aligns same, changed and one-sided lines', () => {
    const rows = diffLines('a\nb\nc\n', 'a\nB\nc\nd\n');
    expect(rows.map((r) => r.kind)).toEqual([
      'same',
      'changed',
      'same',
      'saved-only',
    ]);
    expect(rows[1].mine).toEqual({ n: 2, text: 'b' });
    expect(rows[1].saved).toEqual({ n: 2, text: 'B' });
    expect(rows[3].mine).toBeNull();
  });
  it('handles empty inputs', () => {
    expect(diffLines('', '')).toEqual([]);
    expect(diffLines('x\n', '').map((r) => r.kind)).toEqual(['mine-only']);
  });
});

describe('API error mapping and routes', () => {
  const reply = (status: number, body: unknown) =>
    vi.fn(async () => new Response(JSON.stringify(body), { status }));
  it('parses the closed conflict body', async () => {
    const current = { revision: 2, source: 's\n', sourceHash: sha('s\n') };
    const api = workApi(
      reply(409, {
        schemaVersion: 1,
        error: { code: 'CONFLICT_REVISION', message: 'm', requestId: 'r1' },
        current,
      }),
    );
    await expect(api.save('q1', 1, 'x')).rejects.toMatchObject({
      kind: 'conflict',
      current,
    });
  });
  it.each([
    ['STALE_PUBLICATION', 'stale'],
    ['DEADLINE_PASSED', 'deadline'],
    ['IDEMPOTENCY_MISMATCH', 'mismatch'],
    ['CONFLICT_REVISION', 'conflict'],
  ])('maps %s', async (code, kind) => {
    const api = workApi(
      reply(409, { error: { code, message: 'm', requestId: 'r1' } }),
    );
    await expect(api.submit('p', 'k', [])).rejects.toMatchObject({ kind });
  });
  it.each([
    [401, 'session'],
    [404, 'unavailable'],
    [400, 'invalid'],
    [503, 'network'],
  ])('maps HTTP %i', async (status, kind) => {
    await expect(workApi(reply(status, {})).work('p')).rejects.toMatchObject({
      kind,
    });
  });
  it('sends the CSRF token on mutations only', async () => {
    const fetcher = reply(401, {});
    const api = workApi(fetcher, () => 'tok');
    await api.save('q1', 0, 'x').catch(() => undefined);
    await api.work('p').catch(() => undefined);
    const init = (i: number) =>
      (fetcher.mock.calls as unknown as [string, RequestInit][])[i][1];
    expect(init(0).headers).toMatchObject({ 'X-CSRF-Token': 'tok' });
    expect(init(0).method).toBe('PUT');
    expect(init(1).headers).toEqual({});
  });
  it('parses the workbook route', () => {
    expect(parseStudentRoute('/student/assignments/v1/work/2', '')).toEqual({
      kind: 'work',
      versionId: 'v1',
      position: 2,
    });
    expect(parseStudentRoute('/student/assignments/v1/work/0', '')).toBeNull();
    expect(parseStudentRoute('/student/assignments/v1/work/21', '')).toBeNull();
    expect(
      parseStudentRoute('/student/assignments/v1/work/1', '?x=1'),
    ).toBeNull();
  });
});
