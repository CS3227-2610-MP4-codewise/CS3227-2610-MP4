# Composed acceptance: student-assignment-dashboard (task 5.1)

- **Who:** Keith, manual testing in the real local app (`npm run dev:api`, `http://127.0.0.1:8787`). Recorded by main `/root` (Implementer) from Keith's report; `/root` did not observe the browser sessions.
- **Date:** 2026-11-10.
- **Consumer revision:** `8a7951f5452c643172ef1945f53a9ecbedcda111` (branch `keith/student-assignment-dashboard`, PR #25).
- **Working tree during testing:** `package.json` and `package-lock.json` were modified locally. The changes add an unused `firebase` dependency and change the `typescript-eslint` version. No source under `src/` imports `firebase`, so the served app is unaffected. These changes are not part of the change and are not to be committed.
- **Environment:** Keith's own local Firebase project and local D1 (`codewise-development`). Gmail delivery was enabled for consented NUS inboxes. No staging or production data or deployment was used. Credentials stayed in the ignored `.dev.vars` file.
- **Requirements:** SD-01/04/05, COU-06/07, AUTH-01–03, UI-03.

## Setup issues found and fixed (local configuration only)

| Symptom                            | Cause                                                                                                                  | Fix                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Sign-in page showed "unavailable"  | `FIREBASE_PROJECT_ID` and `FIREBASE_API_KEY` were swapped in `.dev.vars`                                               | Values swapped back; server restarted    |
| Sending an invitation returned 503 | `AUTH_MAIL_ENABLED=false`, so no mailer was configured                                                                 | Set to `true` for a consented local test |
| Invitation delivery state "failed" | Gmail SMTP AUTH returned `535 5.7.8 BadCredentials`; Firebase service-account token and admin lookup both returned 200 | Gmail app password replaced              |

## Results (as reported by Keith)

| Check                                                                                                                                           | Outcome                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opposite-role invitations accepted, both directions (Student → also Instructor, Instructor → also Student)                                      | Pass                                                                                                                                                                                                                                                      |
| Dual roles: same course and different courses; switch, course lists and Student-only listing                                                    | Pass                                                                                                                                                                                                                                                      |
| Assignments: newly published assignment appears; republish links the new version; old version link keeps old text; no drafts or private content | Pass                                                                                                                                                                                                                                                      |
| Access removed while signed in (last role in a course removed; sessions revoked); remaining role still works                                    | Pass                                                                                                                                                                                                                                                      |
| Forged URLs (`?role=admin`, other course IDs, other-course version IDs, made-up IDs) show the same "unavailable" with no data                   | Pass                                                                                                                                                                                                                                                      |
| First Student invitation acceptance; student-only account reaches the Student dashboard via `/workspace`                                        | Pass (finding 1 workaround)                                                                                                                                                                                                                               |
| Reload of each student page; session loss, then sign-in landing on `/workspace`                                                                 | Pass                                                                                                                                                                                                                                                      |
| More than 100 memberships (105 synthetic Student courses via `workflow/student/seed-courses.mjs`): page 1 shows 100 courses and a Next control  | Pass after repair: Next first rendered blank (finding 2); after the repair Next is readable in light and dark, page 2 lists courses 100–105 with First page, reload keeps page 2, First page returns to page 1, the real course is still listed and opens |

## Findings

1. **Post-join page tells students the dashboard is unavailable (open, SH-AUTH).** After accepting a Student invitation, the join confirmation page shows "The Student workspace is not yet available." and offers no link for the Student role. The source is `src/web/auth/client.ts:12` (`joinedWorkspaceMessage`) and `src/web/auth/App.tsx:400–407`, written before the dashboard existed. Workaround: open `/workspace` (student-only accounts) or `/student`. The fix belongs to Darryl's SH-AUTH files, outside Keith's writer window: change the message, link to the Student workspace, and update `src/web/auth/client.test.ts`. Not repaired in this change.

2. **Next and Sign in action links rendered blank (repaired).** Keith's screenshot of the 105-course list showed the Next control as an empty filled box. Cause: `.cw-student a { color: var(--cw-ink) }` in `src/web/student/student.css` out-ranked the shared `.cw-action` text colour, so the label and icon were ink on an ink fill in both themes. The expired-session Sign in link used the same style. Repair: the rule now applies to `a:not(.cw-action)`. A regression test in `src/web/student/model.test.ts` fails before the repair and passes after; `src/web/student` tests 30/30, Prettier and ESLint clean, `npm run build` succeeds. Keith rechecked it in the browser and confirmed it fixed.

## Local helper added

- `workflow/student/seed-courses.mjs` (plan in `seed-courses-plan.mjs`, tests in `seed-courses.test.ts`, 2/2 pass): gives one operator-identified, active local account Student membership in N synthetic courses (`synthetic-student-NNN`, at most 300), fixed to the local `codewise-development` D1. `remove` deactivates them.

## Not yet verified

- Hosted (staging) composition; this run is local only.
- No independent reviewer observed the runs; results are Keith's reports.
- Removal of the synthetic courses (`seed-courses.mjs remove`) is Keith's local clean-up and is not evidenced here.

## Outcome

Task 5.1 complete on 2026-11-10 (as reported by Keith). Producers were the SH-AUTH, course-authority and onboarding code at main `3a7e5e4`, composed with consumer `8a7951f` plus the uncommitted CSS repair (finding 2). Course-onboarding task 4.3 is complete on the same evidence. Finding 1 is handed to Darryl as an SH-AUTH follow-up.
