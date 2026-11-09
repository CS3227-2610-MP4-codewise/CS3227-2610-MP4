# UI review: student-assignment-dashboard (planning)

- Human owner and role area: Keith, student course list, assignment list and read-only overview.
- Source revision / PR: inspected `f62b23891434d18414ef8179a326749fc85365bf`; new uncommitted planning documents on main; no PR.
- Design reference: `docs/ui/design.md`, `warm-workbook-v1`.
- Relevant IDs: SD-01–06; AUTH-01–03; SUB-01/04; COU-06/07; UI-01/02/03/04/07/08.
- Shared-file writer window / producer-consumer revisions: none opened; documented context reference `8f93f51c1f6a36dd64908bd550e90b68e9957af1` is not consumer clearance. Task 1 requires exact implementation revisions and named writers.
- Reviewer / actual mode: main `/root`, Coordinator, planning self-review only. No subagents or independent/human UI acceptance.
- Evidence directory: `workflow/evidence/student-assignment-dashboard/`; [planning verification](planning-verification.md).

| Review area         | Requirement / acceptance                                        | Outcome and evidence                                                                                                                                                                                          |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design identity     | UI-01 shared warm tokens, typography and plain rows             | Pass for plan traceability: design decisions 4–5 specify shared styling. Runtime presentation not applicable to this docs-only checkpoint.                                                                    |
| Sign-in             | UI-02 shared session and safe return                            | Pass for planned scenarios SD-04/05 and tasks 2.2/3.3. Actual provider and student return integration unverified.                                                                                             |
| Role switch         | UI-03 authorized shared switch, single/dual roles, cancellation | Pass for planned scenarios SD-01/05 and tasks 3.1/3.3/5.1. Actual pointer/Space/focus and invitation integration unverified.                                                                                  |
| Versioned workspace | UI-04 exact version, public question/rubric context             | Pass for read-only overview boundary in SD-03. Working copy/attempt surfaces not applicable; actual version rendering unverified.                                                                             |
| Next/Previous       | UI-05 pinned question-work navigation                           | Not applicable to this document overview; no editor/question-work workspace is introduced. Page navigation is separately specified by SD-01/02/05.                                                            |
| Evidence links      | UI-06 historical source observations                            | Not applicable: feedback and learner source are excluded.                                                                                                                                                     |
| Responsive/keyboard | UI-07 widths, zoom, targets, focus, reduced motion              | Runtime checks not applicable to docs-only change; future actual evidence remains unverified under task 5.2.                                                                                                  |
| Contrast/appearance | UI-01/07 light/dark, contrast and screenshots                   | Runtime checks not applicable; planned shared tokens are traceable, actual contrast/screenshots unverified under task 5.2.                                                                                    |
| Honest state        | UI-08 loading/empty/denied/network/expired/races                | Pass for state matrix and SD-05 scenarios. Runtime state transitions unverified. Save/release/AI states not applicable to this slice.                                                                         |
| Privacy             | AUTH-02 public allowlists and current Student membership        | Pass for planning coverage SD-04 and task 2.2. Existing either-role `student-read` behaviour is an explicit producer gate, not a repaired runtime defect. Actual student payload/DOM/cache checks unverified. |
| Verification        | Exact validation/check outcomes                                 | See planning-verification.md. Existing application checks are baseline regression evidence, not proof of a student implementation.                                                                            |

## Evidence and decisions

- Representative desktop/narrow screenshots: not applicable to planning; no mock or screenshot claimed.
- Automated checks actually run: linked planning verification records results and environment limits.
- Manual keyboard/state checks: none; future task 5.2 remains unchecked.
- Intentional departures: none requested. Read-only document overview precedes the future UI-04/05 question-work surface; it does not replace or waive that surface's requirements.
- Findings returned to owner: student-safe listing is missing; generic public-read role semantics are insufficient for Student dashboard routes. Both are recorded as gated producer/consumer tasks.
- Untested combinations / blockers / next owner: all runtime/UI combinations unverified; Keith reviews plan and exact producers, Darryl supplies agreed shared producer additions.
- Outcome: planning self-review complete; runtime and human UI acceptance pending.
