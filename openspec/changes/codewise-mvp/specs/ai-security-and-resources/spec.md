## ADDED Requirements

### Requirement: AI-01 Server-only SoCLaaS integration
Application LLM requests SHALL use an allowlisted SoCLaaS endpoint and configured supported model from the backend. Credentials SHALL remain in environment secrets. Production activation SHALL require verified authentication, deployed connectivity, and recorded service quotas; missing quota configuration SHALL disable AI calls.

#### Scenario: Model unavailable
- **WHEN** the configured model or required capability is unavailable
- **THEN** AI fails with an actionable status while editing and manual grading remain available.

### Requirement: AI-02 Untrusted inputs and outputs
Code, references, and model responses SHALL be treated as untrusted data. Trusted policies SHALL be separated from input content. AI SHALL have no tools for execution, database access, or grade release. Output SHALL be schema-validated and safely rendered without executable HTML.

#### Scenario: Injection in submitted code
- **WHEN** code comments ask the model to ignore the rubric or reveal secrets
- **THEN** no privileged action occurs and adversarial evaluation checks the resulting draft for policy deviation.

#### Scenario: Malicious generated markup
- **WHEN** feedback contains scripts or unsafe links
- **THEN** rendering prevents execution and unsafe navigation.

### Requirement: AI-03 Shared resource limits
The backend SHALL enforce atomic user and provider-wide request, token-budget, and concurrency limits across replicas, including retry attempts. Inputs and output allowances SHALL be bounded. Duplicate active requests SHALL reuse a request record. Quota rejection SHALL return a retry status without invoking the model.

#### Scenario: Multiple replicas compete
- **WHEN** simultaneous requests exceed the shared configured allowance
- **THEN** only admitted requests invoke the provider and other requests receive retry guidance.

### Requirement: AI-04 Bounded failure handling
Provider requests SHALL use timeouts and at most two retries for eligible transient failures, with jitter and Retry-After support within the request deadline. Authentication and validation failures SHALL not be retried automatically. Failed requests SHALL never produce approved grades or lose saved code.

#### Scenario: Rate limit exceeds remaining deadline
- **WHEN** Retry-After exceeds the available request time
- **THEN** the call stops and returns retry guidance without an unbounded wait or detached background promise.

### Requirement: AI-05 Minimal context and privacy-aware telemetry
Each request SHALL record prompt/model versions, evidence IDs, outcome, latency, retries, and provider token usage when available. Missing usage SHALL be labelled unavailable. Logs SHALL exclude credentials and raw private code by default. Cache keys SHALL include scope, evidence versions, prompt, and model.

#### Scenario: Usage not supplied
- **WHEN** a provider omits token or reasoning-token metrics
- **THEN** telemetry marks them unavailable and does not invent a reasoning percentage.

#### Scenario: Identical code across courses
- **WHEN** different authorized scopes submit identical source
- **THEN** cached private results are not shared across those scopes.
