/** Validate GitHub API results before checking out or deploying a staging build. */
export function assertStagingRun(run, repositoryId) {
  if (
    run.repository?.id !== repositoryId ||
    run.head_repository?.id !== repositoryId
  )
    throw new Error('Run must belong to this repository.');
  if (
    run.path !== '.github/workflows/deploy-staging.yml' ||
    run.event !== 'push' ||
    run.head_branch !== 'main'
  ) {
    throw new Error('Release requires the main-branch staging workflow.');
  }
  if (run.status !== 'completed' || run.conclusion !== 'success')
    throw new Error('Staging must have completed successfully.');
  if (!/^[0-9a-f]{40}$/.test(run.head_sha))
    throw new Error('Invalid staged commit.');
  return run.head_sha;
}
