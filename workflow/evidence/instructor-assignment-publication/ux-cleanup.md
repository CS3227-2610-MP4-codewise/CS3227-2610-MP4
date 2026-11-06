# Instructor authoring UX cleanup —2026-11-06

Human owner Darryl; same bounded instructor slice, warm-workbook-v1 UI-01/04/05/07/08 and IAS-01–IAS-07/SUB-01/AUTH-02. At the verification checkpoint, input baseline was the local commit62da9f2 and this UX diff was uncommitted. Darryl subsequently authorized publication: the implementation and UX commits were replayed onto reviewed main7621ec7 as80317f3 and5075779. Source identity: ux-source-sha256.json, with historical checkpoint identifiers preserved. Final manual acceptance and live integration/deployment remain pending.

## Changes and actual review

- Task order is Assignment details → Questions → saved final review → separate Publish assignment. One persistent save/review bar; no routine storage-revision labels, empty question picker or always-visible reload/reorder/reference/history controls. Criterion Name/Assessment guidance/Minimum and Maximum points replace schema terminology. Minimum defaults to editable0; maximum is not invented.
- Native disclosures retain keyboard behavior and44px targets. Reference code is labelled instructor-only; source/rubric editing stays in the shared40/60 workbook. First added question focuses its heading. Published instructions/code/rubric are selectable read-only content; Back to draft is explicit. Field errors name question/criterion and next action without schema paths.
- Independent read-only /root/publication_review found that hiding empty version history also hid retries after network failures. Main retained a modest collapsed history disclosure and Refresh versions for every authorized loaded assignment; focused re-review accepted, no remaining actionable finding. Reviewer ran no tests/browser audit. Main also hides stale list rows on denied creation/read failure and preserves neutral denied headings.

| Template review area | Actual outcome                                                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI identity          | PASS warm tokens/Georgia/proportional labels/monospaced code and continuous sheet retained; user explicitly requested UX cleanup, no visual-system departure.                                                                                                       |
| Sign-in/role switch  | OUT OF SCOPE, real integration unverified. Sample context and local-preview footer remain explicit; no role grant or provider implemented.                                                                                                                          |
| Versioned workspace  | PASS actual local D1 save→review→publish1→history→read-only instructions/code/rubric→Back to draft. No server/shared-contract/storage edits.                                                                                                                        |
| Navigation/keyboard  | PASS native Enter Add first question and reference disclosure; heading focus observed on first question and review/historical arrival. Existing controller tests preserve inactive edits/races/explicit publication. Full assistive-technology audit not performed. |
| Responsive           | PASS320/768/1024/1440 in light/dark: no page-wide overflow, no measured visible essential target below44px (ux-responsive.json). Persistent bar measured104.11px at320 and70.67px at wider widths.                                                                  |
| Appearance/contrast  | Existing semantic colors/text/control boundaries retained, prior measured ratios apply. Actual light/dark browser selection checked. Native viewport screenshots below.                                                                                             |
| State/recovery       | PASS8 controller tests: existing7 plus incomplete question2/criterion1 human error→correct/save→review with no implicit publish. History retry source repair accepted independently. No raw paths exposed by new error mapping.                                     |
| Privacy              | Instructor private reference collapsed/labeled; denied editor/title hidden; denied/stale list rows hidden. Published public projection/backend unchanged, existing actual-D1 privacy/security tests passed.                                                         |
| Checks               | npm run check PASS:5 specs, types/lint,116 Vitest+4 Node tests and production build. Subsequent first-question focus/list-denial/help-text refinements passed types/lint; backend unchanged.                                                                        |
| Limits               | No new native200% zoom/screen-reader audit; no real identity/student consumer/deployment proof. Earlier equivalent reflow/text-preference evidence is historical, not falsely rerun for this layout.                                                                |

## Screenshots and capture limitation

[Desktop light](screenshots/ux-desktop-light.jpg) and [320px light](screenshots/ux-narrow-light.jpg) show the cleaned editor. Full-page/clip screenshot APIs and direct developer capture failed in this browser session; documented native viewport capture succeeded once the preview was visible. No failed/missing full-page or dark screenshot is represented as captured evidence. Dark layout was measured/visually inspected in the live browser. Temporary viewport/appearance overrides restored to normal/system.

## Manual acceptance

1. Edit details, add a question and rubric, and open the private reference only when needed. Check the simpler labels and keyboard flow.
2. Save, choose Review & publish, then separately Publish assignment. Inspect version history/read-only view and Back to draft.
3. Return concrete UX issues or accept the refinement. Final feature acceptance remains pending; synthetic identity is not completed integration.
