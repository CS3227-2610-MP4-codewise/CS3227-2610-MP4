# Connected local instructor workflow

This is the approved IAL-10 continuation on `codex/instructor-assessment-lifecycle`. Run from this worktree:

```powershell
npm run dev:workflow -- --setup-owner-course
```

Open http://127.0.0.1:8787/sign-in. Sign in with the existing local owner account. Open **Local workflow test**, then **Assignments** to create/save/publish, or **Assessments** to review a publication and explicitly open its sample assessment. A published local verification assignment and released sample assessment are already present.

The first startup option explicitly grants the existing active owner instructor membership in this local test course through the existing course operator plan. Subsequent starts may omit the option. The runner uses the original checkout's ignored `.dev.vars` and `.wrangler/state`: one local account/session/course database, preserved across worktree changes. AUTH_ORIGIN must be http://127.0.0.1:8787. It builds browser assets and applies local migrations only. It neither sends invitations nor deploys or touches remote databases.

Real Firebase login, trusted D1 sessions, existing course authority and publication persistence are used. Only immutable submitted source is synthetic: `samples.ts` deterministically supplies publication-pinned starter source, marked sample. No learner account, submission store or duplicate membership store is created. The sample adapter is injected only by this loopback development entry; normal staging/production composition cannot use it. Missing real submission integration reports unavailable.

Endpoints use real session/object/course authorization and CSRF/origin checks. Assessment writes reuse the existing assignment repository's same-D1 authority guard, including session/membership revocation within the write transaction. `/api/instructor/assessments/:id/feedback/:version` is an instructor-authorized public-payload preview, not student impersonation or a student feature route.

Producer checks: `npx vitest run workflow/connected-preview/connected.test.ts`. Existing C-REL fixtures and reusable consumer checks remain in `../assessment-preview/`; no new competing contract. Current application producer source is b9f3f6de496db9581cd44bb9abaa50219698d604; see the handoff and ux-source-manifest.json. Historical connected manifests record earlier verification snapshots. This does not claim deployment or real submission integration. Keith's real SH-SUB and consumer acceptance remain pending.

Manual acceptance: sign in; open the test course; create/save/reopen/publish an assignment; open its sample assessment; score and add an exact-line observation; save/reopen; approve then release; inspect public preview; create a correction and confirm approval invalidates after editing; release correction; withdraw current/historical feedback and inspect tombstones; sign out. Check keyboard/focus, narrow layout and zoom. Automated API checks do not replace this checklist.
