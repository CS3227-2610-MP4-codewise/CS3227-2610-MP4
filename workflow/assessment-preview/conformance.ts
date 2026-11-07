/** Reusable producer checks. External identity/submission ports may be synthetic; state transitions must use the actual producer. */
import {
  assertCurrentRelease,
  currentnessToken,
  releaseSchema,
  withdrawnSchema,
  type Release,
  type Withdrawn,
  type Currentness,
} from '../../src/shared/instructor-contracts/release';
export interface LifecycleDriver {
  prepareReviewed(): Promise<{
    assessmentId: string;
    assessmentRevisionId: string;
  }>;
  correctReviewed(): Promise<{
    assessmentId: string;
    assessmentRevisionId: string;
  }>;
  release(command: unknown): Promise<Release>;
  withdraw(command: unknown): Promise<Release | Withdrawn>;
  read(version: number): Promise<Release | Withdrawn>;
  currentness(): Promise<Currentness>;
}
export async function verifyAssessmentProducer(p: LifecycleDriver) {
  const first = await p.prepareReviewed(),
    initial = await p.currentness();
  const release1 = {
    schemaVersion: 1,
    ...first,
    expectedAvailabilityRevision: initial.availabilityRevision,
    idempotencyKey: 'conformance_release_1',
  };
  const a = releaseSchema.parse(await p.release(release1));
  if (JSON.stringify(await p.release(release1)) !== JSON.stringify(a))
    throw Error('Committed release retry changed');
  const before = await p.currentness();
  assertCurrentRelease(a, before);
  const next = await p.correctReviewed();
  const b = releaseSchema.parse(
    await p.release({
      schemaVersion: 1,
      ...next,
      expectedAvailabilityRevision: (await p.currentness())
        .availabilityRevision,
      idempotencyKey: 'conformance_release_2',
    }),
  );
  if (b.releaseVersion <= a.releaseVersion)
    throw Error('Release versions must increase');
  const historical = await p.read(a.releaseVersion);
  if (historical.state !== 'superseded')
    throw Error('Prior release not superseded');
  const withdraw1 = {
    schemaVersion: 1,
    assessmentId: first.assessmentId,
    releaseVersion: a.releaseVersion,
    expectedAvailabilityRevision: (await p.currentness()).availabilityRevision,
    idempotencyKey: 'conformance_withdraw_1',
    reason: 'Synthetic conformance reason',
  };
  const tombstone = withdrawnSchema.parse(await p.withdraw(withdraw1));
  if (JSON.stringify(await p.withdraw(withdraw1)) !== JSON.stringify(tombstone))
    throw Error('Withdrawal retry changed');
  const current = await p.currentness();
  if (current.currentReleaseVersion !== b.releaseVersion)
    throw Error('Historical withdrawal changed current');
  if (currentnessToken(current) === currentnessToken(before))
    throw Error('Availability token unchanged');
  withdrawnSchema.parse(await p.read(a.releaseVersion));
  assertCurrentRelease(await p.read(b.releaseVersion), current);
  await p.withdraw({
    ...withdraw1,
    releaseVersion: b.releaseVersion,
    expectedAvailabilityRevision: current.availabilityRevision,
    idempotencyKey: 'conformance_withdraw_2',
  });
  const final = await p.currentness();
  if (final.currentReleaseVersion !== null)
    throw Error('Withdrawal revived older feedback');
  withdrawnSchema.parse(await p.read(b.releaseVersion));
  return { first: a, correction: b, historicalWithdrawal: tombstone, final };
}
