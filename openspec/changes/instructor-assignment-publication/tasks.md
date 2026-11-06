# Instructor assignment publication tasks

Schema: spec-driven. Design reference: `docs/ui/design.md`, `warm-workbook-v1`. Applicable requirements: SUB-01, AUTH-02, IAS-01–IAS-07; UI-01/UI-04/UI-05/UI-07/UI-08 only for this instructor slice. All implementation and live integration checks remain incomplete until actually performed.

## 1. Approval and contracts

- [x] 1.1 Obtain Darryl's explicit approval of the combined brief and exact expanded shared-file/migration/local-harness writer window in design.md; record it before product edits (SUB-01, AUTH-02, UI-01/UI-08). Approved by Darryl on 2026-11-06.
- [x] 1.2 Add a separate bounded instructor authoring schema and request/response contract while reusing existing strict C-PUB/P1–P3 rules; verify incomplete/complete/unknown-field/size/precision/source tests and document draft versus publication semantics in the same increment (IAS-01/03/05).

## 2. Draft service and persistence

- [x] 2.1 Recheck next migration number, add the instructor-only D1 schema and repository with parameterized metadata/private/public reads; verify actual local migration, key/foreign constraints, source preservation and no duplicate user/course/submission tables (IAS-01/03/05, AUTH-02).
- [x] 2.2 Implement injected create/list/get/save draft services and scoped create retries; verify session/course/object/origin denial before private operations, exact reopen after local restart and atomic expected-revision save/conflict behavior (IAS-01/02/05).
- [x] 2.3 Document the private authoring contract and object-scope resolver seam alongside synthetic create/save examples; verify fields/errors against runtime schemas and keep real C-ID/K1–K6 acceptance pending (IAS-01/05/07).

## 3. Immutable publication and consumer projection

- [x] 3.1 Implement exact saved-revision validation and immutable version construction with preserved logical IDs; verify missing content/deadline/duplicate keys/score/source limits and reference-only/deadline-only republish cases (IAS-03, SUB-01).
- [x] 3.2 Persist root receipt and normalized snapshot sets atomically using a revision-abort guard and bounded statement count; verify real local-D1 stale-save/publish races, concurrent identical keys, different-payload reuse, injected child failure rollback and maximum supported 20×50 short-criterion fixture (IAS-03/04).
- [x] 3.3 Implement distinct authorized instructor private-history and public C-PUB reads; verify immutable UPDATE/DELETE refusal, old snapshot identity/content preservation, explicit allowlists/public SQL projection and no private references in public results/errors (IAS-03/05).
- [x] 3.4 Produce exact synthetic publish/public/private-version payloads and reusable C-PUB producer checks for Keith; document actual local-D1 behavior and pending real consumer integration (IAS-04/05/07).

## 4. Guarded local composition and UI

- [x] 4.1 Add an opt-in loopback preview backed by persistent local D1, required injected synthetic session/course/object adapters and guarded transport; verify Host/Origin/session/forged identity refusal and production build/routing exclusion before UI integration (IAS-05/07).
- [x] 4.2 Implement warm-workbook assignment rows, draft form and question/rubric/reference editing with shared tokens/controls; verify labels, bounded fields and centralized inactive-question edit retention using focused controller tests (IAS-01/06, UI-01/UI-04/UI-05/UI-07).
- [x] 4.3 Implement explicit save, revision-aware statuses, conflict/failure recovery, review and separate publication confirmation/history; verify late acknowledgements/selection races/new edits, duplicate pending/retry keys and no navigation-triggered publish/submission (IAS-02/04/06, UI-05/UI-08).
- [x] 4.4 Run the actual local-D1 UI workflow create/save/reopen/edit/publish/republish/history; complete workflow/templates/ui-review.md under this change's evidence with screenshots, light/dark/responsive/keyboard/contrast/zoom outcomes and honest unavailable checks (IAS-01/06/07, warm-workbook-v1, UI-01/UI-04/UI-05/UI-07/UI-08).

## 5. Review, checks and handoff

- [x] 5.1 Obtain independent functional/security/UI review, repair confirmed findings and return focused repairs to the same reviewer; record actual reviewer identity, owned files, returns and re-review limitations (AUTH-02, IAS-02/03/05/06/07).
- [x] 5.2 Run npm run check plus publication contract/security/local-D1/build-isolation checks after repairs; verify exact results rather than treating synthetic identity as real auth/deployed integration (SUB-01, AUTH-02, IAS-01–IAS-07).
- [ ] 5.3 Complete one Darryl-owned increment log, evidence and Keith handoff with exact producer/contract/migration versions, synthetic payloads, actual checks/UI review, resource checkpoint and next owners; obtain Darryl's manual acceptance and leave real auth/consumer/K1–K6/deployment tasks pending (IAS-07, UI-08).

## 6. Manual-review refinement

- [x] 6.1 Separate assignment list and dedicated authoring page per Darryl's2026-11-06 feedback; verify acknowledged create navigation, saved open/reload/back, hidden list, unsaved-navigation protection and denied heading privacy; obtain independent focused source review and update UI evidence (IAS-01/02/05/06, UI-01/07/08).

## 7. Manual-review UX cleanup after committed baseline62da9f2

- [x] 7.1 Preserve warm-workbook-v1 while simplifying task order/labels, action priority, rare-control disclosures and read-only published rendering; retain explicit save/review/publish and permission/revision boundaries (IAS-02/05/06, UI-01/04/05/08).
- [x] 7.2 Verify question/criterion-specific validation recovery, native keyboard disclosures and first-question focus, actual save/review/publish/read-only workflow, all4 widths/both appearances and minimum targets; repair independent review findings and record limits (IAS-03/06/07, UI-07/08).
- [x] 7.3 Record separate UX source/evidence snapshot and handoff/checks while preserving prior history; final human acceptance remains in5.3 and real integration/deployment stay pending (IAS-07).

## Workflow follow-up

- Real authentication/authorized route composition and Keith consumer integration require their real reviewed producer handoffs and joint decisions; do not implement them as a substitute in this change.
- Do not archive unfinished changes. Commit, push, merge and deployment require separate applicable instruction; no ad hoc production migration is authorized.

Implementation records/handoff/resource checkpoint are complete. Task5.3 remains unchecked solely pending Darryl final manual acceptance; real identity/consumer/deployment gates remain pending.
