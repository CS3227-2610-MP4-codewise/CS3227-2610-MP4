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
