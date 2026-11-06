# UI review: shared-authentication Firebase/Brevo

- Owner Darryl, SH-AUTH only; student/course authorization remains Keith.
- Candidate: codex/shared-authentication producer 386b681cf8b352374e748a329691ac158b1cc132, firebase-source-manifest.json. Existing PR8 is historical Google revision.
- Design: docs/ui/design.md warm-workbook-v1 plus explicit 2026-11-06 provider-backed password/recovery policy addendum.
- Requirements: AUTH-01–03, CON-03/07, SHA-01–10; UI-01/02/07/08.
- Named writer: Darryl. Independent auth_review inspected security/UI source; main performed synthetic browser observations and checks. No human or Keith acceptance inferred.

| Area                    | Actual result                                                                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-01 design identity   | Partial pass: existing workbook tokens/layout/primitives preserved; narrow dark invitation view visually inspected in browser. No full contrast measurement or saved screenshot matrix.                                             |
| UI-02 identity/recovery | Local code/tests pass; browser observed captured invitation → password setup and fragment removal. Real Firebase/password/recovery/inbox remains unverified.                                                                        |
| UI-03 switch            | Not applicable; no role switch added or permission granted.                                                                                                                                                                         |
| UI-04/05/06 domain work | Not applicable; assignment/submission/feedback/navigation services unchanged.                                                                                                                                                       |
| UI-07 accessibility     | Source provides labels, password show/hide, autocomplete, disabled pending controls and existing44px primitives; narrow view observed. Full320/768/1024/1440, keyboard, reduced-motion/native200% and both-theme matrix unverified. |
| UI-08 truthful state    | Synthetic browser shows queued email separately from pending invitation; tests cover missing Keith, unknown mail and invalid/replayed proofs. Full network-loss and stale-session visual matrix unverified.                         |
| Privacy                 | Capabilities stripped from auth URL before requests, no role/payload authority in browser, runtime DTO allowlists and no fixture production composition. Real mail tracking/link privacy still gated.                               |
| Verification            | 169 Vitest+4 Node, strict specs/types/lint/build and Worker dry-run pass; local checks are not live integration.                                                                                                                    |

No unexplained visual departure intended. The deliberate auth-policy change is provider-backed password/recovery in the existing workbook design, approved through Darryl's provider selection and authorization to code. Course context comes from the future workspace navigation and is reauthorized server-side; UI does not ask users to type implementation IDs.

Manual checklist pending: try synthetic invitation/setup/login/recovery with invented credentials, invalid/expired proof/fresh-email/cancel, session logout and unavailable course state; inspect keyboard/focus and required widths/themes/native zoom. Separately configure providers and consented NUS inbox plus Keith authority, then perform real sign-in/reset/revocation and destination checks. Final outcome: pending Darryl acceptance and real integration.
