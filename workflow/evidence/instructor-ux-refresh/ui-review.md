# UI review: instructor-ux-refresh

- Human owner: Darryl, instructor area; shared focus/authorization component.
- Source: codex/instructor-ux-refresh from 19311ae7a9f7f6fbae57f0f9ca588556ce8494b7.
- Design: docs/ui/design.md, warm-workbook-v1, user-approved instructor source-first refinement.
- Requirements: UI-01/03/04/05/06/07/08; AI-02/05; GRADE-01/02; AUTH-01/02.
- Writer: /root alone, window in workflow/Ownership.md. Review: self source review and synthetic browser interaction; no independent/human review.

| Review area         | Acceptance                                              | Outcome and evidence                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design identity     | UI-01 warm tokens and control hierarchy                 | Pass in inspected light/dark grading states; screenshots and verification.md. No marketing/dashboard substitution.                                                                          |
| Sign-in             | UI-02                                                   | Not changed; regression coverage is not new live sign-in acceptance.                                                                                                                        |
| Role switch         | UI-03 trusted context and recovery                      | Automated shared tests pass, including repeated/internal focus, coalesced checks, revocation and account/session changes. Live foreground flicker acceptance remains unverified.            |
| Versioned workspace | UI-04 private AI and explicit adoption/approval/release | Synthetic generation/adoption and separation observed; controller tests pass. Model prompt and fingerprints unchanged.                                                                      |
| Next/Previous       | UI-05 pinned question context                           | Browser Next/Previous and AI picker stay synchronized; source/feedback remain on the same question.                                                                                         |
| Evidence links      | UI-06 exact lines                                       | Existing presentation/controller and full-suite checks passed; source evidence logic retained. Full keyboard comment workflow not newly accepted.                                           |
| Responsive/keyboard | UI-07                                                   | Inspected grading 320/768/1440 and authoring 320/1024, no fixture page overflow; Enter disclosure and question-heading focus observed. 200% zoom and exhaustive keyboard matrix unverified. |
| Contrast/appearance | UI-01/07                                                | Light/dark visually inspected, existing theme tokens retained. Full measured contrast matrix unverified.                                                                                    |
| Honest state        | UI-08                                                   | Dirty/adopted/pending/ready states exercised; approval disabled when incomplete/invalid; manual assessment preserved.                                                                       |
| Privacy             | GRADE-04                                                | All captures synthetic. Reference opt-in remains explicit and off by default; React renders rationale as text. No student-owned code or release semantics changed.                          |
| Verification        | Required checks                                         | Full command hit two Worker timeouts; both passed serial rerun. See verification.md for exact outcomes and subsequent checks.                                                               |

Outcome: implementation ready for review; human/independent/staging acceptance pending. Intentional source-first instructor refinement recorded from the user's redesign request. No archive or deployment claimed.
