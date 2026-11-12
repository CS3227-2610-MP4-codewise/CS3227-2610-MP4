import {
  callSoclaas,
  SoclaasTransportError,
} from '../../src/server/ai/transport';
import type {
  SoclaasInput,
  SoclaasResult,
} from '../../src/server/ai/transport';

/** One-process evaluation guard; callers must retain its state and never resume after a crash. */
export function boundedTransport(
  transport: (input: SoclaasInput) => Promise<SoclaasResult> = callSoclaas,
  maximum = 12,
) {
  let attempts = 0;
  let stopped = false;
  return {
    status: () => ({ attempts, stopped }),
    call: async (input: SoclaasInput): Promise<SoclaasResult> => {
      if (stopped || attempts >= maximum)
        throw new SoclaasTransportError('configuration');
      attempts++;
      try {
        return await transport(input);
      } catch (error) {
        if (
          error instanceof SoclaasTransportError &&
          ['rate_limited', 'timeout', 'cancelled', 'transient'].includes(
            error.kind,
          )
        )
          stopped = true;
        throw error;
      }
    },
  };
}
