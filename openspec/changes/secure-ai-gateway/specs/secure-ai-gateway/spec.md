## ADDED Requirements

### Requirement: SAI-01 Isolated server-only provider configuration
The gateway SHALL use server-only, separately configured instructor and student credentials with an allowlisted provider endpoint and model. Each action SHALL remain disabled until its required configuration and verification gates are present. [AI-01, OPS-01]

#### Scenario: Configuration is missing
- **WHEN** the selected action lacks verified provider configuration or its credential
- **THEN** the gateway SHALL fail closed before a provider call.

### Requirement: SAI-02 Shared resource admission
The gateway SHALL persist scoped idempotent requests and atomically reserve shared request, token and concurrency allowances for every provider attempt. It SHALL enforce deadlines and conservative uncertainty handling across replicas. [AI-03/04]

#### Scenario: Concurrent requests exceed allowance
- **WHEN** competing requests or retries exceed a configured shared limit
- **THEN** only admitted attempts SHALL call the provider and the others SHALL receive a safe failure.

### Requirement: SAI-03 Validated and authorized output
The gateway SHALL validate output using the action's domain validator and reauthorize evidence before returning or caching a successful result. It SHALL isolate cached results by actor, course, action, evidence and versions. [AI-02/05, CON-06]

#### Scenario: Domain-invalid output
- **WHEN** a result is structurally valid but fails its action validator
- **THEN** it SHALL NOT be exposed as usable success.

#### Scenario: Reported component token overrun
- **WHEN** reported input tokens exceed the verified input reservation or reported output tokens exceed the requested output cap, even if their combined total fits the reservation
- **THEN** the result SHALL fail closed before domain validation or caching, without refunding its conservative reservation.

#### Scenario: Unsafe combined usage
- **WHEN** the sum of reported usage cannot be safely represented for accounting
- **THEN** the gateway SHALL retain uncertainty debt and SHALL NOT expose a successful result.

#### Scenario: Rejected content still reports valid usage
- **WHEN** a bounded parsed provider envelope reports valid usage but generated content is malformed or truncated
- **THEN** usage SHALL remain available for conservative accounting before safe failure, without exposing the rejected content.

#### Scenario: Missing usage or revoked access
- **WHEN** provider usage is absent or authorization is revoked
- **THEN** usage SHALL be unavailable and a revoked actor SHALL NOT receive a cached or completed result.
