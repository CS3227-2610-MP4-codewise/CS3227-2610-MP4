import {
  callSoclaas,
  SoclaasTransportError,
} from '../../src/server/ai/transport';
import type {
  SoclaasInput,
  SoclaasResult,
} from '../../src/server/ai/transport';

/** Evaluation-only adapter: definitive rate limits stop rather than trigger gateway retries. */
export function withoutAutomaticRetries(
  transport: (input: SoclaasInput) => Promise<SoclaasResult> = callSoclaas,
  onRateLimit: () => void = () => {},
) {
  return async (input: SoclaasInput): Promise<SoclaasResult> => {
    try {
      return await transport(input);
    } catch (error) {
      if (
        error instanceof SoclaasTransportError &&
        error.kind === 'rate_limited'
      ) {
        onRateLimit();
        throw new SoclaasTransportError('invalid_request', null, error.usage);
      }
      throw error;
    }
  };
}
