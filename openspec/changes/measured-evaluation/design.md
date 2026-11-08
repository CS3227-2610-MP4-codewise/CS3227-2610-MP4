# Design

Pin synthetic cases, question and rubric versions, source evidence and gold-review rubric before running comparisons. Include incomplete, ambiguous, adversarial and fabricated-evidence cases; define scoring and annotation review criteria and require human adjudication without inferring human acceptance from agent judgments.

Compare the same cases under full versus selected context with equivalent task, output schema, model, prompt policy and repeat schedule. Label mocked transport separately from real model calls; report payload bytes independently from provider-reported tokens. Record model/prompt versions, exact case IDs, randomization/order, latency, usage availability, disagreements, corrections, invalid output, defects and rework. Do not claim causality from incomparable conditions or small samples.

Compare independent bounded tasks using main-only and coordinated review with comparable fixed acceptance criteria, isolated work and recorded assignments. Do not remove independent review from actual release workflow; main-only applies only to disposable experimental exercises. Record actual agent identities, parent/child token attribution, elapsed time, coverage and missing measurements without double counting. Follow the existing project recorder scope and redaction rules.

Provider activation, account operations, real learner data, student progress implementation and hosted deployments are outside this evaluation. No GUI changes. Human reviews and actual baseline measurements are gates, not synthetic defaults.
