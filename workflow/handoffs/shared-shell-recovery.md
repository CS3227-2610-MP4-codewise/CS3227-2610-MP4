# Handoff: shared-auth/shell consumer recheck

- Human owner: Darryl, shared auth/shell and instructor; Keith owns the existing student consumer/tests.
- Requirements: AUTH-01–03, COU-06/07, UI-02/03/07/08; `docs/ui/design.md`, `warm-workbook-v1`.
- Publication: [draft PR27](https://github.com/CS3227-2610-MP4-codewise/CS3227-2610-MP4/pull/27), branch `codex/shared-shell-recovery`, base `af1bc90fa47ed0b8726a46084ce642992c807e15`. Initial scoped producer commit `fe8f49b7f74db248344fe40ba47e8d99ef9334f6` was published before continuation, as requested. The final arrival source is pinned in [arrival source manifest](../evidence/local-shared-instructor-completion/shell-arrival-source-manifest.txt); the PR description pins the final code commit separately from any documentation-only head.
- Writer scope: shared switch/tests, auth entry/client/tests, role/recovery CSS, instructor fallback/course client and existing instructor identity props. Continuation after `fe8f49b` changes only shared switch/test product files. No student/backend/DTO/schema/migration edits, account/member/bootstrap data changes or provider/mail calls.
- Review: independent read-only `/root/shell_review` reviewed the initial repairs and was actually reused for the arrival continuation. Final continuation source review found no findings; independent shared suite31/31, main focused43/43. This is agent review, not Keith's exact-source acceptance or human manual acceptance.

## Exact consumer-visible behavior

| Boundary                            | Producer behavior                                                                                                                                            | Keith's focused check                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Acknowledged invitation join        | Existing `/workspace?role=student` and `/workspace?role=instructor` links match accepted roles; obsolete Student-unavailable text removed                    | Student-only, Instructor-only and dual join success; no link before acknowledged join; current roles remain server authorized                                |
| Shared revalidation                 | Reads `/api/auth/session`, `/api/courses/contexts`, applicable selected course and instructor bulk verification using existing same-origin/no-store requests | Account and protected reads may both request session; fixtures must not rely on one session reader                                                           |
| Missing/replaced session            | Any 401 takes priority over other failed checks; user ID/session-CSRF mismatch is session replacement; old protected content/account controls withheld       | Cross-tab sign-out, expiry, same-user new session, account replacement sharing the same role/course; visible focused Sign in recovery, no stale private page |
| Revoked role/course                 | Successful context omitting role is workspace removal; selected-course403/404 is denial; client role never grants authority                                  | Remaining workspace usable, foreign course still denied, old membership/receipts never reactivated                                                           |
| Network/provider/malformed response | Availability failure, not proof of role revocation; hide stale page and offer reload/course recovery                                                         | Network-only phase, malformed context and delayed401 behind another error; successful later contexts alone cannot unmask old account data                    |
| Role control                        | One native checkbox, `role="switch"`, stable name `Instructor workspace`; Student off/Instructor on; single-role label                                       | Replace radio assertions with switch checked=false/true; Space/pointer and native checked semantics, labels and one target                                   |
| Arrival/focus                       | Role reauthorized before navigation; destination heading focused after shared mask clears; role announced once per entry                                     | `/workspace?role=student` and Instructor opposite; later focus refresh does not repeat announcement or steal a newly chosen focus target                     |
| Unsaved/pending/stale               | Existing beforeLeave/beforeunload retained; pending duplicate suppression; cancelled departure restores usable focus and clears checking text                | Cancel dirty-work departure; retain text/role, no false save; stale/unmounted responses cannot navigate/overwrite the current check                          |

The public `SessionView` stays closed and unchanged. Instructor components pass already available AuthView identity to shared browser checking; there is no new API permission, duplicate identity store, role mutation or consumer-rich-content contract.

## Three exact student-test adjustments for Keith

Current unchanged `src/web/student/StudentWorkspace.dom.test.ts` was22pass/3fail against initial producer:

1. Line136: query `getByRole('switch', { name: 'Instructor workspace' })` and expect checked **false** in Student context, retaining the Workspace group/visible-label checks.
2. Lines431–436: activate that same switch from Instructor context, cancel `beforeLeave`, expect checked **true** and no new context/student request or departure. No hidden compatibility radios.
3. Line599: replace the session response queue tied to exact reader counts with phase-based replies shared by parent and shell. Ready phase succeeds for all readers; network phase returns only network failure for all readers; signed-out phase returns401 for all readers. The old queue supplies its future401 earlier because the shared shell also reads the session. Independent review confirmed this fixture coupling; do not weaken the terminal401 assertion.

Main leaves Keith's files untouched. These proposed test changes/source reviews require Keith; accepted broad C-ID/onboarding/K1–K6 decisions remain accepted and are not reopened. His previously recorded opposite-role dashboard integration is preserved, not relabelled missing.

## Reusable checks and remaining acceptance

Actual initial CI on `fe8f49b`:497/500 tests pass; only the three consumer-test assertions above fail, secrets check passes. [Redacted exact CI summary](../evidence/local-shared-instructor-completion/ci-summary.md). This is initial-revision evidence, not an assumed later-head result.

```text
npx vitest run src/web/ui/workspace-switch.test.ts src/web/auth/App.dom.test.ts src/web/auth/client.test.ts src/web/instructor/courses/client.test.ts --maxWorkers 1
npx vitest run src/web/student/StudentWorkspace.dom.test.ts --maxWorkers 1
npm run check
```

In this Windows sandbox, set process `TEMP`/`TMP` to `C:\Users\darry\AppData\Local\Temp` for tests; the injected temp path cannot rename Vite transforms. Do not modify product behavior to make a fixture pass. Local D1/Worker loopback checks were EACCES-blocked, and full check stops at pre-existing unrelated untracked demo-evidence lint excluded from this PR. Exact static/build outcomes and prior failures: [verification](../evidence/local-shared-instructor-completion/shell-verification.md).

Native/manual gate: actual Space both directions, destination focus and once-only spoken announcement, dirty beforeunload cancel/accept, session/membership/network recovery and race cases, 320/768/1024/1440px,200% zoom, light/dark and reduced motion. Earlier browser access failed before inspection; no screen-reader/native/visual result claimed. See the detailed checklist in verification. Next owner: Darryl manual acceptance; Keith source-specific consumer/test recheck. No merge/deployment or unfinished archival authorized by publication.
