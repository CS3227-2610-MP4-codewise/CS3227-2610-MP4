# Proposal

## Why

Existing assessment checks use synthetic transports and do not measure model grading quality or establish comparative resource savings. Establish reproducible evidence without representing mocks as model outcomes.

## What Changes

- Define a fixed synthetic assessment dataset and human-review procedure for scores and source annotations.
- Compare bounded full and selected context on the same cases, and main-agent-only versus coordinated review on comparable isolated tasks.
- Record measurements, disagreements, corrections, defects, rework, baselines and attribution limitations in evidence and Darryl's reflections.

## Capabilities

### New Capabilities

- `measured-assessment-evaluation`: Reproducible synthetic evaluation with human review and honest provenance.

### Modified Capabilities

None; the existing DEV-02/04, AI-05 and GRADE-01 requirements remain authoritative.

## Impact

Evaluation fixtures, scripts, redacted evidence, handoff and Darryl's reflections. Keith's student-progress results are included only when attributed and available. No real learner data, code execution, release-policy weakening, provider activation or hosted deployment. Real-model runs require the existing gateway activation and separately authorized connectivity gates.
