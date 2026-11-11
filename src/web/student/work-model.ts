import { attemptSchema } from '../../shared/instructor-contracts/submission';
import { publicationSchema } from '../../shared/instructor-contracts/publication';
import {
  MAX_SOURCE_BYTES,
  attemptHistorySchema,
  draftConflictSchema,
  draftSaveResponseSchema,
  submitResponseSchema,
  workResponseSchema,
} from '../../shared/student-work';

/**
 * SW-01–SW-08 client model: API client, the per-question save state machine (design section 7),
 * the sessionStorage backup and the line diff. Browser state here is presentation only; the
 * server re-authorizes every request.
 */

export type SaveStatus = 'unsaved' | 'saving' | 'saved' | 'conflict' | 'failed';
export type FailureKind =
  | 'network'
  | 'session'
  | 'unavailable'
  | 'invalid'
  | 'too-large'
  | 'rate-limited';
export type ServerDraft = {
  revision: number;
  source: string;
  sourceHash: string;
};

export type ApiErrorKind =
  | 'network'
  | 'session'
  | 'unavailable'
  | 'invalid'
  | 'conflict'
  | 'stale'
  | 'deadline'
  | 'mismatch'
  | 'rate-limited';
/** SW-11: fallback wait when a 429 has no usable Retry-After; the server sends 60 s. */
export const RATE_LIMIT_DEFAULT_MS = 60000;
const retryAfterMs = (header: string | null) => {
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.min(seconds, 300) * 1000
    : RATE_LIMIT_DEFAULT_MS;
};
export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly current: ServerDraft | null = null,
    /** For `rate-limited`: how long to wait before sending again. */
    readonly retryAfterMs = 0,
  ) {
    super('Student work request failed.');
  }
}

type Fetcher = typeof fetch;
export const REQUEST_TIMEOUT_MS = 20000;

export function workApi(
  fetcher: Fetcher = (...a) => fetch(...a),
  csrf: () => string = () => '',
) {
  async function call(
    method: 'GET' | 'PUT' | 'POST',
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    let response: Response;
    // A hung request must not freeze Previous/Next or submit forever.
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
    try {
      response = await fetcher(path, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: timeout.signal,
        headers:
          method === 'GET'
            ? {}
            : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf() },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new ApiError('network');
    } finally {
      clearTimeout(timer);
    }
    if (response.ok) {
      try {
        return await response.json();
      } catch {
        throw new ApiError('network');
      }
    }
    if (response.status === 401) throw new ApiError('session');
    if (response.status === 403 || response.status === 404)
      throw new ApiError('unavailable');
    if (response.status === 400) throw new ApiError('invalid');
    if (response.status === 429)
      throw new ApiError(
        'rate-limited',
        null,
        retryAfterMs(response.headers.get('Retry-After')),
      );
    if (response.status === 409) {
      let parsed: unknown = null;
      try {
        parsed = await response.json();
      } catch {
        /* an unreadable conflict body is treated as a plain conflict */
      }
      const code = (parsed as { error?: { code?: unknown } } | null)?.error
        ?.code;
      if (code === 'CONFLICT_REVISION') {
        let current: ServerDraft | null = null;
        try {
          current = draftConflictSchema.parse(parsed).current;
        } catch {
          current = null;
        }
        throw new ApiError('conflict', current);
      }
      if (code === 'STALE_PUBLICATION') throw new ApiError('stale');
      if (code === 'DEADLINE_PASSED') throw new ApiError('deadline');
      if (code === 'IDEMPOTENCY_MISMATCH') throw new ApiError('mismatch');
      throw new ApiError('network');
    }
    throw new ApiError('network');
  }
  /** A payload failing the closed schema is treated as unavailable, never rendered. */
  const parsed = <T>(decode: () => T): T => {
    try {
      return decode();
    } catch {
      throw new ApiError('unavailable');
    }
  };
  const enc = encodeURIComponent;
  return {
    async work(pub: string) {
      const body = await call(
        'GET',
        '/api/student/publications/' + enc(pub) + '/work',
      );
      return parsed(() => workResponseSchema.parse(body));
    },
    async publication(pub: string) {
      const body = await call('GET', '/api/student/publications/' + enc(pub));
      return parsed(() => publicationSchema.parse(body));
    },
    async save(questionVersionId: string, baseRevision: number, src: string) {
      const body = await call(
        'PUT',
        '/api/student/drafts/' + enc(questionVersionId),
        { schemaVersion: 1, baseRevision, source: src },
      );
      return parsed(() => draftSaveResponseSchema.parse(body));
    },
    async move(
      pub: string,
      request: {
        questionVersionId: string;
        targetQuestionVersionId: string;
        targetBaseRevision: number;
      },
    ) {
      const body = await call(
        'POST',
        '/api/student/publications/' + enc(pub) + '/drafts/move',
        { schemaVersion: 1, ...request },
      );
      return parsed(() => draftSaveResponseSchema.parse(body));
    },
    async submit(pub: string, idempotencyKey: string, answers: SubmitAnswer[]) {
      const body = await call(
        'POST',
        '/api/student/publications/' + enc(pub) + '/attempts',
        { schemaVersion: 1, idempotencyKey, answers },
      );
      return parsed(() => submitResponseSchema.parse(body));
    },
    async history(pub: string, cursor: string | null) {
      const body = await call(
        'GET',
        '/api/student/publications/' +
          enc(pub) +
          '/attempts' +
          (cursor ? '?cursor=' + enc(cursor) : ''),
      );
      return parsed(() => attemptHistorySchema.parse(body));
    },
    async attempt(attemptId: string) {
      const body = await call('GET', '/api/student/attempts/' + enc(attemptId));
      return parsed(() => attemptSchema.parse(body));
    },
  };
}
export type WorkApi = ReturnType<typeof workApi>;
export type SubmitAnswer = {
  questionVersionId: string;
  draftRevision: number;
  sourceHash: string;
};

/** UUID for the submit idempotency key; generated at confirmation and kept for retries. */
export function newIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// ---------------------------------------------------------------- sessionStorage backup

export const BACKUP_PREFIX = 'cw:draft:';
export type Backup = { source: string; baseRevision: number };

/** Key: `cw:draft:<userId>:<publicationId>:<questionVersionId>`. All access is best effort. */
export class BackupStore {
  constructor(
    private readonly userId: string,
    private readonly publicationId: string,
    private readonly storage: () => Storage | null = () => {
      try {
        return window.sessionStorage;
      } catch {
        return null;
      }
    },
  ) {}
  key(questionVersionId: string) {
    return `${BACKUP_PREFIX}${this.userId}:${this.publicationId}:${questionVersionId}`;
  }
  read(questionVersionId: string): Backup | null {
    try {
      const raw = this.storage()?.getItem(this.key(questionVersionId));
      if (!raw) return null;
      const v = JSON.parse(raw) as Partial<Backup>;
      return typeof v.source === 'string' &&
        typeof v.baseRevision === 'number' &&
        Number.isInteger(v.baseRevision)
        ? { source: v.source, baseRevision: v.baseRevision }
        : null;
    } catch {
      return null;
    }
  }
  write(questionVersionId: string, value: Backup) {
    try {
      this.storage()?.setItem(
        this.key(questionVersionId),
        JSON.stringify(value),
      );
    } catch {
      /* quota or blocked storage: the in-memory copy still exists */
    }
  }
  remove(questionVersionId: string) {
    try {
      this.storage()?.removeItem(this.key(questionVersionId));
    } catch {
      /* ignore */
    }
  }
}
/** Sign-out, 401 and account change remove every Codewise backup in this tab. */
export function clearAllBackups(
  storage: Storage | null = (() => {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  })(),
) {
  try {
    if (!storage) return;
    for (const key of Object.keys(storage))
      if (key.startsWith(BACKUP_PREFIX)) storage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- save state machine

export const DEBOUNCE_MS = 1500;
export const MAX_INTERVAL_MS = 10000;
export const BACKOFF_START_MS = 2000;
export const BACKOFF_CAP_MS = 30000;
export const backoffDelay = (failures: number) =>
  Math.min(BACKOFF_CAP_MS, BACKOFF_START_MS * 2 ** Math.max(0, failures - 1));

export type DraftItem = {
  questionVersionId: string;
  /** Last server-acknowledged revision (0 = starter, never saved). */
  baseRevision: number;
  ackSource: string;
  ackHash: string;
  /** What the editor displays. */
  source: string;
  status: SaveStatus;
  failure: FailureKind | null;
  failures: number;
  conflict: ServerDraft | null;
  /** True when the conflict window came from a reload with an unsaved local copy. */
  recovered: boolean;
  /** The exact text of the request in flight, if any. */
  sent: string | null;
  seq: number;
  inflight: boolean;
  queued: boolean;
  /** Set when the student typed or a save is explicitly forced; untouched starter stays at 0. */
  touched: boolean;
};

type Timer = ReturnType<typeof setTimeout>;
type Handles = { debounce?: Timer; max?: Timer; retry?: Timer };
export type SaveAck = { revision: number; sourceHash: string; savedAt: string };

export const byteLength = (s: string) => new TextEncoder().encode(s).length;

export class DraftController {
  private items = new Map<string, DraftItem>();
  private handles = new Map<string, Handles>();
  private promises = new Map<string, Promise<void>>();
  private listeners = new Set<() => void>();
  private version = 0;
  private disposed = false;
  /** After a 401, revocation or sign-out nothing more is written to sessionStorage. */
  private backupsOff = false;
  /** SW-11: after a 429 no save is sent before this time (the limit is per account). */
  private pausedUntil = 0;

  constructor(
    private readonly deps: {
      save: (
        questionVersionId: string,
        baseRevision: number,
        source: string,
      ) => Promise<SaveAck>;
      backup: BackupStore;
      onSession?: () => void;
      /** Called with a short announcement for assistive technology. */
      announce?: (text: string) => void;
    },
  ) {}

  // ---- subscription (useSyncExternalStore)
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getVersion = () => this.version;
  private touch() {
    this.version++;
    for (const l of this.listeners) l();
  }

  get(id: string): DraftItem | undefined {
    return this.items.get(id);
  }
  all(): DraftItem[] {
    return [...this.items.values()];
  }
  isDirty(id: string) {
    const it = this.items.get(id);
    return !!it && it.source !== it.ackSource;
  }

  /** Seeds from the server read. A differing local backup opens the choice, never silently applies. */
  load(
    rows: {
      questionVersionId: string;
      revision: number;
      source: string;
      sourceHash: string;
    }[],
  ) {
    for (const row of rows) {
      const backup = this.deps.backup.read(row.questionVersionId);
      const item: DraftItem = {
        questionVersionId: row.questionVersionId,
        baseRevision: row.revision,
        ackSource: row.source,
        ackHash: row.sourceHash,
        source: row.source,
        status: 'saved',
        failure: null,
        failures: 0,
        conflict: null,
        recovered: false,
        sent: null,
        seq: 0,
        inflight: false,
        queued: false,
        touched: row.revision > 0,
      };
      if (backup && backup.source !== row.source) {
        item.source = backup.source;
        item.status = 'conflict';
        item.recovered = true;
        item.touched = true;
        item.conflict = {
          revision: row.revision,
          source: row.source,
          sourceHash: row.sourceHash,
        };
      } else if (backup) this.deps.backup.remove(row.questionVersionId);
      this.items.set(row.questionVersionId, item);
    }
    this.touch();
  }

  private timers(id: string): Handles {
    let h = this.handles.get(id);
    if (!h) this.handles.set(id, (h = {}));
    return h;
  }
  private clearTimers(id: string, which: (keyof Handles)[]) {
    const h = this.timers(id);
    for (const k of which) {
      if (h[k]) clearTimeout(h[k]);
      h[k] = undefined;
    }
  }

  /** Typing: debounce 1.5 s after the last edit; at most 10 s between saves while typing continues. */
  edit(id: string, source: string) {
    const it = this.items.get(id);
    if (!it || it.status === 'conflict' || this.disposed) return;
    if (source === it.source) return;
    it.source = source;
    it.touched = true;
    if (source === it.ackSource && !it.inflight) {
      // Edited back to exactly the acknowledged text.
      it.status = 'saved';
      it.failure = null;
      this.clearTimers(id, ['debounce', 'max', 'retry']);
      this.deps.backup.remove(id);
      this.touch();
      return;
    }
    it.status = 'unsaved';
    if (!this.backupsOff)
      this.deps.backup.write(id, { source, baseRevision: it.baseRevision });
    const h = this.timers(id);
    this.clearTimers(id, ['debounce', 'retry']);
    h.debounce = setTimeout(() => this.fire(id), DEBOUNCE_MS);
    if (!h.max) h.max = setTimeout(() => this.fire(id), MAX_INTERVAL_MS);
    this.touch();
  }

  private fire(id: string) {
    this.clearTimers(id, ['debounce', 'max']);
    const it = this.items.get(id);
    if (!it || this.disposed) return;
    if (it.inflight) {
      it.queued = true; // sent right after the response
      return;
    }
    void this.save(id);
  }

  /** Blur, navigation and submit paths: resolves once nothing more can be sent for this question. */
  async flush(id: string, force = false): Promise<void> {
    for (let i = 0; i < 4; i++) {
      const it = this.items.get(id);
      if (!it || it.status === 'conflict' || this.disposed) return;
      const inflight = this.promises.get(id);
      if (it.inflight && inflight) {
        await inflight;
        continue;
      }
      const needs =
        it.source !== it.ackSource || (force && it.baseRevision === 0);
      if (!needs) return;
      await this.save(id);
      const after = this.items.get(id);
      if (!after || after.status === 'failed') return;
    }
  }
  async flushAll(force = false) {
    await Promise.all(
      [...this.items.keys()].map((id) => this.flush(id, force)),
    );
  }

  retry(id: string) {
    return this.save(id);
  }

  save(id: string): Promise<void> {
    const it = this.items.get(id);
    if (!it || it.inflight || it.status === 'conflict' || this.disposed)
      return this.promises.get(id) ?? Promise.resolve();
    this.clearTimers(id, ['debounce', 'max', 'retry']);
    it.queued = false;
    if (byteLength(it.source) > MAX_SOURCE_BYTES) {
      it.status = 'failed';
      it.failure = 'too-large';
      this.touch();
      return Promise.resolve();
    }
    const wait = this.pausedUntil - Date.now();
    if (wait > 0) {
      // Rate limited: send nothing until the pause ends; the text and backup are kept.
      this.pause(id, it, wait);
      this.touch();
      return Promise.resolve();
    }
    const seq = ++it.seq;
    const sent = it.source;
    const base = it.baseRevision;
    it.inflight = true;
    it.sent = sent;
    it.status = 'saving';
    it.failure = null;
    this.touch();
    const run = (async () => {
      let ack: SaveAck | null = null;
      let error: ApiError | null = null;
      try {
        ack = await this.deps.save(id, base, sent);
      } catch (e) {
        error = e instanceof ApiError ? e : new ApiError('network');
      }
      // A resolution, reset or disposal bumped the sequence: this answer is stale.
      if (seq !== it.seq || this.disposed) return;
      it.inflight = false;
      it.sent = null;
      if (ack) this.acknowledged(it, sent, ack.revision, ack.sourceHash);
      else this.rejected(it, sent, error!);
      this.touch();
      if (it.queued && it.status !== 'conflict' && it.status !== 'failed') {
        it.queued = false;
        if (it.source !== it.ackSource) void this.save(id);
      }
    })();
    this.promises.set(id, run);
    return run;
  }

  private acknowledged(
    it: DraftItem,
    sent: string,
    revision: number,
    hash: string,
  ) {
    it.baseRevision = revision;
    it.ackSource = sent;
    it.ackHash = hash;
    it.failure = null;
    it.failures = 0;
    it.conflict = null;
    // "Saved" only when the acknowledged text is what is displayed now.
    if (it.source === sent) {
      it.status = 'saved';
      this.deps.backup.remove(it.questionVersionId);
      this.deps.announce?.('Saved.');
    } else {
      it.status = 'unsaved';
      if (!this.backupsOff)
        this.deps.backup.write(it.questionVersionId, {
          source: it.source,
          baseRevision: revision,
        });
      const h = this.timers(it.questionVersionId);
      if (!h.debounce)
        h.debounce = setTimeout(
          () => this.fire(it.questionVersionId),
          DEBOUNCE_MS,
        );
    }
  }

  private rejected(it: DraftItem, sent: string, error: ApiError) {
    const id = it.questionVersionId;
    if (error.kind === 'conflict' && error.current) {
      const current = error.current;
      if (current.source === sent) {
        // A previous response was lost but the save landed: the server already holds this text.
        this.acknowledged(it, sent, current.revision, current.sourceHash);
        return;
      }
      if (current.source === it.source) {
        this.acknowledged(it, it.source, current.revision, current.sourceHash);
        return;
      }
      it.status = 'conflict';
      it.conflict = current;
      this.deps.announce?.('Save conflict. Choose which version to keep.');
      return;
    }
    it.status = 'failed';
    if (error.kind === 'session') {
      it.failure = 'session';
      this.backupsOff = true;
      clearAllBackups();
      this.deps.onSession?.();
      this.deps.announce?.('Not saved. Your session has ended.');
      return;
    }
    if (error.kind === 'unavailable') {
      it.failure = 'unavailable';
      this.backupsOff = true;
      clearAllBackups();
      this.deps.announce?.('Not saved. This work is no longer available.');
      return;
    }
    if (error.kind === 'invalid') {
      it.failure = 'invalid';
      this.deps.announce?.('Not saved. The text cannot be saved.');
      return;
    }
    if (error.kind === 'rate-limited') {
      this.pausedUntil = Date.now() + error.retryAfterMs;
      this.pause(it.questionVersionId, it, error.retryAfterMs);
      this.deps.announce?.(
        'Saving paused for a moment. Your text is kept and will be saved automatically.',
      );
      return;
    }
    it.failure = 'network';
    it.failures += 1;
    this.deps.announce?.('Not saved. Retrying automatically.');
    this.timers(id).retry = setTimeout(() => {
      const cur = this.items.get(id);
      if (cur && cur.status === 'failed' && cur.source !== cur.ackSource)
        void this.save(id);
    }, backoffDelay(it.failures));
  }

  /** SW-11: mark the item paused and retry once the pause ends; failures do not back off further. */
  private pause(id: string, it: DraftItem, wait: number) {
    it.status = 'failed';
    it.failure = 'rate-limited';
    this.clearTimers(id, ['retry']);
    this.timers(id).retry = setTimeout(() => {
      const cur = this.items.get(id);
      if (cur && cur.status === 'failed' && cur.source !== cur.ackSource)
        void this.save(id);
    }, wait);
  }

  /** Conflict window: keep the local text, saved on top of the server revision. */
  keepMine(id: string): Promise<void> {
    const it = this.items.get(id);
    if (!it || !it.conflict) return Promise.resolve();
    it.seq++;
    it.inflight = false;
    it.baseRevision = it.conflict.revision;
    it.ackSource = it.conflict.source;
    it.ackHash = it.conflict.sourceHash;
    it.conflict = null;
    it.recovered = false;
    it.failure = null;
    it.status = it.source === it.ackSource ? 'saved' : 'unsaved';
    this.touch();
    if (it.source === it.ackSource) {
      this.deps.backup.remove(id);
      return Promise.resolve();
    }
    return this.save(id);
  }

  /** Conflict window: discard the local text for the server copy. */
  useSaved(id: string) {
    const it = this.items.get(id);
    if (!it || !it.conflict) return;
    it.seq++;
    it.inflight = false;
    it.baseRevision = it.conflict.revision;
    it.ackSource = it.conflict.source;
    it.ackHash = it.conflict.sourceHash;
    it.source = it.conflict.source;
    it.conflict = null;
    it.recovered = false;
    it.failure = null;
    it.status = 'saved';
    this.clearTimers(id, ['debounce', 'max', 'retry']);
    this.deps.backup.remove(id);
    this.touch();
  }

  /**
   * After a rejected submit or a refresh: any question whose server revision moved is shown
   * in the conflict window with both copies; nothing is replaced silently.
   */
  reconcile(
    rows: {
      questionVersionId: string;
      revision: number;
      source: string;
      sourceHash: string;
    }[],
  ) {
    for (const row of rows) {
      const it = this.items.get(row.questionVersionId);
      if (!it || it.inflight) continue;
      if (row.revision !== it.baseRevision || row.sourceHash !== it.ackHash) {
        if (it.source === row.source) {
          it.baseRevision = row.revision;
          it.ackSource = row.source;
          it.ackHash = row.sourceHash;
          it.status = 'saved';
          it.conflict = null;
        } else {
          it.status = 'conflict';
          it.conflict = {
            revision: row.revision,
            source: row.source,
            sourceHash: row.sourceHash,
          };
        }
      }
    }
    this.touch();
  }

  /** Sign-out, 401 or account change: stop all work and drop backups. Text stays in memory only. */
  dispose(removeBackups: boolean) {
    this.disposed = true;
    if (removeBackups) this.backupsOff = true;
    for (const id of this.items.keys())
      this.clearTimers(id, ['debounce', 'max', 'retry']);
    for (const it of this.items.values()) it.seq++;
    if (removeBackups) clearAllBackups();
  }
  /** 401: remembers the state without sending anything else. */
  sessionLost() {
    this.dispose(true);
    for (const it of this.items.values()) {
      it.inflight = false;
      if (it.source !== it.ackSource) {
        it.status = 'failed';
        it.failure = 'session';
      }
    }
    this.touch();
  }
}

// ---------------------------------------------------------------- line diff (no dependency)

export type DiffKind = 'same' | 'changed' | 'mine-only' | 'saved-only';
export type DiffRow = {
  kind: DiffKind;
  mine: { n: number; text: string } | null;
  saved: { n: number; text: string } | null;
};
const MAX_LCS_CELLS = 4_000_000;

/** Line-level diff of local (mine) and server (saved) copies, aligned for side-by-side display. */
export function diffLines(mine: string, saved: string): DiffRow[] {
  const split = (s: string) => {
    if (s === '') return [] as string[];
    const lines = s.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return lines;
  };
  const a = split(mine);
  const b = split(saved);
  type Op = { op: 'same' | 'a' | 'b'; ai: number; bi: number };
  const ops: Op[] = [];
  if (a.length * b.length > MAX_LCS_CELLS) {
    // Bounded work: treat everything as different rather than freezing the tab.
    a.forEach((_, ai) => ops.push({ op: 'a', ai, bi: -1 }));
    b.forEach((_, bi) => ops.push({ op: 'b', ai: -1, bi }));
  } else {
    const w = b.length + 1;
    const t = new Uint32Array((a.length + 1) * w);
    for (let i = a.length - 1; i >= 0; i--)
      for (let j = b.length - 1; j >= 0; j--)
        t[i * w + j] =
          a[i] === b[j]
            ? t[(i + 1) * w + j + 1] + 1
            : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) ops.push({ op: 'same', ai: i++, bi: j++ });
      else if (t[(i + 1) * w + j] >= t[i * w + j + 1])
        ops.push({ op: 'a', ai: i++, bi: -1 });
      else ops.push({ op: 'b', ai: -1, bi: j++ });
    }
    while (i < a.length) ops.push({ op: 'a', ai: i++, bi: -1 });
    while (j < b.length) ops.push({ op: 'b', ai: -1, bi: j++ });
  }
  const rows: DiffRow[] = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].op === 'same') {
      rows.push({
        kind: 'same',
        mine: { n: ops[k].ai + 1, text: a[ops[k].ai] },
        saved: { n: ops[k].bi + 1, text: b[ops[k].bi] },
      });
      k++;
      continue;
    }
    const left: Op[] = [];
    const right: Op[] = [];
    while (k < ops.length && ops[k].op !== 'same') {
      (ops[k].op === 'a' ? left : right).push(ops[k]);
      k++;
    }
    const paired = Math.min(left.length, right.length);
    for (let p = 0; p < Math.max(left.length, right.length); p++) {
      const l = left[p];
      const r = right[p];
      rows.push({
        kind: p < paired ? 'changed' : l ? 'mine-only' : 'saved-only',
        mine: l ? { n: l.ai + 1, text: a[l.ai] } : null,
        saved: r ? { n: r.bi + 1, text: b[r.bi] } : null,
      });
    }
  }
  return rows;
}

export const shortHash = (hash: string) => hash.slice(0, 8);
