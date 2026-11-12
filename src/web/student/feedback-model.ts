import type { Attempt } from '../../shared/instructor-contracts/submission';
import type { Release } from '../../shared/instructor-contracts/release';
import type { FeedbackSummary } from '../../shared/student-feedback';
import { ApiError } from './work-model';

/**
 * SF-04, SF-06, UI-06/08 (design D4): pure client model for released feedback. Annotations are
 * matched only against the attempt the student already holds, never against the working copy or
 * another attempt. Nothing here caches feedback; the view fetches on every mount.
 */

type Annotation = Release['annotations'][number];
export type MatchedAnnotation = {
  /** Position in the release's annotation list; stable key for selection. */
  index: number;
  /** Visible, non-colour marker: A, B, … Z, AA, AB, … */
  marker: string;
  annotation: Annotation;
};
export type AnnotationMatch = {
  matched: MatchedAnnotation[];
  unavailable: { index: number; annotation: Annotation }[];
};

/** Logical source lines. K4 sources keep a final LF, which does not start another line. */
export function sourceLines(source: string): string[] {
  const lines = source.split('\n');
  if (lines.length > 1 && lines.at(-1) === '') lines.pop();
  return lines;
}

export function markerFor(n: number): string {
  let s = '';
  for (let i = n + 1; i > 0; i = Math.floor((i - 1) / 26))
    s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}

/**
 * SF-04: an annotation is shown on source only when it names an answer of this attempt with the
 * same question and rubric version, its range lies within that answer's logical lines and its
 * excerpt equals those lines exactly. Anything else is unavailable evidence and marks no line.
 */
export function matchAnnotations(
  annotations: readonly Annotation[],
  attempt: Attempt,
): AnnotationMatch {
  const out: AnnotationMatch = { matched: [], unavailable: [] };
  annotations.forEach((annotation, index) => {
    const answer = attempt.answers.find(
      (a) => a.submittedAnswerId === annotation.submittedAnswerId,
    );
    const { startLine: start, endLine: end } = annotation;
    let ok =
      !!answer &&
      answer.questionVersionId === annotation.questionVersionId &&
      answer.rubricVersionId === annotation.rubricVersionId &&
      Number.isSafeInteger(start) &&
      Number.isSafeInteger(end) &&
      start >= 1 &&
      start <= end;
    if (ok) {
      const lines = sourceLines(answer!.source);
      ok =
        end <= lines.length &&
        lines.slice(start - 1, end).join('\n') === annotation.excerpt;
    }
    if (ok)
      out.matched.push({
        index,
        marker: markerFor(out.matched.length),
        annotation,
      });
    else out.unavailable.push({ index, annotation });
  });
  return out;
}

export type FeedbackPanelState =
  | { kind: 'loading' }
  | { kind: 'none' }
  | {
      kind: 'released';
      summary: Extract<FeedbackSummary, { state: 'released' }>;
    }
  | {
      kind: 'withdrawn';
      summary: Extract<FeedbackSummary, { state: 'withdrawn' }>;
    }
  | { kind: 'stale' }
  | { kind: 'expired' }
  | { kind: 'network' }
  | { kind: 'unavailable' };

export type FeedbackEvent =
  | { type: 'load' }
  | { type: 'loaded'; summary: FeedbackSummary }
  | { type: 'failed'; error: unknown };

/** SF-06: one distinct state per outcome. A failure never keeps earlier feedback on screen. */
export function feedbackReducer(
  _state: FeedbackPanelState,
  event: FeedbackEvent,
): FeedbackPanelState {
  if (event.type === 'load') return { kind: 'loading' };
  if (event.type === 'loaded') {
    const s = event.summary;
    if (s.state === 'none') return { kind: 'none' };
    return s.state === 'released'
      ? { kind: 'released', summary: s }
      : { kind: 'withdrawn', summary: s };
  }
  const e = event.error;
  if (!(e instanceof ApiError)) return { kind: 'network' };
  if (e.kind === 'session') return { kind: 'expired' };
  if (e.kind === 'stale') return { kind: 'stale' };
  if (e.kind === 'service' || e.kind === 'unavailable' || e.kind === 'invalid')
    return { kind: 'unavailable' };
  return { kind: 'network' };
}
