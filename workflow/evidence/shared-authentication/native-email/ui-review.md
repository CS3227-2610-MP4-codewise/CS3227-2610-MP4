# UI review: shared-authentication native email

- Human owner: Darryl, SH-AUTH; source: uncommitted auth branch based on b169c11. Keith owns course/object authorization and has supplied no producer/review here.
- Design: docs/ui/design.md, warm-workbook-v1; AUTH-01–03 SHA-05/08/09/11 UI-01/02/07/08.
- Writer: Darryl sole shared/auth writer; independent auth_review source review plus main synthetic browser smoke. No new visual redesign; pre-existing UI clarity work preserved.
- Evidence: setup-browser.jpg, invalid-browser.jpg, verification.md; older ui-clarity evidence remains separately scoped.

| Review area | Outcome/evidence |
| --- | --- |
| UI-01 design identity | Existing layout/palette/components reused; synthetic setup screenshot captured. No new CSS in this replacement. Full appearance matrix unverified here. |
| UI-02 sign-in/setup | Pass local synthetic handler display and URL cleaning; independent live-Location bug repaired/regression. Real Firebase/mail/login unverified. |
| UI-03 role switch | Not applicable to bounded handler change; no role grant added. |
| UI-04 versioned work | Not applicable; no assignment/submission edits in replacement. |
| UI-05 Next/Previous | Not applicable; no change. |
| UI-06 evidence links | Not applicable; no change. |
| UI-07 responsive/keyboard | Existing controls reused; browser screenshot/AX confirms labelled password/confirmation, save and renewal/cancel controls. Full320/768/1024/1440/light/dark/native200%/keyboard/reduced-motion matrix remains unverified here. |
| UI-08 honest state | Pass local synthetic external continuation invalid-link/recovery state; native receipts tested queued/failed/unknown, no delivery claim. Real delivery unavailable until configured and Keith connected. |
| Privacy | Proof query/fragment stripped before bootstrap; exact origin/action/path enforced; no persistent credentials/browser role authority. Backend tests reject mailbox/ticket mismatch. Actual platform/mail logging privacy unverified. |
| Verification |173 Vitest+4 Node/specs/types/lint/build passed; Worker dry-run and source-export secret scan passed. Local synthetic evidence only. |

Manual acceptance remains pending; see verification.md checklist. Source review is not Keith's boundary acceptance or a live deployment.
