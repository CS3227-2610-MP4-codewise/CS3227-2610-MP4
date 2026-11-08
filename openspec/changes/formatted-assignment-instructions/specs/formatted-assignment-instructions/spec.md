## ADDED Requirements

### Requirement: UI-04 Versioned formatted instructions
The application SHALL let instructors author supported instruction formatting and SHALL safely render it consistently for authorized instructor and student consumers without changing existing plain-text publication meaning.

#### Scenario: An existing plain-text question is opened
- **WHEN** an instructor or student opens an existing publication
- **THEN** its instructions retain their original text and meaning.

#### Scenario: Unsupported or unsafe markup is supplied
- **WHEN** formatted instructions contain unsupported or unsafe markup
- **THEN** it SHALL NOT execute and SHALL be rejected or safely handled according to the versioned contract.
