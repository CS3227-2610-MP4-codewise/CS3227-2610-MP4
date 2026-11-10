# Run variant B locally (port 8788)

Run from the variant B worktree (`/Users/keith/Documents/CS3227-2610-MP4/.claude/worktrees/agent-ab0c9394b1b3cfe58`, branch `keith/student-drafts-ui-b`). Local D1 state is per worktree (`.wrangler/`), so this does not touch the main checkout's database.

```sh
cd /Users/keith/Documents/CS3227-2610-MP4/.claude/worktrees/agent-ab0c9394b1b3cfe58

# 1. Secrets: copy, never commit (.dev.vars is git-ignored). The origin must match the port.
cp /Users/keith/Documents/CS3227-2610-MP4/.dev.vars .dev.vars
sed -i '' 's#^AUTH_ORIGIN=.*#AUTH_ORIGIN=http://127.0.0.1:8788#' .dev.vars

# 2. Dependencies and local migrations (includes 0015_student_submissions)
npm ci
npm run db:local

# 3. A local student account. Sign in once at /sign-in with your own local account first
#    (see workflow/auth/SETUP.md), then find its identifiers:
npm run auth:local -- accounts
#    Then seed one synthetic course plus the published assignment (2 questions, deadline +30 days):
node workflow/student/seed-courses.mjs seed 1 <account-id> <issuer> <subject>
node workflow/student/seed-courses.mjs seed-work 1 <account-id> <issuer> <subject>

# 4. Build and serve
npm run build && npx wrangler dev --env development --port 8788
```

Open `http://127.0.0.1:8788/sign-in`, sign in, then open
`http://127.0.0.1:8788/student/assignments/synthetic-work-publication/work/1`
(or Courses, Synthetic course 001, the assignment, "Open my work").

The account must be the same one whose identifiers you passed to the seed commands. Use `127.0.0.1`, not `localhost`, so the cookie origin matches `AUTH_ORIGIN`.

## What I actually ran

- `cp .dev.vars` and the `AUTH_ORIGIN` edit, `npm ci`, `npm run db:local`: all succeeded (migrations 0001-0015 applied).
- I could not sign in: sign-in goes through the real Firebase project using your credentials, and I did not use them. Instead I created a **synthetic** local account row with `npm run auth:local -- bootstrap-firebase synthetic-project synthetic-uid-1 synthetic.student@u.nus.edu` (cannot sign in; no Firebase user exists) and ran both seed commands against it: `synthetic_student_memberships: 1`, `synthetic_work_questions: 2`.
- `npm run build && npx wrangler dev --env development --port 8788` started ("Ready on http://localhost:8788"). `GET /student/assignments/synthetic-work-publication/work/1` returned 200 HTML referencing the main bundle, the lazy `Workbook-*.js` chunk returned 200, and `GET /api/student/publications/synthetic-work-publication/work` without a session returned 401 `UNAUTHENTICATED`. I stopped the Worker afterwards.
- Not verified: the authenticated workbook against the real Worker (sign-in, save, submit). Use the bootstrap owner or your invitation flow to get a real session. If you reuse the synthetic row for seeding, you must sign in as an account that has the same issuer and subject, which needs a real Firebase user.
