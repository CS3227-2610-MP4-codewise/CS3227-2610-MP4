import {
  schema,
  object,
  literal,
  oneOf,
  id,
  integer,
  text,
  title,
  timestamp,
  array,
  unique,
  assert,
  fail,
  type Infer,
} from './instructor-contracts/schema';

/**
 * student-progress SP-03, SP-06, SP-07, SP-10: closed progress shapes and the domain validator.
 * The model only ever sees opaque labels (`R1…R8` releases, `K1…Kn` comparison keys); the server
 * owns the mapping back to real assessment IDs and comparison keys (design D3/D4/D9).
 */
export const MAX_PROGRESS_RELEASES = 8;
/** SP-03 (Keith, 2026-11-13): every explanation summarises the newest 3 released assignments. */
export const RECENT_PROGRESS_RELEASES = 3;
export const PROGRESS_ATTEMPT_WINDOW = 50;
export const MAX_PROGRESS_REQUEST_BYTES = 512;

/** One selected release, oldest first in the context (`R1` is the oldest). */
export type ProgressRelease = {
  ref: string;
  assessmentId: string;
  releaseVersion: number;
  releasedAt: string;
  attemptId: string;
  assignmentId: string;
  publicationId: string;
  title: string;
};

/**
 * One criterion name (comparison key) with its normalized score in each selected release that
 * has it, in release order. It is comparable when at least two releases have it.
 */
export type ProgressKey = {
  key: string;
  comparisonKey: string;
  scores: { ref: string; normalized: number }[];
};

export type ProgressContext = {
  releases: ProgressRelease[];
  /** Keys in the recent releases plus every comparable key. */
  keys: ProgressKey[];
  /** The newest RECENT_PROGRESS_RELEASES refs, oldest first. */
  recent: string[];
  /** SP-06: every criterion of every selected release is at its maximum. */
  allFullMarks: boolean;
};

export const isComparable = (k: ProgressKey) => k.scores.length >= 2;

export type Trend = 'rising' | 'flat' | 'falling';

/** SP-03: per-key normalized scores across releases (every key; callers decide comparability). */
export function keyScores(
  releases: readonly {
    ref: string;
    criteria: readonly {
      comparisonKey: string;
      minimumScore: number;
      maximumScore: number;
      score: number;
    }[];
  }[],
): { comparisonKey: string; scores: { ref: string; normalized: number }[] }[] {
  const byKey = new Map<string, Map<string, number[]>>();
  for (const r of releases)
    for (const c of r.criteria) {
      const perRef = byKey.get(c.comparisonKey) ?? new Map<string, number[]>();
      byKey.set(c.comparisonKey, perRef);
      const list = perRef.get(r.ref) ?? [];
      list.push((c.score - c.minimumScore) / (c.maximumScore - c.minimumScore));
      perRef.set(r.ref, list);
    }
  const out: {
    comparisonKey: string;
    scores: { ref: string; normalized: number }[];
  }[] = [];
  for (const [comparisonKey, perRef] of [...byKey].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const scores = releases
      .filter((r) => perRef.has(r.ref))
      .map((r) => {
        const values = perRef.get(r.ref)!;
        return {
          ref: r.ref,
          normalized: values.reduce((s, v) => s + v, 0) / values.length,
        };
      });
    out.push({ comparisonKey, scores });
  }
  return out;
}

export function trendOf(scores: readonly { normalized: number }[]): Trend {
  const first = scores[0].normalized,
    last = scores[scores.length - 1].normalized;
  return last > first ? 'rising' : last < first ? 'falling' : 'flat';
}

const keyLabel = (k: ProgressKey) =>
  Array.from(k.comparisonKey).slice(0, 64).join('');

/** SP-10, D9: server-computed facts; the only claims the model may word. */
export function progressFacts(context: ProgressContext) {
  return {
    allFullMarks: context.allFullMarks,
    recent: context.recent.map((ref) => ({
      ref,
      criteria: context.keys.flatMap((k) => {
        const s = k.scores.find((x) => x.ref === ref);
        return s
          ? [
              {
                key: k.key,
                label: keyLabel(k),
                atMaximum: s.normalized >= 1,
                earnedCredit: s.normalized > 0,
              },
            ]
          : [];
      }),
    })),
    progress: context.keys.filter(isComparable).map((k) => ({
      key: k.key,
      label: keyLabel(k),
      trend: trendOf(k.scores),
      belowMaximumIn: k.scores
        .filter((s) => s.normalized < 1)
        .map((s) => s.ref),
      refs: k.scores.map((s) => s.ref),
    })),
  };
}

const label = (prefix: 'R' | 'K') => (v: unknown, p: string) => {
  const s = text(v, p, 8);
  assert(new RegExp(`^${prefix}[1-9][0-9]?$`).test(s), p, 'label');
  return s;
};

const URL_LIKE =
  /(https?:\/\/|ftp:\/\/|www\.|mailto:|\b[\w.-]+@[\w-]+\.[a-z]{2,}|\b[a-z0-9-]+\.(com|org|net|io|ai|dev|app|sg|edu|gov|ly|co)\b)/i;
// Code canary (D9). Programming feedback says "return" and "import" in prose, so only code-shaped
// uses count: `return` followed by a call or operator, or a statement starting with `import`
// (local review 2026-11-13: "should return the sum" was wrongly rejected).
const CODE_LIKE =
  /(```|`[^`]*[(){};=][^`]*`|\bdef\s+\w+\s*\(|^\s*import\s+\w+|\bfrom\s+\w+\s+import\b|\bclass\s+\w+\s*[:(]|\blambda\b|\breturn\s+[\w.]+\s*[([+\-*/%]|\bprint\s*\(|\w\s=\s|[{};]\s*$)/;
const SCORE_LIKE =
  /(\d+(\.\d+)?\s*(\/\s*\d|out of\b|%|percent\b|marks?\b|points?\b|pts\b)|\b(grade|score|mark)[sd]?\s*(of|is|was|=|:)\s*\d)/i;
const OVERRIDE_LIKE =
  /(ignore\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)|disregard\s+(all\s+|the\s+)?(previous|prior|above|instructions)|system\s+prompt|you\s+are\s+now|new\s+instructions|developer\s+mode|jailbreak)/i;

/** SP-06, SP-10, D9 text canaries: one line, no links, code, scores or override phrases. */
/** R/K labels written into prose; the validator checks them and the server renames them. */
export const PROSE_LABEL = /\b([RK])([1-9][0-9]?)\b/g;

export function progressText(v: unknown, p: string, max: number): string {
  const s = text(v, p, max * 4);
  assert(Array.from(s).length <= max, p, 'length');
  assert(s.trim().length > 0, p, 'blank');
  assert(
    !Array.from(s).some((ch) => {
      const c = ch.codePointAt(0)!;
      return c < 32 || (c >= 127 && c <= 159) || c === 0x2028 || c === 0x2029;
    }),
    p,
    'control',
  );
  assert(!/[<>]/.test(s), p, 'markup');
  assert(!URL_LIKE.test(s), p, 'url');
  assert(!CODE_LIKE.test(s), p, 'code');
  assert(!SCORE_LIKE.test(s), p, 'score');
  assert(!OVERRIDE_LIKE.test(s), p, 'override');
  return s;
}

function evidence(v: unknown, p: string, min: number) {
  const refs = array(v, label('R'), p, min, MAX_PROGRESS_RELEASES);
  unique(refs, p);
  return refs;
}

const observation = (v: unknown, p: string) => {
  const o = object(v, ['key', 'summary', 'evidence'], p);
  return {
    key: label('K')(o.key, p + '.key'),
    summary: progressText(o.summary, p + '.summary', 400),
    evidence: evidence(o.evidence, p + '.evidence', 2),
  };
};

const point = (v: unknown, p: string) => {
  const o = object(v, ['key', 'text'], p);
  return {
    key: label('K')(o.key, p + '.key'),
    text: progressText(o.text, p + '.text', 300),
  };
};

const recentAssignment = (v: unknown, p: string) => {
  const o = object(v, ['evidence', 'strengths', 'focus'], p);
  return {
    evidence: label('R')(o.evidence, p + '.evidence'),
    strengths: array(o.strengths, point, p + '.strengths', 0, 3),
    focus: array(o.focus, point, p + '.focus', 0, 3),
  };
};

/** SP-06: the closed model payload. No score, grade or total field can exist. */
export const progressExplanationSchema = schema((v) => {
  const o = object(v, [
    'kind',
    'recentAssignments',
    'recurringIssues',
    'improvements',
    'suggestions',
    'limitations',
  ]);
  return {
    kind: literal(o.kind, 'progress-explanation', '$.kind'),
    recentAssignments: array(
      o.recentAssignments,
      recentAssignment,
      '$.recentAssignments',
      1,
      RECENT_PROGRESS_RELEASES,
    ),
    recurringIssues: array(
      o.recurringIssues,
      observation,
      '$.recurringIssues',
      0,
      5,
    ),
    improvements: array(o.improvements, observation, '$.improvements', 0, 5),
    suggestions: array(
      o.suggestions,
      (v, p) => {
        const s = object(v, ['text', 'evidence'], p);
        return {
          text: progressText(s.text, p + '.text', 300),
          evidence: evidence(s.evidence, p + '.evidence', 1),
        };
      },
      '$.suggestions',
      0,
      5,
    ),
    limitations: array(
      o.limitations,
      (v, p) => progressText(v, p, 300),
      '$.limitations',
      0,
      3,
    ),
  };
});
export type ProgressExplanation = Infer<typeof progressExplanationSchema>;

/**
 * SP-06, SP-07, SP-10: semantic checks against the server facts. Every label must exist in this
 * context. The recent summary covers exactly the recent releases, once each; a strength needs
 * earned credit and a focus point needs a score below the maximum, on a criterion that release
 * has. A progress observation's key must be comparable and present in every cited release; a
 * recurring issue needs every cited release below the maximum; an improvement needs the newest
 * cited score above the oldest. Throws ContractError on any failure; the gateway turns that into
 * a failed outcome.
 */
/** Replaces known labels in prose with the assignment title or criterion name (display only). */
export function renameLabels(text: string, context: ProgressContext): string {
  const titles = new Map(context.releases.map((r) => [r.ref, r.title]));
  const names = new Map(context.keys.map((k) => [k.key, k.comparisonKey]));
  return text.replace(PROSE_LABEL, (label, kind: string) => {
    const name = kind === 'R' ? titles.get(label) : names.get(label);
    return name === undefined ? label : `“${name}”`;
  });
}

export async function validateProgressExplanation(
  payload: unknown,
  context: ProgressContext,
): Promise<ProgressExplanation> {
  const out = progressExplanationSchema.parse(payload);
  const order = new Map(context.releases.map((r, i) => [r.ref, i]));
  const keys = new Map(context.keys.map((k) => [k.key, k]));
  const known = (ref: string, p: string) =>
    assert(order.has(ref), p, 'unknown_ref');
  const scored = (key: string, refs: string[], p: string) => {
    const k = keys.get(key);
    if (!k) fail(p + '.key', 'unknown_key');
    return refs.map((ref, i) => {
      known(ref, `${p}.evidence[${i}]`);
      const s = k.scores.find((x) => x.ref === ref);
      if (!s) fail(`${p}.evidence[${i}]`, 'key_not_in_release');
      return s;
    });
  };
  // SP-03/SP-06: every recent assignment is summarised exactly once.
  const covered = out.recentAssignments.map((r) => r.evidence);
  unique(covered, '$.recentAssignments');
  assert(
    covered.length === context.recent.length &&
      covered.every((ref) => context.recent.includes(ref)),
    '$.recentAssignments',
    'coverage',
  );
  // Local review 2026-11-13: the model still writes labels into prose despite the prompt. Known
  // labels are accepted and renamed for display (server `explained`); unknown ones are rejected.
  const prose: [string, string][] = [
    ...out.recentAssignments.flatMap((r, i) => [
      ...r.strengths.map((x, j): [string, string] => [
        x.text,
        `$.recentAssignments[${i}].strengths[${j}].text`,
      ]),
      ...r.focus.map((x, j): [string, string] => [
        x.text,
        `$.recentAssignments[${i}].focus[${j}].text`,
      ]),
    ]),
    ...out.recurringIssues.map((o, i): [string, string] => [
      o.summary,
      `$.recurringIssues[${i}].summary`,
    ]),
    ...out.improvements.map((o, i): [string, string] => [
      o.summary,
      `$.improvements[${i}].summary`,
    ]),
    ...out.suggestions.map((o, i): [string, string] => [
      o.text,
      `$.suggestions[${i}].text`,
    ]),
    ...out.limitations.map((t, i): [string, string] => [
      t,
      `$.limitations[${i}]`,
    ]),
  ];
  for (const [t, p] of prose)
    for (const m of t.matchAll(PROSE_LABEL))
      assert(
        m[1] === 'R' ? order.has(m[0]) : keys.has(m[0]),
        p,
        'unknown_label',
      );
  out.recentAssignments.forEach((r, i) => {
    const p = `$.recentAssignments[${i}]`;
    assert(r.strengths.length + r.focus.length > 0, p, 'empty');
    const scoreIn = (key: string, q: string) => {
      const k = keys.get(key);
      if (!k) fail(q, 'unknown_key');
      const s = k.scores.find((x) => x.ref === r.evidence);
      if (!s) fail(q, 'key_not_in_release');
      return s.normalized;
    };
    r.strengths.forEach((x, j) =>
      assert(
        scoreIn(x.key, `${p}.strengths[${j}].key`) > 0,
        `${p}.strengths[${j}]`,
        'no_credit',
      ),
    );
    r.focus.forEach((x, j) =>
      assert(
        scoreIn(x.key, `${p}.focus[${j}].key`) < 1,
        `${p}.focus[${j}]`,
        'at_maximum',
      ),
    );
  });
  const comparable = (key: string, p: string) => {
    const k = keys.get(key);
    assert(k !== undefined && isComparable(k), p + '.key', 'not_comparable');
  };
  out.recurringIssues.forEach((o, i) => {
    const p = `$.recurringIssues[${i}]`;
    comparable(o.key, p);
    for (const s of scored(o.key, o.evidence, p))
      assert(s.normalized < 1, p, 'not_recurring');
  });
  out.improvements.forEach((o, i) => {
    const p = `$.improvements[${i}]`;
    comparable(o.key, p);
    const s = scored(o.key, o.evidence, p).sort(
      (a, b) => order.get(a.ref)! - order.get(b.ref)!,
    );
    assert(s[s.length - 1].normalized > s[0].normalized, p, 'not_improved');
  });
  out.suggestions.forEach((s, i) =>
    s.evidence.forEach((ref, j) =>
      known(ref, `$.suggestions[${i}].evidence[${j}]`),
    ),
  );
  unique(
    out.recurringIssues.map((o) => o.key),
    '$.recurringIssues',
  );
  unique(
    out.improvements.map((o) => o.key),
    '$.improvements',
  );
  return out;
}

/** SP-02: the POST body holds only an idempotency key; evidence never comes from the browser. */
export const progressRequestSchema = schema((v) => {
  const o = object(v, ['idempotencyKey']);
  return { idempotencyKey: id(o.idempotencyKey, '$.idempotencyKey') };
});

const evidenceItem = (v: unknown, p: string) => {
  const o = object(
    v,
    [
      'assessmentId',
      'releaseVersion',
      'releasedAt',
      'attemptId',
      'publicationId',
      'title',
    ],
    p,
  );
  return {
    assessmentId: id(o.assessmentId, p + '.assessmentId'),
    releaseVersion: integer(o.releaseVersion, p + '.releaseVersion', 1),
    releasedAt: timestamp(o.releasedAt, p + '.releasedAt'),
    attemptId: id(o.attemptId, p + '.attemptId'),
    publicationId: id(o.publicationId, p + '.publicationId'),
    title: title(o.title, p + '.title'),
  };
};
const citation = (v: unknown, p: string) => {
  const o = object(v, ['assessmentId', 'releaseVersion'], p);
  return {
    assessmentId: id(o.assessmentId, p + '.assessmentId'),
    releaseVersion: integer(o.releaseVersion, p + '.releaseVersion', 1),
  };
};
const viewPoint = (v: unknown, p: string) => {
  const o = object(v, ['comparisonKey', 'text'], p);
  return {
    comparisonKey: id(o.comparisonKey, p + '.comparisonKey'),
    text: text(o.text, p + '.text', 1200),
  };
};
const viewRecent = (v: unknown, p: string) => {
  const o = object(
    v,
    ['assessmentId', 'releaseVersion', 'strengths', 'focus'],
    p,
  );
  return {
    assessmentId: id(o.assessmentId, p + '.assessmentId'),
    releaseVersion: integer(o.releaseVersion, p + '.releaseVersion', 1),
    strengths: array(o.strengths, viewPoint, p + '.strengths', 0, 3),
    focus: array(o.focus, viewPoint, p + '.focus', 0, 3),
  };
};
const viewObservation = (v: unknown, p: string) => {
  const o = object(v, ['comparisonKey', 'summary', 'evidence'], p);
  return {
    comparisonKey: id(o.comparisonKey, p + '.comparisonKey'),
    summary: text(o.summary, p + '.summary', 1600),
    evidence: array(o.evidence, citation, p + '.evidence', 2, 8),
  };
};

/** SP-08, SP-09: the closed GET/POST response. Explanation text appears only when `explained`. */
export const progressViewSchema = schema((v) => {
  assert(
    v !== null && typeof v === 'object' && !Array.isArray(v),
    '$',
    'object',
  );
  const state = oneOf(
    (v as Record<string, unknown>).state,
    ['no-feedback', 'ready', 'stale', 'explained'] as const,
    '$.state',
  );
  const base = [
    'schemaVersion',
    'courseId',
    'aiAvailable',
    'evidence',
    'state',
  ];
  const extra =
    state === 'explained'
      ? ['explanation']
      : state === 'stale'
        ? ['generatedAt']
        : [];
  const o = object(v, [...base, ...extra]);
  assert(typeof o.aiAvailable === 'boolean', '$.aiAvailable', 'boolean');
  const common = {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    courseId: id(o.courseId, '$.courseId'),
    aiAvailable: o.aiAvailable as boolean,
    evidence: array(
      o.evidence,
      evidenceItem,
      '$.evidence',
      0,
      MAX_PROGRESS_RELEASES,
    ),
  };
  if (state === 'no-feedback') return { ...common, state };
  if (state === 'stale')
    return {
      ...common,
      state,
      generatedAt: timestamp(o.generatedAt, '$.generatedAt'),
    };
  if (state === 'ready') return { ...common, state };
  const e = object(
    o.explanation,
    [
      'generatedAt',
      'comparable',
      'allFullMarks',
      'recentAssignments',
      'recurringIssues',
      'improvements',
      'suggestions',
      'limitations',
    ],
    '$.explanation',
  );
  for (const flag of ['comparable', 'allFullMarks'])
    assert(typeof e[flag] === 'boolean', '$.explanation.' + flag, 'boolean');
  return {
    ...common,
    state,
    explanation: {
      generatedAt: timestamp(e.generatedAt, '$.explanation.generatedAt'),
      /** Server facts, never model output: whether any criterion matched, and full marks. */
      comparable: e.comparable as boolean,
      allFullMarks: e.allFullMarks as boolean,
      recentAssignments: array(
        e.recentAssignments,
        viewRecent,
        '$.explanation.recentAssignments',
        1,
        RECENT_PROGRESS_RELEASES,
      ),
      recurringIssues: array(
        e.recurringIssues,
        viewObservation,
        '$.explanation.recurringIssues',
        0,
        5,
      ),
      improvements: array(
        e.improvements,
        viewObservation,
        '$.explanation.improvements',
        0,
        5,
      ),
      suggestions: array(
        e.suggestions,
        (v, p) => {
          const s = object(v, ['text', 'evidence'], p);
          return {
            text: text(s.text, p + '.text', 1200),
            evidence: array(s.evidence, citation, p + '.evidence', 1, 8),
          };
        },
        '$.explanation.suggestions',
        0,
        5,
      ),
      limitations: array(
        e.limitations,
        (v, p) => text(v, p, 1200),
        '$.explanation.limitations',
        0,
        3,
      ),
    },
  };
});
export type ProgressView = Infer<typeof progressViewSchema>;
export type ProgressEvidence = ProgressView['evidence'][number];
