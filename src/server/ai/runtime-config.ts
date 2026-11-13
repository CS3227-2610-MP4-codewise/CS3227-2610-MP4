import type { Environment } from '../environment';
import type { GatewayLimits, VerifiedAIProfile } from './config';

type AIConfig = { profile: VerifiedAIProfile; limits: GatewayLimits };

/** Explicitly operator-verified, server-only configuration. Missing or malformed settings disable AI. */
export function instructorAIConfig(env: Environment): AIConfig | undefined {
  return parseAIConfig(
    env.SOCLAAS_INSTRUCTOR_ENABLED,
    env.SOCLAAS_INSTRUCTOR_API_KEY,
    env.SOCLAAS_INSTRUCTOR_CONFIG,
  );
}

/**
 * student-progress D7 (Keith; Darryl review pending): the same validation for the separate
 * student credential. Both actions share the one `soclaas-shared` D1 quota pool, whose policy is
 * pinned on first admission, so the six limit values must equal the instructor's while both are
 * enabled; a different policy fails closed in the gateway store.
 */
export function studentAIConfig(env: Environment): AIConfig | undefined {
  return parseAIConfig(
    env.SOCLAAS_STUDENT_ENABLED,
    env.SOCLAAS_STUDENT_API_KEY,
    env.SOCLAAS_STUDENT_CONFIG,
  );
}

function parseAIConfig(
  enabled: string | undefined,
  key: string | undefined,
  json: string | undefined,
): AIConfig | undefined {
  if (enabled !== 'true' || !key || !json) return undefined;
  try {
    const raw: unknown = JSON.parse(json);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const v = raw as Record<string, unknown>;
    const keys = [
      'model',
      'promptVersion',
      'outputTokenLimit',
      'inputTokenReservation',
      'maxInputBytes',
      'deadlineMs',
      'cacheMs',
      'userRequestLimit',
      'providerRequestLimit',
      'userTokenLimit',
      'providerTokenLimit',
      'concurrencyLimit',
      'windowMs',
    ];
    if (Object.keys(v).length !== keys.length || keys.some((k) => !(k in v)))
      return undefined;
    if (
      typeof v.model !== 'string' ||
      !/^[A-Za-z0-9_.:/-]{1,160}$/.test(v.model) ||
      typeof v.promptVersion !== 'string' ||
      !/^[A-Za-z0-9_.-]{1,128}$/.test(v.promptVersion)
    )
      return undefined;
    const integer = (key: string, min: number, max: number): number => {
      const n = v[key];
      if (
        typeof n !== 'number' ||
        !Number.isSafeInteger(n) ||
        n < min ||
        n > max
      )
        throw new Error('invalid configuration');
      return n;
    };
    const profile: VerifiedAIProfile = {
      verified: true,
      model: v.model,
      allowedModels: [v.model],
      promptVersion: v.promptVersion,
      outputTokenLimit: integer('outputTokenLimit', 1024, 8192),
      inputTokenReservation: integer(
        'inputTokenReservation',
        1,
        Number.MAX_SAFE_INTEGER,
      ),
      maxInputBytes: integer('maxInputBytes', 1, 100000),
      deadlineMs: integer('deadlineMs', 1, 60000),
      cacheMs: integer('cacheMs', 0, 86400000),
    };
    const limits: GatewayLimits = {
      userRequestLimit: integer('userRequestLimit', 1, Number.MAX_SAFE_INTEGER),
      providerRequestLimit: integer(
        'providerRequestLimit',
        1,
        Number.MAX_SAFE_INTEGER,
      ),
      userTokenLimit: integer('userTokenLimit', 1, Number.MAX_SAFE_INTEGER),
      providerTokenLimit: integer(
        'providerTokenLimit',
        1,
        Number.MAX_SAFE_INTEGER,
      ),
      concurrencyLimit: integer('concurrencyLimit', 1, Number.MAX_SAFE_INTEGER),
      windowMs: integer('windowMs', 1, 86400000),
    };
    if (!Number.isSafeInteger(profile.inputTokenReservation + 1024))
      return undefined;
    return { profile, limits };
  } catch {
    return undefined;
  }
}
