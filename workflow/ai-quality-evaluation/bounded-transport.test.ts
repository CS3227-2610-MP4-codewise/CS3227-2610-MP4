import { describe, expect, it, vi } from 'vitest';
import { SoclaasTransportError } from '../../src/server/ai/transport';
import type { SoclaasInput } from '../../src/server/ai/transport';
import { boundedTransport } from './bounded-transport';
const input = {} as SoclaasInput;
describe('evaluation dispatch guard', () => {
  it.each(['rate_limited', 'timeout', 'cancelled', 'transient'] as const)(
    'stops further dispatch after %s',
    async (kind) => {
      const transport = vi.fn(async () => {
        throw new SoclaasTransportError(kind);
      });
      const guard = boundedTransport(transport);
      await expect(guard.call(input)).rejects.toThrow();
      await expect(guard.call(input)).rejects.toThrow();
      expect(transport).toHaveBeenCalledTimes(1);
      expect(guard.status()).toEqual({ attempts: 1, stopped: true });
    },
  );
  it('enforces the attempt ceiling', async () => {
    const transport = vi.fn(async () => ({
      payload: {},
      usage: { status: 'unavailable' as const },
    }));
    const guard = boundedTransport(transport, 2);
    await guard.call(input);
    await guard.call(input);
    await expect(guard.call(input)).rejects.toThrow();
    expect(transport).toHaveBeenCalledTimes(2);
  });
});
