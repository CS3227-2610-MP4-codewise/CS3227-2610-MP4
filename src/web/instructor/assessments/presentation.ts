import { excerpt } from '../../../shared/instructor-contracts/schema';
import type { DraftFeedback } from '../../../shared/instructor-contracts/assessment';
import type { Workspace } from './client';

/** Attach an observation only to the exact pinned answer and rubric evidence. */
export function observationMatches(
  note: DraftFeedback['annotations'][number],
  workspace: Workspace,
): boolean {
  const answer = workspace.attempt.answers.find(
    (item) => item.submittedAnswerId === note.submittedAnswerId,
  );
  const question = workspace.publication.questions.find(
    (item) => item.questionVersionId === note.questionVersionId,
  );
  if (
    !answer ||
    !question ||
    answer.questionVersionId !== note.questionVersionId ||
    answer.rubricVersionId !== note.rubricVersionId ||
    question.rubricVersionId !== note.rubricVersionId ||
    !question.criteria.some((item) => item.criterionId === note.criterionId)
  )
    return false;
  try {
    return (
      excerpt(answer.source, note.startLine, note.endLine) === note.excerpt
    );
  } catch {
    return false;
  }
}

/** Describe the displayed revision, never infer privacy from the editor route. */
export function feedbackVisibility(
  revisionId: string,
  currentVersion: number | null,
  releases: readonly {
    revisionId: string;
    version: number;
    withdrawnAt: string | null;
  }[],
  historical = false,
) {
  const release = releases.find((item) => item.revisionId === revisionId);
  if (release)
    return `${release.withdrawnAt ? 'Withdrawn' : release.version === currentVersion ? 'Released' : 'Superseded'} · Feedback version ${release.version}`;
  return historical
    ? 'Historical draft · Private'
    : 'Saved · Private until released';
}
