/** Deliberate local-only producer. Never imported by src/server/index.ts. */
import type { SubmissionCatalog } from '../../src/server/instructor/assessments/workflow';
import type { AssignmentService } from '../../src/server/instructor/assignments/service';
import type { TrustedPrincipal } from '../../src/server/instructor/ports/contracts';
import { validateAttempt } from '../../src/shared/instructor-contracts/submission';
import {
  BoundaryError,
  sourceHash,
} from '../../src/shared/instructor-contracts/schema';
export function localSamples(
  assignments: AssignmentService,
  request: Request,
): SubmissionCatalog {
  const version = (attemptId: string) => {
    if (!/^sample_[A-Za-z0-9_-]{1,100}$/.test(attemptId))
      throw new BoundaryError('NOT_FOUND');
    return attemptId.slice(7);
  };
  async function publication(principal: TrustedPrincipal, value: string) {
    const actual = await assignments.session(request);
    if (
      actual.userId !== principal.userId ||
      actual.sessionHandle !== principal.sessionHandle
    )
      throw new BoundaryError('FORBIDDEN');
    return (await assignments.privateVersion(request, value)).publication;
  }
  return {
    sampleMode: true,
    async scope(p, attemptId) {
      return { courseId: (await publication(p, version(attemptId))).courseId };
    },
    async list(p, pub) {
      const current = await publication(p, pub.assignmentVersionId);
      if (!/^[A-Za-z0-9_-]{1,100}$/.test(current.assignmentVersionId))
        throw new BoundaryError('UPSTREAM_UNAVAILABLE');
      return [
        {
          attemptId: 'sample_' + current.assignmentVersionId,
          submittedAt: current.publishedAt,
          label: 'Sample student · Local test submission',
          sample: true,
        },
      ];
    },
    async getAuthorized(p, attemptId) {
      const pub = await publication(p, version(attemptId));
      return validateAttempt(
        {
          schemaVersion: 1,
          attemptId,
          assignmentVersionId: pub.assignmentVersionId,
          courseId: pub.courseId,
          submittedByUserId: 'sample_student',
          submittedAt: pub.publishedAt,
          answers: await Promise.all(
            pub.questions.map(async (q) => {
              const source =
                q.starterCode || '# Local sample submission\npass\n';
              return {
                submittedAnswerId:
                  'sample_answer_' +
                  (
                    await sourceHash(
                      pub.assignmentVersionId + '|' + q.questionVersionId,
                    )
                  ).slice(0, 32),
                questionVersionId: q.questionVersionId,
                rubricVersionId: q.rubricVersionId,
                draftRevision: 1,
                source,
                sourceHash: await sourceHash(source),
              };
            }),
          ),
        },
        pub,
      );
    },
  };
}
