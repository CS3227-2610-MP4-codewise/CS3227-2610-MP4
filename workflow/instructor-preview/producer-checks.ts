import { publicationSchema } from '../../src/shared/instructor-contracts/publication';
import { assert } from '../../src/shared/instructor-contracts/schema';
/** Reusable consumer admission check. Schema validation does not grant access. */
export function verifyPublicationProducer(
  value: unknown,
  expectedVersionId: string,
) {
  const publication = publicationSchema.parse(value);
  assert(
    publication.assignmentVersionId === expectedVersionId,
    '$.assignmentVersionId',
    'version_mismatch',
  );
  return publication;
}
