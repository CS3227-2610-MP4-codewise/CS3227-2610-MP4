import { it, expect, vi } from 'vitest';
import { CreationController } from './controller';
import { BoundaryError } from '../../../shared/instructor-contracts/schema';
const key = 'a368170d-b3aa-4af4-83f5-8cd624037a3a';
it('validates before sending and permits cancellation before submit', async () => {
  const send = vi.fn(),
    c = new CreationController(
      send,
      () => {},
      () => key,
    );
  expect(c.canCancel).toBe(true);
  c.edit('  ');
  await c.submit();
  expect(send).not.toHaveBeenCalled();
  expect(c.state.phase).toBe('editing');
  expect(c.state.message).toContain('1–120');
});
it('blocks duplicates/cancel and retains exact logical request after a lost acknowledgement', async () => {
  let reject!: (e: Error) => void;
  const send = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((_, r) => {
          reject = r;
        }),
    )
    .mockResolvedValueOnce({ id: 'course-1', name: 'Studio' });
  const c = new CreationController(
    send,
    () => {},
    () => key,
  );
  c.edit(' Studio ');
  const first = c.submit();
  expect(c.state.phase).toBe('pending');
  expect(c.canCancel).toBe(false);
  c.edit('Changed');
  await c.submit();
  expect(send).toHaveBeenCalledTimes(1);
  reject(new Error('lost response'));
  await first;
  expect(c.state.phase).toBe('uncertain');
  expect(c.state.course).toBeNull();
  c.edit('Changed');
  await c.submit();
  expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
  expect(c.state.phase).toBe('complete');
  expect(c.state.course?.id).toBe('course-1');
});
it.each([
  ['FORBIDDEN', 'denied'],
  ['UNAUTHENTICATED', 'denied'],
  ['IDEMPOTENCY_CONFLICT', 'conflict'],
  ['RATE_LIMITED', 'uncertain'],
] as const)(
  'reports %s truthfully without acknowledging or silently restarting',
  async (code, phase) => {
    const c = new CreationController(
      async () => {
        throw new BoundaryError(code);
      },
      () => {},
      () => key,
    );
    c.edit('Studio');
    await c.submit();
    expect(c.state.phase).toBe(phase);
    expect(c.state.course).toBeNull();
    expect(c.canCancel).toBe(false);
  },
);
it('does not navigate on malformed/mismatched acknowledgement', async () => {
  const c = new CreationController(
    async () => ({ id: 'course-1', name: 'Other course' }),
    () => {},
    () => key,
  );
  c.edit('Studio');
  await c.submit();
  expect(c.state.phase).toBe('uncertain');
  expect(c.state.course).toBeNull();
});
