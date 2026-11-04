## ADDED Requirements

### Requirement: GRADE-01 Grounded AI assessment draft
An authorized instructor SHALL request a draft using a pinned submission, question, rubric, prompt version, and optional private reference solution. Each criterion SHALL receive a proposed bounded score, evidence, explanation, and review flags. The output SHALL state that code was not executed.

#### Scenario: Valid assessment generated
- **WHEN** the model returns a valid criterion-level assessment
- **THEN** it is stored as an instructor-only draft with its provenance and has no effect on released grades.

#### Scenario: Correctness cannot be established
- **WHEN** evidence does not justify a correctness claim
- **THEN** the assessment indicates the limitation and requests instructor review without claiming tests passed.

### Requirement: GRADE-02 Validated annotations
Annotations SHALL identify a question, criterion, valid line range, excerpt, and explanation in the immutable source. Invalid criterion keys, non-finite/out-of-range scores, missing criteria, and mismatched line excerpts SHALL reject the generated draft as a whole.

#### Scenario: Fabricated code reference
- **WHEN** an annotation points outside the source or quotes different text
- **THEN** validation fails and no partial assessment is released or marked valid.

### Requirement: GRADE-03 Instructor review and release
Instructors SHALL edit proposed scores and feedback, approve the reviewed revision, and explicitly release it. Approval SHALL bind to an exact assessment revision. Editing approved content SHALL invalidate approval. Students SHALL see only released versions.

#### Scenario: AI generation completes
- **WHEN** an AI draft becomes ready
- **THEN** students cannot access its text or scores through any endpoint.

#### Scenario: Stale release request
- **WHEN** an instructor releases a revision that changed after approval
- **THEN** release is rejected until the current revision is reviewed and approved.

### Requirement: GRADE-04 Assessment lifecycle and audit
The system SHALL track draft, approved, and released revisions with reviewer identity, timestamps, edits, and provenance. Regeneration SHALL create a new draft without overwriting instructor edits or published feedback. Corrections after release SHALL create a new reviewed release with history.

#### Scenario: Provider unavailable
- **WHEN** AI assessment fails
- **THEN** an instructor can still create, review, and release a manual assessment.

#### Scenario: Regeneration after release
- **WHEN** an instructor requests another AI assessment
- **THEN** the existing release remains authoritative until a new revision is approved and released.
