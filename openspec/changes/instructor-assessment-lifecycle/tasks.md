# Tasks

Implementation approval is confirmed; UI/manual acceptance and real submission/assessment-authority composition remain pending. Main969a062 governs existing specs and ownership. Checkboxes below measure work/evidence, not planning file existence. Requirements: GRADE-02–04, CON-05, IAL-01–09; warm-workbook-v1 UI-01/04/06/07/08 and UI-05 for pinned multi-question navigation.

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
- [ ] 4.2 Build pinned question/rubric/read-only source and manual score/explanation workbook using warm-workbook-v1 tokens. Test pinned multi-question navigation, incomplete saved forms, reopen and no historical source substitution; document state/navigation controls. [IAL-02/08, UI-01/04/05]
- [ ] 4.3 Add exact-line markers, equivalent labelled observation controls and concise proportional-text notes; verify keyboard operation, trigger focus, announcements, line identity/wrapping and invalid-evidence state. Record actual accessibility evidence. [IAL-03/08, UI-06/07]
- [x] 4.4 Add separate approval/release actions, explicit correction/history and version-specific withdrawal confirmation. Test duplicate prevention, delayed/reordered acknowledgements, stale saves, failure/retry/session-loss and unsaved navigation recovery without falsely reporting success. [IAL-04–08, UI-04/08]
- [ ] 4.5 Complete workflow/templates/ui-review.md under this change's evidence with actual desktop/narrow light/dark screenshots,320px and200% zoom,44px targets, focus/keyboard/reduced-motion checks and asynchronous/empty/denied states. Leave unavailable/manual checks open. [IAL-08, UI-01/04/06/07/08]

## 5. Independent review and integrated verification

- [x] 5.1 Have one independent read-only quality reviewer inspect exact base/delta, contracts, transaction/privacy/security and UI races; record actual findings, repair confirmed defects and obtain focused re-review from the same reviewer. Distinguish source inspection from executed tests. [IAL-01–09]
- [x] 5.2 Run npm run check plus targeted local D1/security/controller/contract checks and source secret scan; record exact outcomes and remaining limitations. Verify production routes, Keith services, personal skills and detailed telemetry remain excluded. [GRADE-02–04, CON-05, IAL-01–09]
- [x] 5.3 Prepare handoff with exact producer source identity, runtime examples, reusable checks, owned files, executed evidence and one concise K1–K6 pending agreement packet; refresh external usage checkpoint and append redacted member-log results. Verify links and honest task states. [CON-05, IAL-07/09]
- [ ] 5.4 Present the manual assessment/save/reopen/observe/approve/release/correct/withdraw checklist and obtain Darryl's explicit acceptance; retain failures/pending checks rather than claiming completion from screenshots or synthetic fixtures. [IAL-01–09]

## 6. External integration gates — not completed by fixtures

- [ ] 6.1 Obtain actual Keith agreement on applicable K decisions/revised auth boundary and exact reviewed Darryl-owned SH-ID composition and Keith-owned SH-SUB producer revision, then run producer/consumer checks with real authorization and immutable submissions in a separately approved composition increment. [CON-05, IAL-01/07/09]

## Workflow follow-up

- Commit and rebase were separately authorized. Push/PR publication, merge and deployment require separate instruction.
- Real feature activation and remote migrations require reviewed integration and the existing release workflow, not fixture success.
- Do not archive unfinished acceptance or external integration gates.
