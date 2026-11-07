# Course People — verification

Requirements COU-03/07, UI-01/07/08. Design warm-workbook-v1, with user-directed People navigation label recorded in docs/ui/design.md. Instructor-owned view only; no student feature implementation.

The roster derives active roles from active course memberships/accounts and pending roles from current role invitations. A single email row can show both, with email dispatch state separated from membership. Revoked invitations and inactive memberships are excluded. Resend/revoke applies to pending invitations; Remove from course deactivates all active course roles and revokes pending invitations for the same person/course in a guarded D1 batch. The account, other courses, and underlying audit records remain. A current instructor session, active account/course and current membership are rechecked in the listing query and removal transaction.

Focused isolated D1 suite passed 36 tests, including owner/active student, pending instructor, removal, revocation, and foreign-user denial. No live mail, staging or production mutation performed. Manual UI acceptance, keyboard, responsive widths, zoom and contrast checks remain pending. Independent review was not performed; no agent was requested for this increment.

Final `npm run check` passed 8 OpenSpec changes, typecheck, lint, 28 Vitest files / 306 tests, four deployment-workflow tests and build. After that run, one additional targeted test for revoked instructor authority inside the removal transaction passed (1 test; 36 skipped by filter). No product code changed after the full check. Manual UI/accessibility evidence and independent review remain pending.

## Course coordinator follow-up, 2026-11-08

A course creator with an active instructor membership is labelled Course coordinator from the existing course-creation receipt. A guarded D1 transaction denies that creator removing their own membership before changing memberships or invitations. Other current instructors remain governed by the existing removal policy; coordinator transfer and protection from removal by others were not requested. Courses without a trusted creation receipt are not assigned a coordinator by inference. Focused coordinator, roster and revoked-instructor tests passed 3/3. The isolated synthetic preview's Open synthetic instructor session restores its sample instructor membership and supplies a synthetic creation receipt; no remote data is touched. Human UI acceptance and independent review remain pending.

Coordinator follow-up full `npm run check`: 8 OpenSpec validations, TypeScript, ESLint, 28 Vitest files / 308 tests, four deployment-workflow tests and build passed. The synthetic restore endpoint returned HTTP 303; users can open the preview landing page and select Open synthetic instructor session to obtain a browser session. Independent review and manual UI checks remain pending.

## Synthetic preview navigation repair — 2026-11-08

The loopback auth preview previously routed `/api/auth/*` only, so `/workspace` could not obtain its course list even with a valid session. The preview now composes the existing course handler and authority over its isolated D1; it authorizes only the synthetic `/workspace` destination. A signed-in visit to `/sign-in` now redirects to the authorized workspace rather than showing a misleading placeholder. Browser verification observed the synthetic coordinator on People, clicked Courses and saw Synthetic course, then opened /sign-in and observed redirect back to the course list. This is synthetic preview evidence only; instructor assignment and assessment APIs are not supplied by this auth preview. Staging/production, live Firebase/Gmail and real delivery were not tested.

After the synthetic navigation repair, `npm run check` passed 8 OpenSpec changes, TypeScript, ESLint, 28 Vitest files / 308 tests, four deployment tests and build. Independent review and full manual UI/accessibility acceptance remain pending.

## Synthetic assignment-preview follow-up — 2026-11-08

The screenshot showed the assignment client parsing Vite's HTML fallback as JSON because /api/instructor was not composed in the auth preview. The loopback preview now applies the existing assignment and assessment migrations and composes the existing guarded assignment/assessment services against isolated D1 and synthetic identity; this supersedes the earlier statement that assignment APIs are absent. The assignment client replaces malformed non-JSON responses with a safe unavailable message. Browser inspection opened the synthetic People page, selected Assignments, saw the empty list and created one synthetic draft. Preview data is ephemeral. No real provider, submission integration, staging, production or live email was used; the assessment workflow has no submission producer and must remain honestly unavailable where required. Independent review and human acceptance remain pending.

After the synthetic assignment-preview repair, `npm run check` passed 8 OpenSpec validations, TypeScript, ESLint, 28 Vitest files / 308 tests, four deployment tests and build. Browser synthetic assignment list and draft creation were verified; no independent review or live submission integration claimed.
