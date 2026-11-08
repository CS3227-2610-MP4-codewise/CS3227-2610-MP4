import type { AIAction } from '../../shared/instructor-contracts/ai';
import { BoundaryError } from '../../shared/instructor-contracts/schema';

/** Supplied only by a trusted server composition after external verification. */
export type VerifiedAIProfile = {
  verified: true;
  model: string;
  allowedModels: readonly string[];
  promptVersion: string;
  outputTokenLimit: number;
  inputTokenReservation: number;
  /** Verified model-specific bound for the entire serialized request envelope. */
  maxInputBytes: number;
  deadlineMs: number;
  cacheMs: number;
};
/** One shared policy per actual provider quota pool, not one policy per key. */
export type GatewayLimits = {
  userRequestLimit: number;
  providerRequestLimit: number;
  userTokenLimit: number;
  providerTokenLimit: number;
  concurrencyLimit: number;
  windowMs: number;
};
export type AISecrets = {
  SOCLAAS_INSTRUCTOR_API_KEY?: string;
  SOCLAAS_STUDENT_API_KEY?: string;
};
export function actionCredential(action: AIAction, secrets: AISecrets): string {
  const instructor = secrets.SOCLAAS_INSTRUCTOR_API_KEY;
  const student = secrets.SOCLAAS_STUDENT_API_KEY;
  const selected = action === 'assessment-draft' ? instructor : student;
  if (!selected || (instructor && student && instructor === student))
    throw new BoundaryError('AI_DISABLED');
  return selected;
}
