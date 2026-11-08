import {
  schema,
  object,
  literal,
  id,
  integer,
  oneOf,
  text,
  array,
  unique,
  assert,
  errorCodes,
  type Infer,
  type Schema,
} from './schema';
import {
  criterionFeedback,
  annotation,
  validateFeedbackElements,
} from './release';
export const actions = ['assessment-draft', 'progress-explanation'] as const;
export type AIAction = (typeof actions)[number];
const baseKeys = [
  'schemaVersion',
  'action',
  'courseId',
  'idempotencyKey',
  'evidenceRefs',
  'outputTokenLimit',
];
function decodeRequest(v: unknown) {
  const o = object(v, baseKeys, '$', ['includePrivateReferences']);
  const common = {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    courseId: id(o.courseId, '$.courseId'),
    idempotencyKey: id(o.idempotencyKey, '$.idempotencyKey'),
    outputTokenLimit: integer(o.outputTokenLimit, '$.outputTokenLimit'),
  };
  const action = oneOf(o.action, actions, '$.action');
  if (action === 'assessment-draft') {
    assert(
      o.includePrivateReferences === undefined ||
        typeof o.includePrivateReferences === 'boolean',
      '$.includePrivateReferences',
      'boolean',
    );
    const evidenceRefs = array(
      o.evidenceRefs,
      (v, p) => {
        const r = object(v, ['kind', 'attemptId'], p);
        return {
          kind: literal(r.kind, 'submission', p + '.kind'),
          attemptId: id(r.attemptId, p + '.attemptId'),
        };
      },
      '$.evidenceRefs',
      1,
      1,
    );
    return {
      ...common,
      action,
      evidenceRefs,
      ...(o.includePrivateReferences === undefined
        ? {}
        : { includePrivateReferences: o.includePrivateReferences as boolean }),
    };
  }
  assert(
    o.includePrivateReferences === undefined,
    '$.includePrivateReferences',
  );
  const evidenceRefs = array(
    o.evidenceRefs,
    (v, p) => {
      const r = object(v, ['kind', 'assessmentId', 'releaseVersion'], p);
      return {
        kind: literal(r.kind, 'release', p + '.kind'),
        assessmentId: id(r.assessmentId, p + '.assessmentId'),
        releaseVersion: integer(r.releaseVersion, p + '.releaseVersion'),
      };
    },
    '$.evidenceRefs',
    1,
    20,
  );
  unique(
    evidenceRefs.map((r) => JSON.stringify([r.assessmentId, r.releaseVersion])),
    '$.evidenceRefs',
  );
  return { ...common, action, evidenceRefs };
}
export const aiRequestSchema = schema(decodeRequest);
export type AIRequest = Infer<typeof aiRequestSchema>;
export type AIRequestInput<A extends AIAction> = Extract<
  AIRequest,
  { action: A }
>;
export const usageSchema = schema((v) => {
  assert(
    v !== null && typeof v === 'object' && !Array.isArray(v),
    '$.usage',
    'object',
  );
  if ((v as Record<string, unknown>).status === 'unavailable') {
    const o = object(v, ['status'], '$.usage');
    return { status: literal(o.status, 'unavailable', '$.usage.status') };
  }
  const o = object(v, ['status', 'inputTokens', 'outputTokens'], '$.usage');
  return {
    status: literal(o.status, 'reported', '$.usage.status'),
    inputTokens: integer(o.inputTokens, '$.usage.inputTokens', 0),
    outputTokens: integer(o.outputTokens, '$.usage.outputTokens', 0),
  };
});
export const assessmentDraftSchema = schema((v) => {
  const o = object(v, [
    'kind',
    'codeExecuted',
    'criteria',
    'annotations',
    'reviewFlags',
  ]);
  return {
    kind: literal(o.kind, 'assessment-draft', '$.kind'),
    codeExecuted: literal(o.codeExecuted, false, '$.codeExecuted'),
    criteria: array(o.criteria, criterionFeedback, '$.criteria', 1, 1000),
    annotations: array(o.annotations, annotation, '$.annotations'),
    reviewFlags: array(
      o.reviewFlags,
      (v, p) => {
        const s = text(v, p, 800);
        assert(Array.from(s).length <= 200, p, 'length');
        return s;
      },
      '$.reviewFlags',
      0,
      20,
    ),
  };
});
export type AssessmentDraft = Infer<typeof assessmentDraftSchema>;
export async function validateAssessmentDraft(
  v: unknown,
  published: unknown,
  attempt: unknown,
): Promise<AssessmentDraft> {
  const d = assessmentDraftSchema.parse(v);
  await validateFeedbackElements(d.criteria, d.annotations, published, attempt);
  return d;
}
export function gatewayOutcomeSchema<A extends AIAction, T>(
  action: A,
  payloadSchema?: Schema<T>,
) {
  return schema((v) => {
    assert(
      v !== null && typeof v === 'object' && !Array.isArray(v),
      '$',
      'object',
    );
    const candidate = v as Record<string, unknown>;
    const status = oneOf(
      candidate.status,
      ['pending', 'running', 'succeeded', 'failed', 'expired'] as const,
      '$.status',
    );
    const keys = [
      'schemaVersion',
      'requestId',
      'action',
      'evidenceKey',
      'status',
    ];
    const extra =
      status === 'succeeded'
        ? [
            'promptVersion',
            'modelVersion',
            'latencyMs',
            'retries',
            'usage',
            'payload',
          ]
        : status === 'failed' || status === 'expired'
          ? ['safeCode']
          : [];
    const o = object(
      v,
      [...keys, ...extra],
      '$',
      status === 'failed' || status === 'expired' ? ['retryAfterSeconds'] : [],
    );
    const common = {
      schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
      requestId: id(o.requestId, '$.requestId'),
      action: literal(o.action, action, '$.action'),
      evidenceKey: id(o.evidenceKey, '$.evidenceKey'),
    };
    if (status === 'succeeded') {
      assert(payloadSchema, '$.payload', 'validator_required');
      assert(
        typeof o.latencyMs === 'number' &&
          Number.isFinite(o.latencyMs) &&
          o.latencyMs >= 0,
        '$.latencyMs',
        'latency',
      );
      const checkedPayload = payloadSchema.parse(o.payload);
      assert(
        checkedPayload !== null &&
          typeof checkedPayload === 'object' &&
          'kind' in checkedPayload &&
          checkedPayload.kind === action,
        '$.payload.kind',
        'action_mismatch',
      );
      return {
        ...common,
        status,
        promptVersion: id(o.promptVersion, '$.promptVersion'),
        modelVersion: id(o.modelVersion, '$.modelVersion'),
        latencyMs: o.latencyMs,
        retries: integer(o.retries, '$.retries', 0, 2),
        usage: usageSchema.parse(o.usage),
        payload: checkedPayload,
      };
    }
    if (status === 'failed' || status === 'expired')
      return {
        ...common,
        status,
        safeCode: oneOf(o.safeCode, errorCodes, '$.safeCode'),
        ...(o.retryAfterSeconds === undefined
          ? {}
          : {
              retryAfterSeconds: integer(
                o.retryAfterSeconds,
                '$.retryAfterSeconds',
                0,
              ),
            }),
      };
    return { ...common, status };
  });
}
export type GatewayOutcome<A extends AIAction, T> = Infer<
  ReturnType<typeof gatewayOutcomeSchema<A, T>>
>;
export const publicAIStatusSchema = schema((v) => {
  const o = object(v, ['schemaVersion', 'requestId', 'status'], '$', [
    'safeCode',
    'retryAfterSeconds',
  ]);
  const status = oneOf(
    o.status,
    ['pending', 'running', 'succeeded', 'failed', 'expired'] as const,
    '$.status',
  );
  if (status !== 'failed' && status !== 'expired')
    assert(
      o.safeCode === undefined && o.retryAfterSeconds === undefined,
      '$',
      'status_fields',
    );
  if (status === 'failed' || status === 'expired')
    assert(o.safeCode !== undefined, '$.safeCode', 'required');
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    requestId: id(o.requestId, '$.requestId'),
    status,
    ...(o.safeCode === undefined
      ? {}
      : { safeCode: oneOf(o.safeCode, errorCodes, '$.safeCode') }),
    ...(o.retryAfterSeconds === undefined
      ? {}
      : {
          retryAfterSeconds: integer(
            o.retryAfterSeconds,
            '$.retryAfterSeconds',
            0,
          ),
        }),
  };
});
export function projectAIStatus<A extends AIAction, T>(
  value: GatewayOutcome<A, T>,
) {
  // Caller must authorize; projection does not grant access.
  return publicAIStatusSchema.parse({
    schemaVersion: value.schemaVersion,
    requestId: value.requestId,
    status: value.status,
    ...('safeCode' in value ? { safeCode: value.safeCode } : {}),
    ...('retryAfterSeconds' in value
      ? { retryAfterSeconds: value.retryAfterSeconds }
      : {}),
  });
}
