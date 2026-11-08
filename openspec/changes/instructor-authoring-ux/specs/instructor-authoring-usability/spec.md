## ADDED Requirements

### Requirement: UI-04 Accessible question organization
The instructor authoring workspace SHALL provide a question list with pointer reordering and equivalent keyboard actions, preserving current selection and draft content.

#### Scenario: A question is reordered
- **WHEN** an instructor moves a question
- **THEN** its identity and contents remain intact and its new order is saved only by the existing draft workflow.

### Requirement: UI-07 Readable source and rubric controls
The workspace SHALL highlight Python syntax without executing source and present zero as the default rubric minimum while preserving existing nonzero bounds.

#### Scenario: Existing nonzero minimum
- **WHEN** an instructor opens an older draft or publication with a nonzero minimum
- **THEN** its stored value is retained and not silently rewritten.
