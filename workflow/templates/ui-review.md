# UI review: CHANGE-ID

- Human owner and role area:
- Source revision / PR:
- Design reference: `docs/ui/design.md`, `warm-workbook-v1` (or explicitly approved successor).
- Relevant UI requirement IDs and MVP requirement IDs:
- Shared-file writer window / producer-consumer revisions:
- Reviewer and actual review mode (self / independent / human; do not invent):
- Evidence directory: `workflow/evidence/<change>/`.

For each row record **pass / fail / not applicable / unverified**, a reason and linked evidence. Missing backend, missing data or a mock means unverified integration, not pass. This is a review template, not evidence that checks ran. For docs-only changes mark runtime/screenshot rows not applicable and link specification validation.

| Review area         | Requirement / acceptance                                                                                                            | Outcome and evidence |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Design identity     | UI-01: warm tokens, purposeful typography, shared control treatment; no unexplained generic template substitution                   |                      |
| Sign-in             | UI-02: real approved provider, pending/cancel/failure/expired/logout/no-membership; safe return; no role provisioning from UI       |                      |
| Role switch         | UI-03: visible Student/Instructor labels, pointer/Space and accessible checked state; single-role label; forged/revoked role denied |                      |
| Versioned workspace | UI-04: visible question/file/attempt/revision; draft edits never change submissions; instructor review separates approval/release   |                      |
| Next/Previous       | UI-05: ordered first/middle/final/single-question behavior, preserved views/text, final review, no submission from Next             |                      |
| Evidence links      | UI-06: correct historical lines, equivalent observation controls, focus retained, unavailable annotation safe                       |                      |
| Responsive/keyboard | UI-07: 320/768/1024/1440px, 200% zoom, keyboard, touch sizing, reduced motion, no page overflow; record tested combinations         |                      |
| Contrast/appearance | UI-01/UI-07: actual light/dark text/control/focus combinations; measured contrast and screenshots                                   |                      |
| Honest state        | UI-08: loading/empty/denied/saving/acknowledged/conflict/failed/pending/success; stale response, network loss, AI/manual fallback   |                      |
| Privacy             | AUTH-02/GRADE-04: student responses, DOM and caches exclude private references and unreleased assessments                           |                      |
| Verification        | Exact `npm run check` and appropriate integration/security results; snapshots are not live deployment proof                         |                      |

## Evidence and decisions

- Representative desktop/narrow screenshots and applicable themed/state variants:
- Automated checks actually run and exact results:
- Manual keyboard/state checks actually performed:
- Intentional departures: affected requirement, rationale, user/team approval evidence and updated design revision; otherwise return to owner:
- Findings returned to owner / repair and re-review:
- Untested combinations / blockers / next owner:
- Outcome: accept / return with findings / pending acceptance:
