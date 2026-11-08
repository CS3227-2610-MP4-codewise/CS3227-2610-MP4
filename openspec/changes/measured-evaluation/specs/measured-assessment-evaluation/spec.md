## ADDED Requirements

### Requirement: DEV-04 Reproducible assessment evaluation
The evaluation SHALL use a fixed versioned synthetic dataset and human-reviewed rubric and annotation criteria, identifying each baseline, condition, configuration, outcome and limitation.

#### Scenario: Human review is missing
- **WHEN** a case has not been reviewed by an instructor
- **THEN** its review status SHALL remain pending and SHALL NOT be reported as human-reviewed.

### Requirement: AI-05 Comparable context and measured usage
Full and selected context comparisons SHALL use the same cases and compatible task and validation contracts, with available tokens and latency recorded and unavailable values labelled.

#### Scenario: Mocked output
- **WHEN** a deterministic transport returns a synthetic response
- **THEN** the result SHALL be labelled mocked and SHALL NOT be treated as a real-model grading result.

### Requirement: DEV-02 Isolated coordination comparisons
The experiment SHALL compare main-only and coordinated review on comparable isolated tasks without weakening the actual release review process, recording real agent attribution and quality outcomes.

#### Scenario: Missing baseline or attribution
- **WHEN** a baseline, measurement or attributable participant is unavailable
- **THEN** the report SHALL identify the gap without inventing or double counting results.
