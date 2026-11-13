# MP4 reflections

This submission covers **Multi-Agent SE**, **Context Engineering**, and **Resource-aware Use**. The member reflection and shared analysis below are backed by repository experiments; missing controls and human review are stated explicitly.

- [Darryl's reflection](reflections/darryl.md): personal analysis of the gateway, context controls and bounded live evaluation, with evidence references.
- **Keith's reflection: pending member contribution.** Keith should add `docs/reflections/keith.md` and link it here. No personal conclusions are attributed to him by the submission audit.
- [Earlier evaluation-planning notes](ReflectionEvaluationNotes.md): historical checkpoint, superseded by later live results where stated below.

## Multi-Agent SE: review helped at boundaries; speedup is unproven

The [gateway readiness audit](../workflow/evidence/secure-ai-gateway/readiness-audit.md) records an independent reviewer finding that malformed provider output could discard valid usage data before quota accounting. The repair preserved validated usage through internal transport errors and added regression checks. The lesson is concrete: rejecting a bad answer and accounting for its consumed resources are separate obligations, and review needs to follow the interaction between components rather than only each component in isolation.

The [coordination exercise](../workflow/evidence/measured-evaluation/results.md) compared a main-only source-range inspection with a worker/reviewer exercise. Both identified reversed ranges and coercible fractional indices; the worker additionally identified numeric-string coercion, and review added authorization and canonical line-splitting concerns. However, both exercises shared one defect class, the reviewer saw the worker's findings, and the reported six-second worker interval excluded startup/communication. Comparable end-to-end timing, blinded correctness scoring and attributable condition-level token totals are unavailable. This establishes useful verification and repair, not a measured productivity improvement. Next time, use comparable independent tasks, vary order, blind initial review to the author's findings, and count integration/rework as part of cost.

## Context Engineering: test the claimed mechanism

In the [deterministic context control](../workflow/evidence/measured-evaluation/results.md), the constructed broad artifact was 2,474 bytes and the selected artifact 1,033 bytes: a reduction of 1,441 bytes (about 58.2%). Five response variants were checked under each condition. Both accepted the valid/untrusted-flag variants and rejected fabricated excerpts, missing criteria and out-of-range scores.

The extra broad context was never consumed by the deterministic validator. The result therefore demonstrates smaller serialized context and a validator control, not better model reasoning, lower latency or token savings. A future model experiment needs identical fixed cases, controlled prompt/model settings, real consumed-context measurements and independent instructor scoring.

The [live assessment study](../workflow/evidence/instructor-ai-assessment/live-quality-evaluation.md) used six synthetic `positive_sum` cases, repeats and targeted repairs across 12 requests. Selected question/rubric/source and explicit reference opt-in constrained the evidence boundary, but valid structure did not ensure semantic correctness: Q2 received a full criterion score while its explanation said the score should be zero, and a blank Q4 initially received full marks. Q3 and Q6 were rejected for wrong source ranges. A blank-source guard and prompt repairs addressed specific paths; they do not establish general correctness or injection resistance. The final Q2 repair matched the proposed 0/0/3 expectation, but a single successful rerun does not erase earlier failures. Keep instructor approval and release explicit.

## Resource-aware Use: distinguish reservations, actual usage and quality

The live study used all **12/12** authorized attempts. Reported usage totaled **6,123 input + 7,860 output = 13,983 tokens**; its conservative reservation ceiling was **208,384 tokens**. Reservation is an admission bound, not actual spend. The initial 512-output request truncated; a 1024-output repair produced a valid Q1 candidate. A narrowly accepted complete JSON fence repaired an output-format failure, while rubric inaccuracies still needed separate treatment.

The evaluation used an append-only private ledger and evaluation-specific no-retry path, retaining prior reservations across continuations. The general lesson is to budget failures and repair calls before dispatch and stop at the ceiling rather than reclassifying failed calls as free. Provider-specific framing/output assumptions and shared-key coordination remain limits. The recommendation remains **needs repair**, with independent instructor review unfilled. No further generation calls were made for this submission pass.

Development-assistant usage and provider-assessment usage are different measurements. Cached input is already included in input; provisional snapshots cannot be summed as separate turns. The [log policy](../logs/README.md) and [summary index](../logs/INDEX.md) preserve coverage gaps. Missing historical measurements cannot support claims that the multi-agent arrangement was cheaper than one agent.

## Evidence and acceptance limits

These are engineering observations on synthetic cases, not learner-outcome results or instructor-approved ground truth. [Darryl's reflection](reflections/darryl.md) provides the fuller first-person discussion and source trail. Members must verify their logs, acknowledge missing historical interactions and supply their own reflection/acceptance before final submission. See [submission verification](../workflow/evidence/final-submission/verification.md) for the remaining release and documentation tasks.
