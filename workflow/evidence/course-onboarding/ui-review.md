# UI review: course-onboarding planning

- Human owner: Darryl for shared/instructor; Keith for student consumer.
- Source: uncommitted docs on codex/course-onboarding-plan, baseline a05d5ba. PR none.
- Design: docs/ui/design.md, warm-workbook-v1. IDs: COU-01–07, AUTH-01–03, UI-01/02/03/04/07/08.
- Writer window: shared planning only, Darryl; producer/consumer runtime revisions not yet supplied for this target.
- Reviewer: reused contracts_review, independent document inspection. Main inspected current source/schema and runs validation. No rendering/manual review claimed.
- Evidence: workflow/evidence/course-onboarding/verification.md.

| Review area | Requirement / planned acceptance | Outcome and evidence |
| --- | --- | --- |
| Design identity | UI-01 workbook tokens/type/brand, concise course/invite forms | Not applicable to rendering: docs only; design explicitly preserved. Runtime acceptance pending. |
| Sign-in | UI-02 new password versus registered existing-password join, wrong account/expired proof/retry | Planning scenarios included COU-04/05; actual UI/runtime unverified. |
| Role switch | UI-03 Student/Instructor labels, Space, trusted contexts, role-filtered course lists, unsaved work/revocation | Planning covered COU-06/07 including roles in different courses; no rendered switch/Keith consumer verified. |
| Versioned workspace | UI-04 course context/switch protects drafts and immutable history | Design/tasks require preservation; runtime change not applicable here. |
| Next/Previous | UI-05 ordered question behavior | Not applicable: no question navigation changes planned. Existing safeguards retained. |
| Evidence links | UI-06 source/observation identity | Not applicable: no source observation changes planned. Existing version boundaries retained. |
| Responsive/keyboard | UI-07 narrow/desktop/zoom/focus/announcements/touch/reduced motion | Runtime/screenshots not applicable to docs-only change; explicit later checks in tasks2.3/3.5/4.2/5.2. |
| Contrast/appearance | UI-01/07 light/dark | Not applicable: no CSS/assets/UI implemented; future matrix remains pending. |
| Honest state | UI-08 no course before acknowledged create/join; provider partial failures, no false delivery | Planned COU-02–07 scenarios/design; no actual UI/protocol success claimed. |
| Privacy | AUTH-02 server role filtering, wrong-recipient denial, no browser-granted access | Source/design review accepted; future producer/security/consumer tests required. |
| Verification | Strict specs + project checks, not live integration proof | See verification.md for executed results; no hosted claim. |

## Evidence and decisions

- Screenshots/rendering/keyboard tests: not applicable; application unchanged. Do not reuse earlier feature screenshots as proof of these planned flows.
- Product policy: user request confirmed; Darryl SH-ID owner explicitly reconfirmed after conflicting guidance was surfaced.
- Intentional design departures: none. Shared UI-03 applies at account level with role-specific course lists; reviewed product refinement documented, no visual redesign.
- Review findings: ownership conflict resolved by user reply; no other material planning finding. Overlong requirements shortened for strict validation without removing scenarios.
- Remaining: implementation, exact reviewed DTO/migration/retry contracts, Keith student consumer, all actual UI/mail/hosted/manual acceptance checks.
- Outcome: plan reviewed; UI implementation and manual acceptance pending.
