# Parallel scheduling simulation

Run `node workflow/evidence/module-wrapup-parallel-simulation/run.mjs` from the repository root. This writes `results.json` and checks the expected schedule totals and coordination break-even.

Created during presentation preparation on 2026-11-10. Darryl reports prior experiments whose records were lost. This simulation does not reconstruct those records and is not a claim about their actual outcome.

All durations are assumptions in model minutes, not measured agent execution times. The same tasks take 74 minutes sequentially. Overlapping server implementation (18), UI implementation (14) and test design (8) saves 22 minutes before additional coordination. Adding 4 minutes of coordination gives 56 elapsed minutes, a 24.3% reduction and a 1.32x speedup ratio. Integration, test execution, review and repair remain serial. These are conditional model outputs, not empirical MP4 results.

Sensitivity varies extra coordination from 0 to 26 minutes. At 22 minutes the model breaks even; at 26 minutes the parallel condition is slower. The example assumes stable agreed interfaces, three available slots, unchanged task duration and no contention or additional rework beyond the specified allowance. It does not establish robustness, token savings, money savings or actual agent productivity. A common incorrect spec can still affect all workers.
