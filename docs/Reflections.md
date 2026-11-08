# Reflections

Status: initial synthetic control completed; real-model and instructor review remain pending.

## Experiment record

For each experiment record date, research question, task/dataset, baseline, changed condition, agent/model configuration, number of trials, available usage metrics, elapsed time, retries/tool calls, quality/security findings and limitations. Keep synthetic fixtures reproducible. Label missing metrics unavailable, including provider cache or reasoning-token figures.

## Planned comparisons

1. Single-agent implementation vs coordinator/implementation/independent-review workflow on comparable bounded tasks. Measure defects, completion time, rework, idle time and resources.
2. Broad assessment context vs selected question/rubric/submission context on fixed instructor-reviewed cases. Measure evidence validity, rubric alignment, review corrections, prompt size and latency.
3. Duplicate-request reuse and bounded retries vs a controlled baseline using mocks; avoid exhausting the real service quota.

## Observations and evidence

An initial deterministic assessment-validator control and two isolated coordination exercises are documented in [measured evaluation evidence](../workflow/evidence/measured-evaluation/results.md) (DEV-02/04, AI-05, GRADE-01). The context artifacts differed in serialized byte size, but the same validator received the same evidence in both conditions; this does not measure model quality, model latency or token savings. The coordinated exercise had a real worker and reviewer, but the reviewer saw the worker's findings and the exercises share one defect class. Human scoring, comparable end-to-end timing and attributable experiment token totals are unavailable, so no productivity or quality improvement is claimed.

Real-model and instructor-reviewed results require later evidence. Keith's student-progress results are not available and are not inferred. Instruction files describing agent roles do not demonstrate agent coordination by themselves.

At Darryl's request, an assistant subsequently reviewed the five synthetic variants and suggested a more cautious explanation for the baseline, rejecting three invalid drafts. Those judgments are documented in the review sheet; they are not independent instructor review or measured model performance.
