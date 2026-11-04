## ADDED Requirements

### Requirement: OPS-01 Environment isolation
Development, preview, and production SHALL use separate data stores, credentials, and configuration. Preview builds SHALL not receive production secrets or production student data. Production SHALL use HTTPS and restricted deployment credentials.

#### Scenario: Pull request preview
- **WHEN** an untrusted or development branch builds
- **THEN** it cannot read or mutate production data or access production LLM credentials.

### Requirement: OPS-02 Reproducible gated releases
Team-managed CI SHALL validate specs, build, run applicable unit/integration/security checks, scan dependencies and secrets, and gate production deployment on success. Required failures SHALL block release. Schema changes SHALL have a migration and recovery plan.

#### Scenario: Required security check fails
- **WHEN** a release candidate fails a required check
- **THEN** production deployment does not occur and the failure evidence is retained.

### Requirement: OPS-03 Recovery and operational visibility
The system SHALL expose non-sensitive health status, record application failures, and document backup restoration and application rollback. A release SHALL include a restoration rehearsal using synthetic data and measured recovery results.

#### Scenario: Failed migration or deployment
- **WHEN** a release cannot serve critical workflows
- **THEN** operators can follow documented recovery steps without exposing credentials or claiming application rollback reverses database migrations.

### Requirement: OPS-04 Approval in the staging release run
After successful CI, staging deployment and smoke checks on main, the same workflow run SHALL queue production behind required environment approval. Production SHALL use the exact run's staged artifact and commit, reject stale main revisions before migrations, and expose stable test links. Failed staging SHALL not queue production.

#### Scenario: Staging ready for human testing
- **WHEN** staging deployment and smoke checks succeed
- **THEN** production waits for environment approval in that same run, while the summary links to staging and explains Review deployments.

#### Scenario: Staging failure or approval withheld
- **WHEN** staging fails or production approval is not granted
- **THEN** production migration and deployment do not execute.

#### Scenario: Wrong artifact or superseded source
- **WHEN** the saved artifact does not match the current run/commit or main has advanced
- **THEN** production fails before migrations and requests a newer tested release.
