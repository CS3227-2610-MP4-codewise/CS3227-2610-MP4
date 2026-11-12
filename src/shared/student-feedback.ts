import {
  schema,
  object,
  literal,
  oneOf,
  integer,
  array,
  assert,
  unique,
  type Infer,
} from './instructor-contracts/schema';
import {
  releaseSchema,
  withdrawnSchema,
  currentnessSchema,
  assertCurrentRelease,
  type Currentness,
  type Release,
  type Withdrawn,
} from './instructor-contracts/release';

/**
 * SF-01, SF-02, SF-05, SF-07: closed schemaVersion 1 student feedback shapes. They wrap Darryl's
 * C-REL projections (`releaseSchema`, `withdrawnSchema`, `currentnessSchema`) unchanged and never
 * re-declare their fields. Parsing validates shape only, never authority.
 */
export const MAX_FEEDBACK_VERSIONS = 1000;

export type FeedbackVersionState = 'released' | 'superseded' | 'withdrawn';

/**
 * The state of each released version, read from the producer's currentness projection: withdrawn
 * when listed as withdrawn, released when it is the current version, otherwise superseded. This is
 * the same rule the producer applies when it projects a single version.
 */
export function versionState(
  currentness: Currentness,
  releaseVersion: number,
): FeedbackVersionState {
  if (currentness.withdrawnReleaseVersions.includes(releaseVersion))
    return 'withdrawn';
  return currentness.currentReleaseVersion === releaseVersion
    ? 'released'
    : 'superseded';
}

const versionEntry = (v: unknown, p: string) => {
  const o = object(v, ['releaseVersion', 'state'], p);
  return {
    releaseVersion: integer(o.releaseVersion, p + '.releaseVersion'),
    state: oneOf(
      o.state,
      ['released', 'superseded', 'withdrawn'] as const,
      p + '.state',
    ),
  };
};

export const feedbackSummarySchema = schema((v) => {
  assert(
    v !== null && typeof v === 'object' && !Array.isArray(v),
    '$',
    'object',
  );
  const state = oneOf(
    (v as Record<string, unknown>).state,
    ['none', 'released', 'withdrawn'] as const,
    '$.state',
  );
  if (state === 'none') {
    const o = object(v, ['schemaVersion', 'state']);
    return {
      schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
      state,
    } as const;
  }
  const o = object(
    v,
    ['schemaVersion', 'state', 'currentness', 'versions'],
    '$',
    state === 'released' ? ['release'] : [],
  );
  const currentness = currentnessSchema.parse(o.currentness);
  const versions = array(
    o.versions,
    versionEntry,
    '$.versions',
    1,
    MAX_FEEDBACK_VERSIONS,
  );
  unique(
    versions.map((x) => x.releaseVersion),
    '$.versions',
  );
  for (let i = 1; i < versions.length; i++)
    assert(
      versions[i - 1].releaseVersion > versions[i].releaseVersion,
      '$.versions',
      'order',
    );
  for (const x of versions)
    assert(
      x.state === versionState(currentness, x.releaseVersion),
      '$.versions',
      'state',
    );
  for (const w of currentness.withdrawnReleaseVersions)
    assert(
      versions.some((x) => x.releaseVersion === w),
      '$.versions',
      'withdrawn_missing',
    );
  if (state === 'withdrawn') {
    assert(
      currentness.currentReleaseVersion === null,
      '$.currentness',
      'withdrawn_current',
    );
    return {
      schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
      state,
      currentness,
      versions,
    } as const;
  }
  assert(o.release !== undefined, '$.release', 'required');
  // SF-02: displayed as current only when it is the same assessment and attempt's current version.
  const release = assertCurrentRelease(o.release, currentness);
  assert(
    versions.some(
      (x) =>
        x.releaseVersion === release.releaseVersion && x.state === 'released',
    ),
    '$.versions',
    'current_missing',
  );
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    state,
    currentness,
    versions,
    release,
  } as const;
});
export type FeedbackSummary = Infer<typeof feedbackSummarySchema>;

/** One exact version: a released or superseded release, or a withdrawn tombstone. */
export const feedbackVersionSchema = schema<Release | Withdrawn>((v) => {
  assert(
    v !== null && typeof v === 'object' && !Array.isArray(v),
    '$',
    'object',
  );
  return (v as Record<string, unknown>).state === 'withdrawn'
    ? withdrawnSchema.parse(v)
    : releaseSchema.parse(v);
});

/** SF-07: the history-row marker. A strict boolean; any other value is a contract error. */
export function feedbackReleasedFlag(v: unknown, p: string): boolean {
  assert(typeof v === 'boolean', p, 'boolean');
  return v as boolean;
}
