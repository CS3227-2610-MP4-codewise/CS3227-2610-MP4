import { createApplication } from '../../src/server/index';
import { localSamples } from './samples';
import { SecureAIGateway } from '../../src/server/ai/gateway';
import { GatewayStore } from '../../src/server/ai/store';
import type { AssessmentGatewayFactory } from '../../src/server/instructor/assessments/workflow';
export const syntheticAssessmentGateway =
  (db: D1Database): AssessmentGatewayFactory =>
  (resolve) =>
    new SecureAIGateway(new GatewayStore(db), {
      action: 'assessment-draft',
      resolve,
      profile: {
        verified: true,
        model: 'synthetic-preview',
        allowedModels: ['synthetic-preview'],
        promptVersion: 'synthetic-v1',
        outputTokenLimit: 512,
        inputTokenReservation: 1024,
        maxInputBytes: 100000,
      deadlineMs: 60000,
        cacheMs: 0,
      },
      limits: {
        userRequestLimit: 20,
        providerRequestLimit: 20,
        userTokenLimit: 40000,
        providerTokenLimit: 40000,
        concurrencyLimit: 2,
        windowMs: 60000,
      },
      secrets: { SOCLAAS_INSTRUCTOR_API_KEY: 'synthetic-preview-only' },
      transport: async ({ user }) => {
        const context = JSON.parse(user) as {
          questions: Array<{
            questionVersionId: string;
            rubricVersionId: string;
            criteria: Array<{
              criterionId: string;
              comparisonKey: string;
              minimumScore: number;
              maximumScore: number;
            }>;
          }>;
        };
        return {
          payload: {
            kind: 'assessment-draft',
            codeExecuted: false,
            criteria: context.questions.flatMap((q) =>
              q.criteria.map((c) => ({
                questionVersionId: q.questionVersionId,
                rubricVersionId: q.rubricVersionId,
                criterionId: c.criterionId,
                comparisonKey: c.comparisonKey,
                minimumScore: c.minimumScore,
                maximumScore: c.maximumScore,
                score: c.minimumScore,
                explanation:
                  'Synthetic preview only. Instructor review is required.',
              })),
            ),
            annotations: [],
            reviewFlags: [
              'Synthetic preview: no model or code execution was used.',
            ],
          },
          usage: { status: 'unavailable' },
        };
      },
    });
/** Explicit development entry; normal Worker does not import a sample producer. */
export default createApplication({
  localSubmissions: ({ assignments, request }) =>
    localSamples(assignments, request),
  localAssessmentGateway: syntheticAssessmentGateway,
});
