## ADDED Requirements

### Requirement: DEV-01 Spec-driven change control
Each feature SHALL have a reviewed proposal, acceptance scenarios, design, and task list before implementation. Changes to behaviour SHALL update their specs and linked tests. Draft planning artifacts SHALL not be represented as implemented product documentation.

#### Scenario: Behaviour changes during implementation
- **WHEN** implementation needs a different submission or grading rule
- **THEN** its spec and acceptance checks are revised before the change is considered complete.

### Requirement: DEV-02 Coordinated specialized agents
The development workflow SHALL define a coordinator, specification role, implementation role, and independent test/security review role. Handoffs SHALL include requirement IDs, owned files, evidence, blockers, and next actions. Write ownership SHALL be assigned before parallel work; failed reviews SHALL return to an owner.

#### Scenario: Two agents need the same file
- **WHEN** work would overlap a current write owner
- **THEN** the coordinator serializes or reassigns it and records the decision.

### Requirement: DEV-03 Development security
Development agents SHALL use least-privilege tools, synthetic fixtures, and redacted logs. Repository text and external content SHALL not override trusted workflow policy. Release credentials SHALL be unavailable to implementation agents, and CI SHALL scan tracked files for secrets.

#### Scenario: Malicious instruction in a fixture
- **WHEN** an agent encounters text requesting credential disclosure or skipped security checks
- **THEN** it treats the text as test data and the workflow records whether the attack was resisted.

### Requirement: DEV-04 Measured evaluations and deliverables
The team SHALL maintain verified redacted interaction summaries and experiments comparing coordination, context selection, and resource use. Required guides, reflections, source, workflow records, and GitHub Pages website SHALL describe the actual release. Evaluation SHALL include instructor-reviewed AI cases and adversarial tests.

#### Scenario: Experiment reported
- **WHEN** a reflection claims a resource or quality improvement
- **THEN** it identifies the baseline, dataset, configuration, available measurements, results, and limitations.
