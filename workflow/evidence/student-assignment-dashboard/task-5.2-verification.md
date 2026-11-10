# Task 5.2 verification — 2026-11-10

Latest: [browser recheck and limited sign-off](task-5.2-recheck.md). All 35 shots retaken; normal 1280 px / 200% verified with device toolbar off; F1 blocked Tab/Space retry focuses heading. Rendered size/color samples recorded. VoiceOver speech and F2/F4 remain open. `npm run check` exits 0 (456 Vitest tests + 4 deployment checks; specs/typecheck/lint/build pass). Below is the historical preceding run.

- Revision: `8a7951f5452c643172ef1945f53a9ecbedcda111` plus pre-existing worktree modifications. The served built asset names matched the final check build (`index-DpdkM-oJ.js`, `index-DEvFaz14.css`). This does not prove a hosted release.
- Scope: local computer-use review, SD-05/06 and UI-01/02/03/04/07/08, `warm-workbook-v1`. See [filled checklist](manual-ui-checklist.md) and [UI review](ui-review.md).
- Agent: main `/root` only; no subagents, independent reviewer or Keith acceptance invented. No experiment recording activated; new-turn telemetry unavailable.

## Actual checks

Retrospective correction (2026-11-10): the earlier unavailable-telemetry note above describes the bounded tracker at review time, not absence of source telemetry. [The retrospective audit](retrospective-audit/audit.md) recovered exact usage for the completed computer-use turn: 196 response IDs, 26,251,241 input (26,056,832 cached subset), 43,759 output (11,633 reasoning subset), 26,295,000 total; wall time 37m 47.314s. Its feasibility follow-up is separately reported. These records remain excluded from bounded experiment totals; recording stays off and earlier history is preserved.

| Command / operation                                                                         | Outcome                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx openspec status --change student-assignment-dashboard --json` and `instructions apply` | Repo-local spec-driven change; ready; 12/14 tasks complete at entry. Scope restricted to 5.2.                                                                                                                                    |
| `npm run check` in sandbox                                                                  | Exit 1: local integration runtimes could not listen on localhost (`EPERM`); 267 tests passed, 33 failed, 155 skipped. Not treated as application regression evidence.                                                            |
| `npm run check` with localhost execution allowed                                            | Exit 0: strict OpenSpec validation 16/16; typecheck and lint pass; Vitest 40 files / 455 tests pass; deployment tests 4/4; production build passes. Existing >500kB chunk warning remains.                                       |
| Native computer use                                                                         | Actual Edge app, local authenticated producer/consumer composition. Keyboard, widths, appearance, selected failure states and screenshots described individually in checklist. VoiceOver audio unavailable; not counted as pass. |
| Screenshot preparation                                                                      | Native screenshots cropped to device page bounds with installed Sharp; no rescaling, fabricated content or image generation. 35 PNGs saved. Browser chrome/DevTools/open identity menu excluded.                                 |

## Local fixture operations and cleanup

- Existing local course `a77f2dc1-a82b-4937-ab1b-c0cc0b9775f9` initially had no assignments. With explicit user approval, created synthetic draft `5da6b6ba-d120-4912-81de-53327bd1ac6b` through instructor UI. Title begins “Synthetic UI review”; eight instruction paragraphs, wide Python starter text and one public rubric criterion. No reference solution, learner data or source execution.
- Publishing initially received an automatic approval rejection because local publication visibility was not considered covered by creation approval. User then explicitly approved publishing this local synthetic assignment; publication `87b1c39f-9b48-497d-a3d9-28464d971a67` succeeded. It remains published locally. No remote deployment/data changes.
- Temporarily seeded 105 courses with `workflow/student/seed-courses.mjs`, scoped to the existing active local account. Initial sandbox execution failed with localhost EPERM; rerun with localhost allowed succeeded. Synthetic course 100 received a long synthetic name for wrapping. An initial name exceeded the schema's 120-character limit and was rejected without change; the shorter name succeeded.
- Existing helper `remove 105` deactivated the temporary memberships/courses; read-back reported **zero active synthetic Student memberships** for the account. Rows retained according to existing helper semantics. Synthetic course 100's name remains on its inactive row.
- DevTools network Offline was restored to No throttling. API-only request blocking was disabled after retry checks. Browser zoom restored to 100%; color and reduced-motion emulation reset to No emulation; inspector/device emulation and DevTools closed. The account is signed out after the authorized cross-tab session test. Additional blank tab opened during network focus testing was not used for app data.

## Findings / limits / next owner

- F1: retry removes focused control and leaves HTML document focus (Keith).
- F2: cross-tab session loss hides recovery heading/Sign in through shared shell; reload recovers (Keith/Darryl).
- F3: Offline full-page Refresh reaches browser error; API-only failure does render app retry (Keith, recovery expectations).
- F4: actual native role radios differ from design.md's switch semantics (Darryl/team design reconciliation).
- VoiceOver speech/once-only announcements, all rendered target dimensions/contrast readings, separate role Space/Enter, narrow account-menu expansion and complete zoom/theme combinations remain unverified.
- No application source repaired. Existing worktree package, student CSS/tests, seed helper, course-onboarding tasks and unrelated experiment log changes were preserved.
- Task 5.2 remains open; 5.3's final security/privacy/team review is not completed by running the check suite here. Next owner Keith for findings/remaining manual acceptance and Darryl for shared-shell/control review. No message sent to Darryl.
