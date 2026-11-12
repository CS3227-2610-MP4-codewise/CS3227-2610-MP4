import { describe, expect, it, vi } from 'vitest';
import { SoclaasTransportError } from '../../src/server/ai/transport';
import type { SoclaasInput } from '../../src/server/ai/transport';
import { withoutAutomaticRetries } from './no-retry';

const input = {} as SoclaasInput;
describe('evaluation transport', () => {
  it('converts a definitive rate limit into a nonretryable failure', async () => {
    const transport = vi.fn(async () => {
      throw new SoclaasTransportError('rate_limited', 0);
    });
    const onRateLimit = vi.fn();
    await expect(
      withoutAutomaticRetries(transport, onRateLimit)(input),
    ).rejects.toMatchObject({ kind: 'invalid_request' });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(onRateLimit).toHaveBeenCalledTimes(1);
  });
  it('preserves uncertain timeout errors', async () => {
    const error = new SoclaasTransportError('timeout');
    await expect(
      withoutAutomaticRetries(async () => {
        throw error;
      })(input),
    ).rejects.toBe(error);
  });
});
