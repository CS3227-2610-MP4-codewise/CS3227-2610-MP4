/** Server-only composition seams. No production implementation or fixture fallback. */
import type { Publication } from '../../../shared/instructor-contracts/publication';
import type { Attempt } from '../../../shared/instructor-contracts/submission';
import type {
  Release,
  Withdrawn,
  Currentness,
} from '../../../shared/instructor-contracts/release';
import type {
  AIAction,
  AIRequestInput,
  GatewayOutcome,
} from '../../../shared/instructor-contracts/ai';
import { BoundaryError } from '../../../shared/instructor-contracts/schema';
declare const principalBrand: unique symbol;
/** Only a trusted injected session adapter creates this; a type is not authorization. */
export interface TrustedPrincipal {
  readonly userId: string;
  readonly sessionHandle: string;
  readonly [principalBrand]: true;
}
export type ObjectTarget = {
  kind: 'assignment' | 'submission' | 'assessment' | 'ai-request';
  id: string;
};
export interface IdentityCoursePort {
  requireSession(request: Request): Promise<TrustedPrincipal>;
  requireCourse(
    principal: TrustedPrincipal,
    courseId: string,
    action: 'instructor-write' | 'instructor-read' | 'student-read',
  ): Promise<void>;
  requireObject(
    principal: TrustedPrincipal,
    target: ObjectTarget,
    action: 'read' | 'write',
  ): Promise<{ courseId: string }>;
  requireMutationOrigin(request: Request): Promise<void>;
}
export interface SubmissionReadPort {
  getAuthorized(
    principal: TrustedPrincipal,
    attemptId: string,
  ): Promise<Attempt>;
}
export interface PublicationReadPort {
  getAuthorized(
    principal: TrustedPrincipal,
    assignmentVersionId: string,
  ): Promise<Publication>;
}
export interface ReleaseReadPort {
  getAuthorized(
    principal: TrustedPrincipal,
    id: string,
    releaseVersion: number,
  ): Promise<Release | Withdrawn>;
  currentness(principal: TrustedPrincipal, id: string): Promise<Currentness>;
}
export interface AIGatewayPort<A extends AIAction, T> {
  request(
    principal: TrustedPrincipal,
    input: AIRequestInput<A>,
  ): Promise<GatewayOutcome<A, T>>;
  readAuthorized(
    principal: TrustedPrincipal,
    requestId: string,
  ): Promise<GatewayOutcome<A, T>>;
}
/** A contract consumer boundary, not a route or a login implementation. */
export async function withAuthorizedObject<T>(
  identity: IdentityCoursePort | undefined,
  request: Request,
  target: ObjectTarget,
  action: 'instructor-read' | 'instructor-write' | 'student-read',
  read: (principal: TrustedPrincipal, courseId: string) => Promise<T>,
): Promise<T> {
  if (!identity) throw new BoundaryError('UNAUTHENTICATED');
  const principal = await identity.requireSession(request);
  const scope = await identity.requireObject(
    principal,
    target,
    action === 'instructor-write' ? 'write' : 'read',
  );
  await identity.requireCourse(principal, scope.courseId, action);
  if (action === 'instructor-write')
    await identity.requireMutationOrigin(request);
  return read(principal, scope.courseId);
}
export interface GatewayTestPorts<A extends AIAction, T> {
  authorize(): Promise<void>;
  config?: { verified: true; maxOutputTokens: number };
  validate?: (payload: unknown) => Promise<T>;
  admission(input: AIRequestInput<A>): Promise<void>;
  resolveEvidence(input: AIRequestInput<A>): Promise<string>;
  requestRecords: { begin(key: string, evidenceKey: string): Promise<string> };
  clock: () => number;
  deadlineMs: number;
  transport(input: AIRequestInput<A>): Promise<unknown>;
}

export interface ReleaseProtocolPort {
  release(
    command: import('../../../shared/instructor-contracts/schema').Infer<
      typeof import('../../../shared/instructor-contracts/release').releaseCommandSchema
    >,
  ): Promise<Release>;
  withdraw(
    command: import('../../../shared/instructor-contracts/schema').Infer<
      typeof import('../../../shared/instructor-contracts/release').withdrawalCommandSchema
    >,
  ): Promise<Withdrawn>;
  currentness(): Promise<Currentness>;
}
