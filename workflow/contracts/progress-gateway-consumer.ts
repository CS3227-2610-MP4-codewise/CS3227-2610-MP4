import { describe, expect, it } from 'vitest';

/** Keith supplies isolated synthetic fixtures; each call creates a fresh consumer. */
export interface ProgressGatewayConsumerFixture {
  requestWithoutValidator(): Promise<unknown>;
  requestWithInvalidEvidence(): Promise<unknown>;
  requestWithInvalidOutput(): Promise<{ status: string }>;
  readAsAnotherUser(): Promise<unknown>;
  revokeThenRead(): Promise<unknown>;
}
export function progressGatewayConsumerContractSuite(
  name: string,
  make: () => Promise<ProgressGatewayConsumerFixture>,
) {
  describe(`${name}: C-AI progress consumer boundaries`, () => {
    it('fails closed before a missing action validator can produce a result', async () => {
      await expect(
        (await make()).requestWithoutValidator(),
      ).rejects.toMatchObject({ code: 'AI_DISABLED' });
    });
    it('rejects unowned or unreleased evidence', async () => {
      await expect(
        (await make()).requestWithInvalidEvidence(),
      ).rejects.toThrow();
    });
    it('never exposes a domain-invalid provider output as success', async () => {
      expect((await (await make()).requestWithInvalidOutput()).status).not.toBe(
        'succeeded',
      );
    });
    it('denies another user and denies after revocation', async () => {
      await expect((await make()).readAsAnotherUser()).rejects.toThrow();
      await expect((await make()).revokeThenRead()).rejects.toThrow();
    });
  });
}
