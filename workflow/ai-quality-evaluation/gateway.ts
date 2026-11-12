import { SecureAIGateway } from '../../src/server/ai/gateway';
import { GatewayStore } from '../../src/server/ai/store';
import { instructorAIConfig } from '../../src/server/ai/runtime-config';
import type {
  SoclaasInput,
  SoclaasResult,
} from '../../src/server/ai/transport';
import type { Environment } from '../../src/server/environment';
import type { AssessmentGatewayFactory } from '../../src/server/instructor/assessments/workflow';
import { withoutAutomaticRetries } from './no-retry';

/** Pass only as createApplication's loopback-only localAssessmentGateway port. */
export function evaluationGateway(
  env: Environment,
  transport?: (input: SoclaasInput) => Promise<SoclaasResult>,
  onRateLimit?: () => void,
): (db: D1Database) => AssessmentGatewayFactory {
  const config = instructorAIConfig(env);
  if (!config)
    throw new Error('Instructor evaluation profile is not configured');
  return (db) => (resolve) =>
    new SecureAIGateway(new GatewayStore(db), {
      action: 'assessment-draft',
      ...config,
      secrets: env,
      resolve,
      transport: withoutAutomaticRetries(transport, onRateLimit),
    });
}
