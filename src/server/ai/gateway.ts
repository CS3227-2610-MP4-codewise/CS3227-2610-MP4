import {
  aiRequestSchema,
  type AIAction,
  type AIRequestInput,
  type GatewayOutcome,
} from '../../shared/instructor-contracts/ai';
import {
  BoundaryError,
  errorCodes,
  type ErrorCode,
} from '../../shared/instructor-contracts/schema';
import type {
  AIGatewayPort,
  TrustedPrincipal,
} from '../instructor/ports/contracts';
import {
  actionCredential,
  type AISecrets,
  type GatewayLimits,
  type VerifiedAIProfile,
} from './config';
import {
  callSoclaas,
  SoclaasTransportError,
  type SoclaasInput,
  type SoclaasResult,
} from './transport';
import { GatewayStore, type GatewayRequestRow } from './store';

type Evidence<T> = {
  evidenceKey: string;
  system: string;
  user: string;
  validate(payload: unknown): Promise<T>;
};
/** The resolver MUST perform current object/course authorization and evidence checks on every call. */
export type GatewayResolver<A extends AIAction, T> = (
  principal: TrustedPrincipal,
  input: AIRequestInput<A>,
) => Promise<Evidence<T>>;
type Config<A extends AIAction, T> = {
  action: A;
  profile?: VerifiedAIProfile;
  limits: GatewayLimits;
  secrets: AISecrets;
  resolve?: GatewayResolver<A, T>;
  clock?: () => number;
  transport?: (input: SoclaasInput) => Promise<SoclaasResult>;
  sleep?: (ms: number) => Promise<void>;
};
async function digest(s: string) {
  const value = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(s),
  );
  return Array.from(new Uint8Array(value), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
/** No default resolver or provider configuration is supplied by the production application. */
export class SecureAIGateway<A extends AIAction, T> implements AIGatewayPort<
  A,
  T
> {
  private readonly clock: () => number;
  constructor(
    private readonly store: GatewayStore,
    private readonly config: Config<A, T>,
  ) {
    this.clock = config.clock ?? Date.now;
  }
  private configured(input: AIRequestInput<A>) {
    const p = this.config.profile,
      l = this.config.limits;
    if (
      !p ||
      p.verified !== true ||
      !this.config.resolve ||
      input.action !== this.config.action ||
      !p.allowedModels.includes(p.model) ||
      !Number.isSafeInteger(p.cacheMs) ||
      p.cacheMs < 0 ||
      p.cacheMs > 86400000 ||
      !Number.isSafeInteger(p.maxInputBytes) ||
      p.maxInputBytes < 1 ||
      p.maxInputBytes > 100000 ||
      input.outputTokenLimit > p.outputTokenLimit ||
      ![
        p.outputTokenLimit,
        p.inputTokenReservation,
        p.deadlineMs,
        l.userRequestLimit,
        l.providerRequestLimit,
        l.userTokenLimit,
        l.providerTokenLimit,
        l.concurrencyLimit,
        l.windowMs,
      ].every((v) => Number.isSafeInteger(v) && v > 0) ||
      p.deadlineMs > 60000 ||
      l.windowMs > 86400000
    )
      throw new BoundaryError('AI_DISABLED');
    return {
      profile: p,
      key: actionCredential(this.config.action, this.config.secrets),
      resolve: this.config.resolve,
    };
  }
  private async outcome(
    row: GatewayRequestRow,
    principal: TrustedPrincipal,
  ): Promise<GatewayOutcome<A, T>> {
    if (row.actor_id !== principal.userId || row.action !== this.config.action)
      throw new BoundaryError('FORBIDDEN');
    const input = aiRequestSchema.parse(
      JSON.parse(row.input_json),
    ) as AIRequestInput<A>;
    const { resolve, profile } = this.configured(input);
    const evidence = await resolve(principal, input);
    if (evidence.evidenceKey !== row.evidence_key)
      throw new BoundaryError('STALE_EVIDENCE');
    const { idempotencyKey: _key, ...fingerprintInput } = input;
    void _key;
    const fingerprint = await digest(
      JSON.stringify([
        fingerprintInput,
        evidence.evidenceKey,
        evidence.system,
        evidence.user,
        profile.promptVersion,
        profile.model,
      ]),
    );
    if (fingerprint !== row.fingerprint)
      throw new BoundaryError('STALE_EVIDENCE');
    if (row.status === 'succeeded') {
      if (!row.result_json) throw new BoundaryError('INVALID_CONTRACT');
      const result = JSON.parse(row.result_json) as GatewayOutcome<A, T>;
      if (
        result.status !== 'succeeded' ||
        result.requestId !== row.id ||
        result.action !== this.config.action ||
        result.evidenceKey !== row.evidence_key
      )
        throw new BoundaryError('INVALID_CONTRACT');
      const payload = await evidence.validate(result.payload);
      if (
        !payload ||
        typeof payload !== 'object' ||
        !('kind' in payload) ||
        payload.kind !== this.config.action
      )
        throw new BoundaryError('INVALID_CONTRACT');
      const finalEvidence = await resolve(principal, input);
      const finalFingerprint = await digest(
        JSON.stringify([
          fingerprintInput,
          finalEvidence.evidenceKey,
          finalEvidence.system,
          finalEvidence.user,
          profile.promptVersion,
          profile.model,
        ]),
      );
      if (
        finalEvidence.evidenceKey !== row.evidence_key ||
        finalFingerprint !== row.fingerprint
      )
        throw new BoundaryError('STALE_EVIDENCE');
      return { ...result, payload } as GatewayOutcome<A, T>;
    }
    const common = {
      schemaVersion: 1 as const,
      requestId: row.id,
      action: this.config.action,
      evidenceKey: row.evidence_key,
    };
    if (row.status === 'failed' || row.status === 'expired')
      return {
        ...common,
        status: row.status,
        safeCode: errorCodes.includes(row.error_code as ErrorCode)
          ? (row.error_code as ErrorCode)
          : 'UPSTREAM_UNAVAILABLE',
        ...(row.retry_after_seconds === null
          ? {}
          : { retryAfterSeconds: row.retry_after_seconds }),
      };
    return { ...common, status: row.status };
  }
  async readAuthorized(
    principal: TrustedPrincipal,
    requestId: string,
  ): Promise<GatewayOutcome<A, T>> {
    const row = await this.store.read(requestId);
    if (!row) throw new BoundaryError('NOT_FOUND');
    if (row.actor_id !== principal.userId || row.action !== this.config.action)
      throw new BoundaryError('FORBIDDEN');
    await this.store.expire(row.id, this.clock());
    return this.outcome((await this.store.read(row.id))!, principal);
  }
  async request(
    principal: TrustedPrincipal,
    raw: AIRequestInput<A>,
  ): Promise<GatewayOutcome<A, T>> {
    const parsed = aiRequestSchema.parse(raw);
    if (parsed.action !== this.config.action)
      throw new BoundaryError('INVALID_CONTRACT');
    const input = parsed as AIRequestInput<A>;
    const { profile, key, resolve } = this.configured(input);
    const evidence = await resolve(principal, input);
    if (
      !evidence ||
      typeof evidence.validate !== 'function' ||
      typeof evidence.evidenceKey !== 'string' ||
      typeof evidence.system !== 'string' ||
      typeof evidence.user !== 'string' ||
      new TextEncoder().encode(
        JSON.stringify({
          model: profile.model,
          messages: [
            { role: 'system', content: evidence.system },
            { role: 'user', content: evidence.user },
          ],
          max_tokens: input.outputTokenLimit,
          stream: false,
        }),
      ).length > profile.maxInputBytes
    )
      throw new BoundaryError('AI_DISABLED');
    const { idempotencyKey, ...fingerprintInput } = input;
    const fingerprint = await digest(
      JSON.stringify([
        fingerprintInput,
        evidence.evidenceKey,
        evidence.system,
        evidence.user,
        profile.promptVersion,
        profile.model,
      ]),
    );
    const now = this.clock();
    const started = await this.store.begin({
      requestId: crypto.randomUUID(),
      actorId: principal.userId,
      courseId: input.courseId,
      action: this.config.action,
      idempotencyKey,
      fingerprint,
      evidenceKey: evidence.evidenceKey,
      inputJson: JSON.stringify(input),
      deadlineAt: now + profile.deadlineMs,
      now,
    });
    if (started.kind === 'existing')
      return this.readAuthorized(principal, started.request.id);
    const row = started.request,
      limits = this.config.limits;
    if (profile.cacheMs > 0) {
      const cached = await this.store.findSuccess(
        principal.userId,
        input.courseId,
        this.config.action,
        fingerprint,
        now,
      );
      if (cached) {
        await this.outcome(cached, principal);
        await this.store.copyCached(row.id, cached.id, now);
        return this.readAuthorized(principal, row.id);
      }
    }
    for (let retry = 0; retry <= 2; retry++) {
      const at = this.clock(),
        remaining = row.deadline_at - at;
      if (remaining <= 0) {
        await this.store.expire(row.id, at);
        break;
      }
      const leaseId = crypto.randomUUID(),
        windowStart = Math.floor(at / limits.windowMs) * limits.windowMs,
        leaseDeadline = Math.min(
          row.deadline_at,
          windowStart + limits.windowMs,
        );
      try {
        await this.store.admitAttempt({
          requestId: row.id,
          leaseId,
          providerScope: 'soclaas-shared',
          tokenReservation:
            profile.inputTokenReservation + input.outputTokenLimit,
          windowStart,
          windowEnd: windowStart + limits.windowMs,
          ...limits,
          leaseUntil: leaseDeadline,
          now: at,
        });
      } catch (error) {
        const code =
          error instanceof BoundaryError ? error.code : 'UPSTREAM_UNAVAILABLE';
        await this.store.failPending(
          row.id,
          this.clock(),
          code,
          code === 'RATE_LIMITED'
            ? Math.max(
                0,
                Math.ceil(
                  (windowStart + limits.windowMs - this.clock()) / 1000,
                ),
              )
            : undefined,
        );
        return this.readAuthorized(principal, row.id);
      }
      let finalized = false;
      let attemptUsage: number | undefined;
      const accountUsage = async (usage: SoclaasResult['usage']) => {
        if (usage.status !== 'reported') return false;
        attemptUsage = usage.inputTokens + usage.outputTokens;
        if (!Number.isSafeInteger(attemptUsage)) {
          await this.store.markUncertain(row.id, leaseId, this.clock());
        } else if (
          attemptUsage >
          profile.inputTokenReservation + input.outputTokenLimit
        ) {
          await this.store.markOverage(
            row.id,
            leaseId,
            this.clock(),
            attemptUsage,
          );
        } else return false;
        finalized = true;
        return true;
      };
      try {
        const dispatchEvidence = await resolve(principal, input);
        const dispatchFingerprint = await digest(
          JSON.stringify([
            fingerprintInput,
            dispatchEvidence.evidenceKey,
            dispatchEvidence.system,
            dispatchEvidence.user,
            profile.promptVersion,
            profile.model,
          ]),
        );
        if (
          dispatchEvidence.evidenceKey !== row.evidence_key ||
          dispatchFingerprint !== row.fingerprint
        )
          throw new BoundaryError('STALE_EVIDENCE');
        const dispatchRemaining = leaseDeadline - this.clock();
        if (dispatchRemaining <= 0) {
          await this.store.expire(row.id, this.clock());
          finalized = true;
          return this.readAuthorized(principal, row.id);
        }
        const result = await (this.config.transport ?? callSoclaas)({
          apiKey: key,
          model: profile.model,
          allowedModels: profile.allowedModels,
          system: evidence.system,
          user: evidence.user,
          maxOutputTokens: input.outputTokenLimit,
          timeoutMs: Math.min(dispatchRemaining, 60000),
        });
        if (await accountUsage(result.usage)) {
          return this.readAuthorized(principal, row.id);
        }
        if (
          result.usage.status === 'reported' &&
          (result.usage.inputTokens > profile.inputTokenReservation ||
            result.usage.outputTokens > input.outputTokenLimit)
        )
          throw new SoclaasTransportError('invalid_response');
        const payload = await evidence.validate(result.payload);
        if (
          !payload ||
          typeof payload !== 'object' ||
          !('kind' in payload) ||
          payload.kind !== this.config.action
        )
          throw new BoundaryError('INVALID_CONTRACT');
        const fresh = await resolve(principal, input);
        const freshFingerprint = await digest(
          JSON.stringify([
            fingerprintInput,
            fresh.evidenceKey,
            fresh.system,
            fresh.user,
            profile.promptVersion,
            profile.model,
          ]),
        );
        if (
          fresh.evidenceKey !== row.evidence_key ||
          freshFingerprint !== row.fingerprint
        )
          throw new BoundaryError('STALE_EVIDENCE');
        const outcome = {
          schemaVersion: 1 as const,
          requestId: row.id,
          action: this.config.action,
          evidenceKey: row.evidence_key,
          status: 'succeeded' as const,
          promptVersion: profile.promptVersion,
          modelVersion: profile.model,
          latencyMs: this.clock() - now,
          retries: retry,
          usage: result.usage,
          payload,
        };
        await this.store.settle({
          requestId: row.id,
          leaseId,
          now: this.clock(),
          outcome: 'succeeded',
          resultJson: JSON.stringify(outcome),
          ...(profile.cacheMs > 0
            ? { cacheUntil: this.clock() + profile.cacheMs }
            : {}),
          ...(attemptUsage === undefined ? {} : { usedTokens: attemptUsage }),
        });
        finalized = true;
        return this.readAuthorized(principal, row.id);
      } catch (error) {
        if (finalized) throw error;
        if (
          error instanceof SoclaasTransportError &&
          error.usage &&
          (await accountUsage(error.usage))
        )
          return this.readAuthorized(principal, row.id);
        if (
          error instanceof SoclaasTransportError &&
          (error.kind === 'timeout' ||
            error.kind === 'cancelled' ||
            error.kind === 'transient')
        ) {
          await this.store.markUncertain(row.id, leaseId, this.clock());
          break;
        }
        const retryable =
          error instanceof SoclaasTransportError &&
          error.kind === 'rate_limited' &&
          retry < 2;
        const wait =
          error instanceof SoclaasTransportError
            ? (error.retryAfterMs ?? 250) +
              crypto.getRandomValues(new Uint8Array(1))[0]
            : 0;
        const canRetry = retryable && this.clock() + wait < row.deadline_at;
        await this.store.settle({
          requestId: row.id,
          leaseId,
          now: this.clock(),
          outcome: canRetry ? 'retry' : 'failed',
          ...(attemptUsage === undefined ? {} : { usedTokens: attemptUsage }),
          ...(!canRetry &&
          error instanceof SoclaasTransportError &&
          error.kind === 'rate_limited' &&
          Number.isFinite(wait)
            ? { retryAfterSeconds: Math.ceil(wait / 1000) }
            : {}),
          errorCode:
            error instanceof BoundaryError
              ? error.code
              : error instanceof SoclaasTransportError &&
                  error.kind === 'rate_limited'
                ? 'RATE_LIMITED'
                : ('UPSTREAM_UNAVAILABLE' satisfies ErrorCode),
        });
        if (!canRetry) break;
        await (
          this.config.sleep ??
          ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
        )(wait);
      }
    }
    return this.readAuthorized(principal, row.id);
  }
}
