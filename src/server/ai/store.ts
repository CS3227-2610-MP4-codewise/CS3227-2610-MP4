import { BoundaryError } from '../../shared/instructor-contracts/schema';

export type GatewayRequestRow = {
  id: string;
  actor_id: string;
  course_id: string;
  action: string;
  idempotency_key: string;
  fingerprint: string;
  evidence_key: string;
  input_json: string;
  deadline_at: number;
  created_at: number;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'expired';
  result_json: string | null;
  cache_until: number | null;
  error_code: string | null;
  retry_after_seconds: number | null;
};
export type BeginGatewayRequest = {
  requestId: string;
  actorId: string;
  courseId: string;
  action: 'assessment-draft' | 'progress-explanation';
  idempotencyKey: string;
  fingerprint: string;
  evidenceKey: string;
  inputJson: string;
  deadlineAt: number;
  now: number;
};
export type AttemptAdmission = {
  requestId: string;
  leaseId: string;
  providerScope: string;
  tokenReservation: number;
  windowStart: number;
  windowEnd: number;
  userRequestLimit: number;
  providerRequestLimit: number;
  userTokenLimit: number;
  providerTokenLimit: number;
  concurrencyLimit: number;
  leaseUntil: number;
  now: number;
};
function nonempty(s: string) {
  if (typeof s !== 'string' || s.length === 0 || s.length > 256)
    throw new BoundaryError('INVALID_CONTRACT');
}
function positive(n: number) {
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new BoundaryError('INVALID_CONTRACT');
}
/** Durable resource accounting. Authorization and action validation are caller duties. */
export class GatewayStore {
  constructor(readonly db: D1Database) {}
  async read(id: string) {
    return this.db
      .prepare('SELECT * FROM ai_gateway_requests WHERE id=?')
      .bind(id)
      .first<GatewayRequestRow>();
  }
  async failPending(
    requestId: string,
    now: number,
    errorCode: string,
    retryAfterSeconds?: number,
  ) {
    nonempty(requestId);
    nonempty(errorCode);
    if (!Number.isSafeInteger(now)) throw new BoundaryError('INVALID_CONTRACT');
    if (
      retryAfterSeconds !== undefined &&
      (!Number.isSafeInteger(retryAfterSeconds) || retryAfterSeconds < 0)
    )
      throw new BoundaryError('INVALID_CONTRACT');
    const row = await this.db
      .prepare(
        `UPDATE ai_gateway_requests SET status=CASE WHEN deadline_at<=? THEN 'expired' ELSE 'failed' END,error_code=?,retry_after_seconds=?
      WHERE id=? AND status='pending' RETURNING id`,
      )
      .bind(now, errorCode, retryAfterSeconds ?? null, requestId)
      .first();
    if (!row) throw new BoundaryError('STALE_EVIDENCE');
  }
  async findSuccess(
    actorId: string,
    courseId: string,
    action: string,
    fingerprint: string,
    now: number,
  ) {
    for (const value of [actorId, courseId, action, fingerprint])
      nonempty(value);
    if (!Number.isSafeInteger(now)) throw new BoundaryError('INVALID_CONTRACT');
    return this.db
      .prepare(
        `SELECT * FROM ai_gateway_requests WHERE actor_id=? AND course_id=? AND action=? AND fingerprint=? AND status='succeeded' AND cache_until>? AND result_json IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
      )
      .bind(actorId, courseId, action, fingerprint, now)
      .first<GatewayRequestRow>();
  }
  async copyCached(requestId: string, sourceId: string, now: number) {
    nonempty(requestId);
    nonempty(sourceId);
    if (!Number.isSafeInteger(now) || requestId === sourceId)
      throw new BoundaryError('INVALID_CONTRACT');
    const row = await this.db
      .prepare(
        `UPDATE ai_gateway_requests AS dst SET status='succeeded',result_json=(SELECT json_set(src.result_json,'$.requestId',dst.id,'$.usage',json('{"status":"unavailable"}')) FROM ai_gateway_requests src WHERE src.id=?),cache_until=(SELECT src.cache_until FROM ai_gateway_requests src WHERE src.id=?),error_code=NULL
      WHERE dst.id=? AND dst.status='pending' AND dst.deadline_at>? AND EXISTS
      (SELECT 1 FROM ai_gateway_requests src WHERE src.id=? AND src.status='succeeded' AND src.cache_until>? AND src.result_json IS NOT NULL AND json_valid(src.result_json) AND src.actor_id=dst.actor_id AND src.course_id=dst.course_id AND src.action=dst.action AND src.fingerprint=dst.fingerprint AND src.evidence_key=dst.evidence_key) RETURNING id`,
      )
      .bind(sourceId, sourceId, requestId, now, sourceId, now)
      .first();
    if (!row) throw new BoundaryError('STALE_EVIDENCE');
  }
  async begin(input: BeginGatewayRequest) {
    if (
      typeof input.inputJson !== 'string' ||
      new TextEncoder().encode(input.inputJson).length > 8192
    )
      throw new BoundaryError('INVALID_CONTRACT');
    try {
      JSON.parse(input.inputJson);
    } catch {
      throw new BoundaryError('INVALID_CONTRACT');
    }
    for (const s of [
      input.requestId,
      input.actorId,
      input.courseId,
      input.idempotencyKey,
      input.fingerprint,
      input.evidenceKey,
    ])
      nonempty(s);
    if (
      !['assessment-draft', 'progress-explanation'].includes(input.action) ||
      !Number.isSafeInteger(input.now) ||
      !Number.isSafeInteger(input.deadlineAt) ||
      input.deadlineAt <= input.now
    )
      throw new BoundaryError('INVALID_CONTRACT');
    const result = await this.db
      .prepare(
        `INSERT INTO ai_gateway_requests
      (id,actor_id,course_id,action,idempotency_key,fingerprint,evidence_key,input_json,deadline_at,created_at,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,'pending') ON CONFLICT(actor_id,course_id,action,idempotency_key) DO NOTHING`,
      )
      .bind(
        input.requestId,
        input.actorId,
        input.courseId,
        input.action,
        input.idempotencyKey,
        input.fingerprint,
        input.evidenceKey,
        input.inputJson,
        input.deadlineAt,
        input.now,
      )
      .run();
    const row = await this.db
      .prepare(
        `SELECT * FROM ai_gateway_requests WHERE actor_id=? AND course_id=? AND action=? AND idempotency_key=?`,
      )
      .bind(input.actorId, input.courseId, input.action, input.idempotencyKey)
      .first<GatewayRequestRow>();
    if (
      !row ||
      row.fingerprint !== input.fingerprint ||
      row.evidence_key !== input.evidenceKey ||
      row.input_json !== input.inputJson
    )
      throw new BoundaryError('IDEMPOTENCY_CONFLICT');
    return {
      kind:
        result.meta.changes === 1
          ? ('created' as const)
          : ('existing' as const),
      request: row,
    };
  }
  async admitAttempt(input: AttemptAdmission) {
    for (const s of [input.requestId, input.leaseId, input.providerScope])
      nonempty(s);
    for (const n of [
      input.tokenReservation,
      input.userRequestLimit,
      input.providerRequestLimit,
      input.userTokenLimit,
      input.providerTokenLimit,
      input.concurrencyLimit,
    ])
      positive(n);
    if (
      ![input.now, input.windowStart, input.windowEnd, input.leaseUntil].every(
        Number.isSafeInteger,
      ) ||
      input.windowStart > input.now ||
      input.windowEnd <= input.now ||
      input.leaseUntil <= input.now ||
      input.leaseUntil > input.windowEnd ||
      input.providerScope !== 'soclaas-shared' ||
      input.windowStart < 0 ||
      input.windowStart % (input.windowEnd - input.windowStart) !== 0
    )
      throw new BoundaryError('INVALID_CONTRACT');
    const {
      requestId,
      leaseId,
      providerScope,
      tokenReservation,
      windowStart,
      windowEnd,
      userRequestLimit,
      providerRequestLimit,
      userTokenLimit,
      providerTokenLimit,
      concurrencyLimit,
      leaseUntil,
      now,
    } = input;
    const results = await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO ai_gateway_quota_policy(provider_scope,window_ms,user_request_limit,provider_request_limit,user_token_limit,provider_token_limit,concurrency_limit)
        VALUES(?,?,?,?,?,?,?) ON CONFLICT(provider_scope) DO NOTHING`,
        )
        .bind(
          providerScope,
          windowEnd - windowStart,
          userRequestLimit,
          providerRequestLimit,
          userTokenLimit,
          providerTokenLimit,
          concurrencyLimit,
        ),
      this.db
        .prepare(
          `INSERT INTO ai_gateway_attempts(lease_id,request_id,actor_id,provider_scope,created_at,lease_until,reserved_tokens,state)
        SELECT ?,r.id,r.actor_id,?,?,?,?,'inflight' FROM ai_gateway_requests r
        WHERE r.id=? AND r.status='pending' AND r.deadline_at>? AND r.deadline_at>=?
        AND EXISTS (SELECT 1 FROM ai_gateway_quota_policy p WHERE p.provider_scope=? AND p.window_ms=? AND p.user_request_limit=? AND p.provider_request_limit=? AND p.user_token_limit=? AND p.provider_token_limit=? AND p.concurrency_limit=?)
        AND (SELECT COUNT(*) FROM ai_gateway_attempts a WHERE a.request_id=r.id)<3
        AND NOT EXISTS (SELECT 1 FROM ai_gateway_attempts a WHERE a.request_id=r.id AND a.state IN ('inflight','uncertain'))
        AND NOT EXISTS (SELECT 1 FROM ai_gateway_attempts a WHERE a.provider_scope=? AND (a.state='uncertain' OR (a.state='inflight' AND a.created_at<?)))
        AND (SELECT COUNT(*) FROM ai_gateway_attempts a WHERE a.actor_id=r.actor_id AND a.created_at>=? AND a.created_at<?) < ?
        AND (SELECT COUNT(*) FROM ai_gateway_attempts a WHERE a.provider_scope=? AND a.created_at>=? AND a.created_at<?) < ?
        AND COALESCE((SELECT SUM(a.reserved_tokens) FROM ai_gateway_attempts a WHERE a.actor_id=r.actor_id AND a.created_at>=? AND a.created_at<?),0)+? <= ?
        AND COALESCE((SELECT SUM(a.reserved_tokens) FROM ai_gateway_attempts a WHERE a.provider_scope=? AND a.created_at>=? AND a.created_at<?),0)+? <= ?
        AND (SELECT COUNT(*) FROM ai_gateway_attempts a WHERE a.provider_scope=? AND a.state IN ('inflight','uncertain')) < ?`,
        )
        .bind(
          leaseId,
          providerScope,
          now,
          leaseUntil,
          tokenReservation,
          requestId,
          now,
          leaseUntil,
          providerScope,
          windowEnd - windowStart,
          userRequestLimit,
          providerRequestLimit,
          userTokenLimit,
          providerTokenLimit,
          concurrencyLimit,
          providerScope,
          windowStart,
          windowStart,
          windowEnd,
          userRequestLimit,
          providerScope,
          windowStart,
          windowEnd,
          providerRequestLimit,
          windowStart,
          windowEnd,
          tokenReservation,
          userTokenLimit,
          providerScope,
          windowStart,
          windowEnd,
          tokenReservation,
          providerTokenLimit,
          providerScope,
          concurrencyLimit,
        ),
      this.db
        .prepare(
          `UPDATE ai_gateway_requests SET status='running' WHERE id=? AND status='pending'
        AND EXISTS (SELECT 1 FROM ai_gateway_attempts WHERE lease_id=? AND request_id=? AND state='inflight')`,
        )
        .bind(requestId, leaseId, requestId),
    ]);
    if (results[1].meta.changes !== 1 || results[2].meta.changes !== 1)
      throw new BoundaryError('RATE_LIMITED');
  }
  /** A definitive response only. The caller validates domain output before success. */
  async settle(input: {
    requestId: string;
    leaseId: string;
    now: number;
    outcome: 'retry' | 'succeeded' | 'failed';
    resultJson?: string;
    errorCode?: string;
    usedTokens?: number;
    cacheUntil?: number;
    retryAfterSeconds?: number;
  }) {
    nonempty(input.requestId);
    nonempty(input.leaseId);
    if (
      !Number.isSafeInteger(input.now) ||
      !['retry', 'succeeded', 'failed'].includes(input.outcome) ||
      (input.outcome === 'succeeded' &&
        (typeof input.resultJson !== 'string' ||
          input.resultJson.length > 131072)) ||
      (input.usedTokens !== undefined &&
        (!Number.isSafeInteger(input.usedTokens) || input.usedTokens < 0)) ||
      (input.retryAfterSeconds !== undefined &&
        (!Number.isSafeInteger(input.retryAfterSeconds) ||
          input.retryAfterSeconds < 0)) ||
      (input.cacheUntil !== undefined &&
        (!Number.isSafeInteger(input.cacheUntil) ||
          input.cacheUntil <= input.now ||
          input.outcome !== 'succeeded'))
    )
      throw new BoundaryError('INVALID_CONTRACT');
    if (input.errorCode !== undefined) nonempty(input.errorCode);
    const status = input.outcome === 'retry' ? 'pending' : input.outcome;
    const marker = crypto.randomUUID();
    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE ai_gateway_attempts SET state='settled',used_tokens=?,settlement_marker=?
        WHERE lease_id=? AND request_id=? AND state='inflight' AND lease_until>? AND (? IS NULL OR ?>=0 AND ?<=reserved_tokens)
        AND EXISTS (SELECT 1 FROM ai_gateway_requests WHERE id=? AND status='running' AND deadline_at>?)`,
        )
        .bind(
          input.usedTokens ?? null,
          marker,
          input.leaseId,
          input.requestId,
          input.now,
          input.usedTokens ?? null,
          input.usedTokens ?? null,
          input.usedTokens ?? null,
          input.requestId,
          input.now,
        ),
      this.db
        .prepare(
          `UPDATE ai_gateway_requests SET status=?,result_json=?,error_code=?,cache_until=?,retry_after_seconds=?
        WHERE id=? AND status='running' AND deadline_at>? AND EXISTS
        (SELECT 1 FROM ai_gateway_attempts WHERE lease_id=? AND request_id=? AND state='settled' AND settlement_marker=?)`,
        )
        .bind(
          status,
          input.outcome === 'succeeded' ? input.resultJson : null,
          input.errorCode ?? null,
          input.outcome === 'succeeded' ? (input.cacheUntil ?? null) : null,
          input.outcome === 'failed' ? (input.retryAfterSeconds ?? null) : null,
          input.requestId,
          input.now,
          input.leaseId,
          input.requestId,
          marker,
        ),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1)
      throw new BoundaryError('STALE_EVIDENCE');
  }
  /** An observed usage overrun must increase the charged budget and fail closed. */
  async markOverage(
    requestId: string,
    leaseId: string,
    now: number,
    usedTokens: number,
  ) {
    nonempty(requestId);
    nonempty(leaseId);
    if (
      !Number.isSafeInteger(now) ||
      !Number.isSafeInteger(usedTokens) ||
      usedTokens < 0
    )
      throw new BoundaryError('INVALID_CONTRACT');
    const marker = crypto.randomUUID();
    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE ai_gateway_attempts SET state='uncertain', used_tokens=?, reserved_tokens=MAX(reserved_tokens,?), settlement_marker=?
        WHERE lease_id=? AND request_id=? AND state='inflight' AND ?>reserved_tokens AND EXISTS (SELECT 1 FROM ai_gateway_requests WHERE id=? AND status='running')`,
        )
        .bind(
          usedTokens,
          usedTokens,
          marker,
          leaseId,
          requestId,
          usedTokens,
          requestId,
        ),
      this.db
        .prepare(
          `UPDATE ai_gateway_requests SET status='expired',error_code='UPSTREAM_UNAVAILABLE' WHERE id=? AND status='running' AND EXISTS (SELECT 1 FROM ai_gateway_attempts WHERE lease_id=? AND request_id=? AND state='uncertain' AND settlement_marker=?)`,
        )
        .bind(requestId, leaseId, requestId, marker),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1)
      throw new BoundaryError('STALE_EVIDENCE');
  }
  /** Timeout/abort does not prove the remote operation stopped: retain concurrency debt. */
  async markUncertain(requestId: string, leaseId: string, now: number) {
    nonempty(requestId);
    nonempty(leaseId);
    if (!Number.isSafeInteger(now)) throw new BoundaryError('INVALID_CONTRACT');
    const results = await this.db.batch([
      this.db
        .prepare(
          "UPDATE ai_gateway_attempts SET state='uncertain' WHERE lease_id=? AND request_id=? AND state='inflight'",
        )
        .bind(leaseId, requestId),
      this.db
        .prepare(
          "UPDATE ai_gateway_requests SET status='expired',error_code='UPSTREAM_UNAVAILABLE' WHERE id=? AND status='running' AND EXISTS (SELECT 1 FROM ai_gateway_attempts WHERE lease_id=? AND request_id=? AND state='uncertain')",
        )
        .bind(requestId, leaseId, requestId),
    ]);
    if (results[0].meta.changes !== 1 || results[1].meta.changes !== 1)
      throw new BoundaryError('STALE_EVIDENCE');
  }
  /** Expire a lease or deadline without freeing a possibly still-running provider call. */
  async expire(requestId: string, now: number) {
    nonempty(requestId);
    if (!Number.isSafeInteger(now)) throw new BoundaryError('INVALID_CONTRACT');
    const results = await this.db.batch([
      this.db
        .prepare(
          `UPDATE ai_gateway_attempts SET state='uncertain' WHERE request_id=? AND state='inflight' AND (lease_until<=? OR EXISTS (SELECT 1 FROM ai_gateway_requests WHERE id=? AND deadline_at<=?))`,
        )
        .bind(requestId, now, requestId, now),
      this.db
        .prepare(
          `UPDATE ai_gateway_requests SET status='expired',error_code='UPSTREAM_UNAVAILABLE' WHERE id=? AND status IN ('pending','running') AND (deadline_at<=? OR EXISTS (SELECT 1 FROM ai_gateway_attempts WHERE request_id=? AND state='uncertain'))`,
        )
        .bind(requestId, now, requestId),
    ]);
    return results[1].meta.changes === 1;
  }
}
