## ADDED Requirements

### Requirement: PROG-01 Private evidence selection
Students SHALL request progress feedback using only their own released assessments and associated submissions in an accessible course. Selection SHALL be bounded and prioritize recent comparable criterion keys. Unreleased grading, classmates' data, and private reference solutions SHALL be excluded.

#### Scenario: Insufficient history
- **WHEN** fewer than two comparable assessed attempts exist
- **THEN** the response explains the evidence limitation and avoids a longitudinal improvement claim.

#### Scenario: Unrelated assignments
- **WHEN** rubric criteria have different comparison keys
- **THEN** the system does not infer improvement from raw total-score differences.

### Requirement: PROG-02 Evidence-linked progress explanation
AI feedback SHALL describe recurring issues, supported improvements, and practice suggestions with valid references to selected released assessments. It SHALL distinguish observations from suggestions and SHALL not change grades. Invalid evidence identifiers SHALL reject the result.

#### Scenario: Recurring issue identified
- **WHEN** selected feedback supports the same weakness across attempts
- **THEN** the explanation links the supporting assessments and suggests a focused next step.

### Requirement: PROG-03 History-aware result reuse
Progress results SHALL record evidence IDs and release versions. Reuse SHALL be scoped to the authorized student and exact evidence/prompt/model versions. A changed or withdrawn release SHALL invalidate cached progress evidence before further display.

#### Scenario: Reviewed feedback corrected
- **WHEN** an instructor replaces a release used by a stored progress explanation
- **THEN** the old explanation is marked stale and is not presented as current feedback.
