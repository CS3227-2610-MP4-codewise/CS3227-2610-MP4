## ADDED Requirements

### Requirement: GRADE-01 Private generated candidates
The instructor assessment workspace SHALL generate and persist a private candidate with provenance from authorized pinned versioned evidence via the secure gateway, without changing the current assessment or release.

#### Scenario: Explicit adoption
- **WHEN** an instructor adopts a candidate against the current revision
- **THEN** the system rechecks authority and evidence and preserves previous revisions and releases without automatic approval or release.

#### Scenario: Work changes during generation
- **WHEN** the assessment or unsaved instructor work changes during generation
- **THEN** generation SHALL NOT overwrite that work and stale adoption SHALL be refused.

### Requirement: GRADE-02 Validated evidence
The system SHALL reject the complete output unless criterion coverage, finite score bounds and every annotation range and excerpt match the pinned rubric and source.

#### Scenario: Fabricated excerpt
- **WHEN** a candidate cites text absent from its pinned range
- **THEN** the complete candidate is rejected and no feedback is released.

### Requirement: AI-02/05 Authorized bounded context
Generation SHALL use bounded server-only context and SHALL include private versioned references only when explicitly selected and currently authorized. Untrusted content SHALL NOT override system instructions and submitted code SHALL NOT execute.

#### Scenario: Revoked access
- **WHEN** access is revoked before or during generation or adoption
- **THEN** protected candidate data SHALL NOT be returned or adopted.

### Requirement: UI-01/04/06/07/08 Instructor review
The workspace SHALL present accessible warm-workbook pending, error, retry and review states, disclose no execution, and preserve manual assessment and released history.

#### Scenario: Provider failure
- **WHEN** generation fails
- **THEN** the instructor can retry or continue manual assessment without losing edits.
