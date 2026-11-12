# Tasks

Implementation approval is confirmed. On 2026-11-08 Darryl accepted closure of tasks 4.2, 4.3, 4.5 and 5.4 with the evidence limitations recorded below; this decision does not establish that unperformed checks passed. Real submission/consumer integration remains pending. Requirements: GRADE-02–04, CON-05, IAL-01–11; warm-workbook-v1 UI-01/04/05/06/07/08.

## 1. Approval, ownership and test design

- [x] 1.1 Obtain Darryl's explicit brief and single-writer approval; record approved exact files/migration window in Ownership.md and this member log. Verify no Keith, authentication, production entrypoint or unrelated tracked work enters the delta. [IAL-01/09]
- [x] 1.2 Apply test-design/feature-implementation/UI iteration skills; map lifecycle/security/UI scenarios to tests and manual checks in this change's evidence. Verify the matrix covers missing ports, source joins, partial saves, approval, races, P4 and safe projections. [IAL-01–09]

## 2. Evidence boundaries and private manual revisions

- [x] 2.1 Add a separate strict assessment authoring schema using existing score/source/ID/error primitives; test partial score/explanation saves, precision/size/unknown-field rejection and complete approval validation. Document exact request/view payloads. [IAL-02/03]
- [x] 2.2 Implement injected authorization/submission/publication adapters and metadata-only assessment scope; test missing/forged/revoked/foreign authority, publication pinned after republish, source/hash/fingerprint mutation and no repository-private read before authorization. Document how the existing publication service is consumed. [IAL-01/09]
- [x] 2.3 Recheck migration numbering and add only assessment aggregate/revision/audit/receipt/visibility tables and immutable constraints. Test real local D1 reopen, unique attempt creation, stale saves and rollback; verify no submission/source/membership/publication copies. [IAL-01/02/05]
- [x] 2.4 Implement private create/load/save/history and explicit correction creation with revision checks, actor/time/manual provenance and approval invalidation. Test concurrent saves, incomplete feedback persistence, historical immutability and unchanged prior public release. Document repository ownership and pagination. [IAL-02/04/05]
- [x] 2.5 Implement exact criterion/source observations against immutable evidence, including empty/trailing-LF/Unicode ranges. Test foreign joins, wrapped logical lines, mismatched excerpts and all-or-nothing rejection; document line representation. [IAL-03]

## 3. Approval, release, withdrawal and producer reads

- [x] 3.1 Implement complete-feedback approval bound to exact revision and availability with reviewer audit; test incomplete rejection, edit invalidation, stale approval and approval privacy. Document separate save/approve/release states. [IAL-02/04]
- [x] 3.2 Implement C-REL release CAS, immutable numbered snapshots, currentness and scoped receipts atomically. Test same/different-key concurrency, changed payload, stale availability/head, child-failure rollback, authorization before replay and one release per assessment revision. Document exact release errors/retries. [IAL-04/05]
- [x] 3.3 Implement private correction history and P4 current/historical withdrawals with audited private reasons. Test tombstones, no revival, preserved newer current, once-only availability increment, matching retry and concurrent release/withdrawal; document transactional guarantees. [IAL-05/06]
- [x] 3.4 Implement authorized ReleaseReadPort/currentness and safe allowlists separately from private audit reads. Test no drafts/private fields, own-attempt/foreign denial, revoked access, stale tokens, historical supersession and release receipt after withdrawal returning no resurrected content. Document Keith cache/currentness responsibility. [IAL-07]
- [x] 3.5 Export public C-REL release/correction/currentness/withdrawal fixtures and reusable lifecycle conformance factory checks; execute against real local D1 producer with synthetic external ports, retain invalid fixture corpus, and label Keith consumer execution pending. [CON-05, IAL-05–07/09]

## 4. Guarded local composition and workbook

- [x] 4.1 Add thin injected guarded HTTP composition and a separate loopback-only synthetic assessment preview; test session/object/course/origin denial, bounded payloads, safe errors and absence from production routing/bundle. Document run/setup instructions and synthetic limitations. [IAL-01/09]
- [x] 4.2 Close pinned workbook and navigation work on Darryl's acceptance of existing implementation and evidence, subject to the limitations below. [IAL-02/08, UI-01/04/05]
- [x] 4.3 Close source-observation work on Darryl's acceptance of existing implementation and evidence, subject to the limitations below. [IAL-03/08, UI-06/07]
- [x] 4.4 Add separate approval/release actions, explicit correction/history and version-specific withdrawal confirmation. Test duplicate prevention, delayed/reordered acknowledgements, stale saves, failure/retry/session-loss and unsaved navigation recovery without falsely reporting success. [IAL-04–08, UI-04/08]
- [x] 4.5 Close the UI review on Darryl's acceptance of the evidence available, with missing checks explicitly recorded in the review. [IAL-08, UI-01/04/06/07/08]

Acceptance is a project decision, not evidence that all original checks passed. Pinned multi-question interaction, complete keyboard/announcement and invalid-evidence behavior, light/dark, 200% zoom, target size and full state matrix remain unverified. Independent review identified that malformed observation evidence can be highlighted without independently matching its excerpt to pinned source; navigation focus/announcements also need browser verification. The existing requirements remain in force. See workflow/evidence/instructor-assessment-lifecycle/ui-review.md.

## 5. Independent review and integrated verification

- [x] 5.1 Have one independent read-only quality reviewer inspect exact base/delta, contracts, transaction/privacy/security and UI races; record actual findings, repair confirmed defects and obtain focused re-review from the same reviewer. Distinguish source inspection from executed tests. [IAL-01–09]
- [x] 5.2 Run npm run check plus targeted local D1/security/controller/contract checks and source secret scan; record exact outcomes and remaining limitations. Verify production routes, Keith services, personal skills and detailed telemetry remain excluded. [GRADE-02–04, CON-05, IAL-01–09]
- [x] 5.3 Prepare handoff with exact producer source identity, runtime examples, reusable checks, owned files, executed evidence and one concise K1–K6 pending agreement packet; refresh external usage checkpoint and append redacted member-log results. Verify links and honest task states. [CON-05, IAL-07/09]
- [x] 5.4 Record Darryl's 2026-11-08 explicit decision to consider these tasks done. A complete manual checklist walkthrough was not reported and is not claimed. [IAL-01–09]

## 6. External integration gates — not completed by fixtures

- [ ] 6.1 Obtain actual Keith agreement on applicable K decisions/revised auth boundary and exact reviewed Darryl-owned SH-ID composition and Keith-owned SH-SUB producer revision, then run producer/consumer checks with real authorization and immutable submissions in a separately approved composition increment. [CON-05, IAL-01/07/09]

2026-11-12 continuation: the later recorded C-SUB fingerprint/key-scope decision governs the earlier proposal; see `workflow/handoffs/submission-integration-conflict-review.md`. A real-producer assessment lifecycle test is drafted but Miniflare setup failed with loopback EACCES before its assertions. Student release composition, exact shared writer coordination and the full journey remain outstanding; 6.1 remains unchecked. The instructor attempt-list parser is locally aligned with the producer's 1,000-row bound. UI evidence and manual acceptance remain pending (`workflow/evidence/real-submission-assessment-integration/ui-review.md`). [SUB-03/04, GRADE-02–04, AUTH-01–03, UI-04/05/06/07/08, warm-workbook-v1]

## Workflow follow-up

- Commit and rebase were separately authorized. Push/PR publication, merge and deployment require separate instruction.
- Real feature activation and remote migrations require reviewed integration and the existing release workflow, not fixture success.
- Do not archive while external integration gates remain unfinished.

## 7. Connected workflow — approved continuation

- [x] 7.1 Record Darryl’s expanded shared write window and DI/native-local test plan; verify inherited main specs remain authoritative. [IAL-10]
- [x] 7.2 Compose guarded assessment discovery/object authority/HTTP and safe instructor feedback read with existing auth/course/publication services; test missing/forged/revoked/foreign/CSRF denial and disabled real producer states. [IAL-01/07/10]
- [x] 7.3 Add explicit loopback development Worker composition with deterministic publication-pinned samples, preserving the authoritative local D1 store; test production/staging ignore injection, no sample account/submission storage and restart invariants. [IAL-09/10]
- [x] 7.4 Connect instructor navigation, safe return destinations, published-work review and assessment client/chrome to the real signed-in application; test route/context/acknowledgement/privacy behavior and build. [UI-01/04/07/08, IAL-10]
- [x] 7.5 Prepare/start the connected local sign-in workflow, apply local migrations and explicitly provision the existing owner’s local test-course membership; execute actual sign-in/publication/assessment lifecycle and record remaining browser/provider limitations. No remote changes. [IAL-10]
- [x] 7.6 Obtain focused independent review, repair findings and run full checks/secret scan; update handoff/UI evidence and present manual acceptance without claiming Keith integration. [IAL-01–10]

## 8. Approved interaction clarity — IAL-11

- [x] 8.1 Simplify shared account/navigation controls and auth/invitation wording; retain warm-workbook-v1, labels, pending locks and explicit revoke confirmation. [UI-01/02/07/08]
- [x] 8.2 Simplify instructor course/action/version-selection presentation without changing publication/assessment semantics or version boundaries. [UI-04/05/06/08]
- [x] 8.3 Independent source review, appropriate checks, actual browser evidence where available and honest manual acceptance checklist. [IAL-11, UI-01–08]

IAL-11 manual follow-up: Darryl rejected the first UX pass; the navigation and grading-list repair and its limited browser evidence are recorded in the UI review. On 2026-11-08 Darryl accepted closure of the discussed remaining tasks with the above limitations; no additional manual walkthrough is claimed.

## 9. Real submission integration

- [ ] 9.1 Complete real-D1 lifecycle/security verification and independent review of the request-bound C-REL consumer; record exact results and outstanding human UI acceptance (GRADE-02–04, SUB-03/04, AUTH-01–03, UI-04–08, warm-workbook-v1).
