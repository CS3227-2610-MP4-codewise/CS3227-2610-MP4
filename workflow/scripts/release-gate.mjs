/** Bind a production deployment to the staging artifact from this exact run. */
export function assertReleaseArtifact(manifest, { sha, runId, latestMainSha }) {
  if (!/^[0-9a-f]{40}$/.test(sha ?? ''))
    throw new Error('Release requires an exact Git commit.');
  if (!/^[0-9]+$/.test(runId ?? ''))
    throw new Error('Release requires the current workflow run ID.');
  if (!manifest || manifest.sha !== sha || manifest.runId !== runId) {
    throw new Error(
      'Artifact must match the commit and run that passed staging.',
    );
  }
  if (latestMainSha !== sha) {
    throw new Error(
      'Main has changed since staging; cancel this run and test the newer release.',
    );
  }
  return sha;
}
