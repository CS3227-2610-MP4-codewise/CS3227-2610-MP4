import { examples } from '../fixtures/instructor-contracts/graph';
import {
  releaseSchema,
  withdrawnSchema,
  currentnessSchema,
} from '../../src/shared/instructor-contracts/release';
/** Cross-linked C-REL examples from the existing draft graph, not a deployed course/grade. */
export function publicFeedbackFixtures() {
  const first = releaseSchema.parse(examples[4]),
    current = currentnessSchema.parse(examples[5]),
    withdrawn = withdrawnSchema.parse(examples[6]);
  return {
    first,
    correction: releaseSchema.parse({
      ...first,
      assessmentRevisionId: 'assessment_revision_2',
      releaseVersion: 2,
      releasedAt: '2026-11-07T01:00:00.000Z',
    }),
    superseded: releaseSchema.parse({ ...first, state: 'superseded' }),
    historicalWithdrawal: withdrawn,
    currentAfterHistoricalWithdrawal: currentnessSchema.parse({
      ...current,
      availabilityRevision: 3,
      currentReleaseVersion: 2,
      withdrawnReleaseVersions: [1],
    }),
    currentWithdrawal: withdrawnSchema.parse({
      ...withdrawn,
      releaseVersion: 2,
    }),
    noCurrent: currentnessSchema.parse({
      ...current,
      availabilityRevision: 4,
      currentReleaseVersion: null,
      withdrawnReleaseVersions: [1, 2],
    }),
  };
}
