# Shared contract validation

## Purpose

Give instructor and student producers/consumers runtime-checkable, privacy-preserving boundaries without duplicating domain storage or treating synthetic conformance as live integration.

## ADDED Requirements

### Requirement: CON-01 Explicit acceptance and one contract source
The contract package SHALL refine existing C-ID/C-PUB/C-SUB/C-REL/C-AI drafts, record accepted versus proposed decisions and preserve named producer ownership. Readiness acceptance SHALL not imply detailed policy acceptance (DEV-01, DEV-02).

#### Scenario: Readiness acceptance checked
- **WHEN** a dependent change checks project-readiness status
- **THEN** it finds Darryl's recorded checklist acceptance and separately checks each required contract/policy approval and producer handoff.

#### Scenario: Keith decision is pending
- **WHEN** a consumer-impacting decision lacks Keith's agreement
- **THEN** it remains proposed; isolated tests can exercise it but dependent production integration cannot claim acceptance.

### Requirement: CON-02 Strict bounded runtime parsing
Contract boundaries SHALL validate unknown runtime input, reject unknown public fields and coercion, and return bounded path/code issues without private values. Shared primitives SHALL define IDs, timestamps, revisions, source representation and numeric precision (SUB-01, AI-05).

#### Scenario: Private field injected into public publication
- **WHEN** a public payload includes a private reference or an unexpected property
- **THEN** its strict parser rejects it; the producer's explicit public projection omits private fields before serialization.

#### Scenario: Unsafe values or ambiguous versions
- **WHEN** input has non-finite/overprecision scores, invalid UTC dates, duplicate composite IDs or unsupported schema version
- **THEN** parsing fails without silently coercing, rounding, trimming source or accepting partial data.

### Requirement: CON-03 Injected authorization is authoritative
C-ID SHALL use an injected server-only session/course/object authorization boundary. Parsing a principal-shaped object or browser role SHALL never grant authority. Consumers SHALL authorize before private repositories, projections or provider work (DEV-02, AUTH-02).

#### Scenario: Forged role or foreign course
- **WHEN** a client supplies an instructor role or guesses a foreign-course object
- **THEN** the trusted adapter rejects access before private content is read or emitted.

#### Scenario: Missing or revoked identity
- **WHEN** the identity adapter is unavailable or membership is revoked
- **THEN** protected operations fail closed, including result/cache reads; no synthetic fallback is installed in deployed routing.

### Requirement: CON-04 Publication and immutable submission conformance
C-PUB and C-SUB SHALL expose validated pinned assignment/question/rubric identities, preserve canonical source and exclude private references from student projections. Publication edits SHALL produce new immutable versions while retaining old versions (SUB-01).

#### Scenario: Publish again after source or deadline edit
- **WHEN** a future producer republishes changed content or deadline
- **THEN** prior version IDs/content remain unchanged and existing submissions stay pinned; fixture suites test the consumer consequence without claiming real database atomicity.

#### Scenario: Submission evidence does not match publication
- **WHEN** a submitted answer has a foreign question/rubric version or wrong source hash
- **THEN** the consumer rejects the snapshot before grading, even if its basic JSON shape is valid.

### Requirement: CON-05 Exact release and withdrawal currentness
C-REL SHALL identify exact approved revisions, composite question/rubric criteria and immutable submitted answers. Correction and withdrawal SHALL change currentness atomically in the eventual producer, preserve audit history and prevent withdrawn content/cache redisplay (GRADE-04).

#### Scenario: Stale approval or mismatched annotation
- **WHEN** a release references a changed approval revision, foreign criterion or mismatched source excerpt
- **THEN** semantic validation rejects the complete releasable payload.

#### Scenario: Withdrawal after evidence selection
- **WHEN** an authorized instructor withdraws a release selected by a consumer
- **THEN** subsequent currentness checks report the withdrawn version and changed availability token, content reads return only a tombstone, cached progress is stale, and no older release automatically becomes current.

#### Scenario: Corrected release replaces current evidence
- **WHEN** a newly approved release becomes current
- **THEN** its release/currentness versions increase, historical nonwithdrawn releases remain labelled historical, and consumers reject stale evidence tokens.

### Requirement: CON-06 Gateway action and telemetry conformance
C-AI SHALL use server-configured action/evidence envelopes, injected action validators and separately allowlisted public status. Success SHALL require action-domain validation. Missing provider usage SHALL remain unavailable; no fixture SHALL prove live quotas or connectivity (AI-05).

#### Scenario: Shape-valid domain-invalid output
- **WHEN** an action validator rejects scores, excerpts or evidence citations
- **THEN** no usable success result is returned or released, even if the transport envelope parsed.

#### Scenario: Progress validator or provider configuration missing
- **WHEN** an action has no installed validator or verified provider configuration
- **THEN** it fails closed without provider work or a permissive generic result parser.

#### Scenario: Missing usage and private metadata
- **WHEN** a provider omits usage or the gateway has internal model/prompt/error details
- **THEN** usage is tagged unavailable and public status excludes internal/private context.

### Requirement: CON-07 Reusable producer and consumer suites
Each C-* boundary SHALL have cross-linked synthetic valid/invalid examples, reusable factory-based producer/consumer checks and an evidence ledger distinguishing schema conformance, synthetic adapters and real producer integration (DEV-01, DEV-02).

#### Scenario: Real Keith adapter is unavailable
- **WHEN** instructor tests inject a synthetic identity or submission adapter
- **THEN** tests exercise the same port/schemas without creating identity/course/submission storage and report real authentication/producer integration pending.

#### Scenario: Real producer becomes available
- **WHEN** Keith supplies a reviewed producer revision
- **THEN** the same conformance suite runs against that adapter and records producer/consumer revisions plus actual security/integration results before acceptance.
