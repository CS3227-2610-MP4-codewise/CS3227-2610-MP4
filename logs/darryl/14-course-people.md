# Course People — prompt experiments

Owner: Darryl. Requirements: course-onboarding COU-03/07, UI-01/07/08, warm-workbook-v1. Branch codex/invitation-identity-recovery, based on PR15 local revision b709d3b.

## Prompt PEOPLE-01 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Replace invitation-queue presentation with an instructor-facing People page showing course members and pending invitations.

### Agents spawned

- **New agents:** None; bounded server and UI work remained with the main agent. User had previously questioned delegation overhead; independent reviewer was not explicitly requested for this prompt.
- **Reused agents:** None. Independent review was not performed.
- **Main agent:** /root; model unavailable. Historical unknowns unavailable.

### Token count

**Usage report for PEOPLE-01:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main shared turn | 12870532 | 12846592 | 7681 | 12878213 | turn-c52723bb9e4ca98d6fb2d3eb | provisional; shared with PEOPLE-02 |
| Children | 0 | 0 | 0 | 0 | observed none | final activity |

- Project-scoped private recorder, 2026-11-08. Per-prompt allocation unavailable; count shared turn-c52723bb9e4ca98d6fb2d3eb once across both prompts. Later calls and final excluded; cached/reasoning are subsets. Reconcile at next checkpoint. No controlled comparison.

### Experiment outcome

- Implemented instructor-only roster over existing D1 memberships and pending invitations, grouped by email; current membership and pending roles are distinct. Exact-course/session authorization rechecked in read and removal transaction. No student service or duplicate store added.
- Full npm run check passed 8 specs, typecheck, lint, 28 Vitest files / 306 tests, four deployment tests and build. A subsequent focused same-D1 authority-loss test passed; no product changes after full suite. UI/manual and independent review remain pending. See workflow/evidence/course-onboarding/course-people/verification.md and handoff.
- No live mail, remote data mutation, deployment or commit performed. Next owner Darryl for UI acceptance and review, Keith for composed boundary cross-review.

## Prompt PEOPLE-02 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Clarify that revoked or removed people should leave the list, and improve role/status fields and actions.

### Agents spawned

- **New agents:** None; this clarification was handled in the active main-agent implementation.
- **Reused agents:** None; independent review was not performed.
- **Main agent:** /root; model unavailable.

### Token count

**Usage report for PEOPLE-02:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main shared turn | 12870532 | 12846592 | 7681 | 12878213 | turn-c52723bb9e4ca98d6fb2d3eb | provisional; shared with PEOPLE-01 |
| Children | 0 | 0 | 0 | 0 | observed none | final activity |

- Per-prompt allocation unavailable; count shared source turn-c52723bb9e4ca98d6fb2d3eb once. Project-scoped private recorder; later calls and final excluded; cached/reasoning are subsets. Reconcile next checkpoint. No controlled comparison.

### Experiment outcome

- Current roster excludes revoked invitations and inactive memberships; removal deactivates course roles and revokes pending invitations in a guarded transaction. Explicit UI status separates Active, Awaiting acceptance and email dispatch. People label updates the user's explicit navigation decision in the design reference.
- Full and focused checks, limitations and next owner recorded in PEOPLE-01 and linked evidence. No live operation or user acceptance inferred.

**PEOPLE-01/02 reconciliation, 2026-11-08:** Completed shared turn-c52723bb9e4ca98d6fb2d3eb: input 17514824, cached 17487616, output 11326, total 17526150. Replaces the provisional snapshot; count once for both prompts and do not allocate per prompt.

## Prompt PEOPLE-03 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Ask for a stable local preview link.

### Agents spawned

- **New agents:** None; starting the existing loopback preview is a bounded local action.
- **Reused agents:** None.
- **Main agent:** /root; model unavailable. Unknown historical activity unavailable.

### Token count

**Usage report for PEOPLE-03:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 390138 | 389888 | 259 | 390397 | turn-f38cf036ab576ee1d70a55a2 | provisional; incomplete |
| Children | 0 | 0 | 0 | 0 | observed no agents | final activity |

- Project-scoped private recorder, 2026-11-08. One prompt in source group; later calls and final response excluded. Cached/reasoning are subsets; reconcile next checkpoint. No controlled comparison.

### Experiment outcome

- Started `npm run dev:auth`; Vite reported loopback ready on 127.0.0.1:5176 and preview page returned HTTP 200. The URL is stable while the preview runs; the preview's isolated data is ephemeral and email is captured, never sent. No staging/production change or live email.
- Next owner: Darryl to manually test the People page; manual UI acceptance and independent review remain pending.

**PEOPLE-03 reconciliation, 2026-11-08:** Completed turn-f38cf036ab576ee1d70a55a2: input 1954638, cached 1953280, output 1162, total 1955800. This replaces the provisional snapshot.

## Prompt PEOPLE-04 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Give the course creator the Course coordinator title and prevent that person removing themselves.

### Agents spawned

- **New agents:** None; existing creation receipt and guarded course mutation allowed a bounded single-agent change.
- **Reused agents:** None. Independent review not performed.
- **Main agent:** /root; precise model unavailable. Unknown historical activity unavailable.

### Token count

**Usage report for PEOPLE-04:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main shared turn | 10823700 | 10812416 | 5177 | 10828877 | turn-70afc3741546ca16b6f12ace | provisional; shared with PEOPLE-05 |
| Children | 0 | 0 | 0 | 0 | observed none | final activity |

- Project-scoped private recorder, 2026-11-08. Per-prompt allocation unavailable; count shared turn once across PEOPLE-04/05. Later calls and final excluded; cached/reasoning subsets not added. Reconcile at next checkpoint. No controlled comparison.

### Experiment outcome

- Creator identity comes from the trusted course-creation receipt; active instructor creator is labelled Course coordinator and its self-remove control omitted. Same-D1 guard rejects self-removal before any membership/invitation writes. Other instructors and courses without receipts do not acquire coordinator privileges. Another instructor's removal of the coordinator is not restricted by this request.
- Focused isolated D1 tests passed 3/3; full npm run check passed 8 OpenSpec changes, typecheck, lint, 28 Vitest files / 308 tests, 4 deployment tests and build. UI/manual accessibility and independent review remain pending. See workflow/evidence/course-onboarding/course-people/verification.md and handoff.

## Prompt PEOPLE-05 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Report that the synthetic preview instructor was accidentally removed.

### Agents spawned

- **New agents:** None; existing local synthetic fixture supported a deterministic reset.
- **Reused agents:** None; no independent review performed.
- **Main agent:** /root; model unavailable.

### Token count

**Usage report for PEOPLE-05:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main shared turn | 10823700 | 10812416 | 5177 | 10828877 | turn-70afc3741546ca16b6f12ace | provisional; shared with PEOPLE-04 |
| Children | 0 | 0 | 0 | 0 | observed none | final activity |

- Per-prompt allocation unavailable; count shared turn-70afc3741546ca16b6f12ace once across both prompts. Private project-scoped recorder; later calls and final excluded. Reconcile next checkpoint.

### Experiment outcome

- The isolated preview's session-start helper reactivates only its synthetic instructor membership and records a synthetic creator receipt. Called the loopback synthetic start endpoint; HTTP 303 observed. The user must click Open synthetic instructor session in their own browser to acquire the session cookie. No staging or production data touched; preview data is ephemeral.
- Full and focused verification recorded under PEOPLE-04. No controlled comparison or independent review. Next owner Darryl for manual UI acceptance.

**PEOPLE-04/05 reconciliation, 2026-11-08:** Completed turn-70afc3741546ca16b6f12ace: input 12443437, cached 12430592, output 6571, total 12450008. Replaces the shared provisional snapshot and is counted once for both prompts.

## Prompt PEOPLE-06 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Report that Courses and Sign in lead in a loop in the local preview.

### Agents spawned

- **New agents:** None; a bounded local preview routing diagnosis and repair did not require delegation.
- **Reused agents:** None. Independent review was not performed.
- **Main agent:** /root; model unavailable. Historical unknowns unavailable.

### Token count

**Usage report for PEOPLE-06:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 6314735 | 6293376 | 1717 | 6316452 | turn-2e53f9a42ac1de848396d9cd | provisional; incomplete |
| Children | 0 | 0 | 0 | 0 | observed none | final activity |

- Project-scoped private recorder, 2026-11-08. One prompt in source group; later calls and final excluded. Cached/reasoning are subsets; reconcile at next checkpoint. No controlled comparison.

### Experiment outcome

- Found synthetic preview only handled /api/auth, leaving /api/courses unavailable. Composed existing course handler on its isolated D1 and allowed only /workspace synthetic destination; signed-in /sign-in redirects to authorized workspace.
- Actual local browser check: opened synthetic instructor session, saw coordinator on People, clicked Courses and saw Synthetic course, then opened /sign-in and observed redirect to the course list. No real account or mail used. The auth preview does not provide assignment/assessment APIs.
- `npm run check` passed 8 OpenSpec changes, typecheck, lint, 28 Vitest files / 308 tests, four workflow tests and build. No live deployment or independent review. Evidence workflow/evidence/course-onboarding/course-people/verification.md; handoff workflow/handoffs/course-people.md.
- Next owner Darryl for manual acceptance and separate reviewed release. No controlled comparison; token totals do not establish quality.

**PEOPLE-06 reconciliation, 2026-11-08:** Completed turn-2e53f9a42ac1de848396d9cd: input 9750375, cached 9727488, output 3387, total 9753762. This replaces the provisional snapshot.

## Prompt PEOPLE-07 — 2026-11-08, Asia/Singapore

**Prompt (redacted):** Screenshot of assignment page showing a JSON parse error in the local preview.

### Agents spawned

- **New agents:** None; a bounded preview routing repair and browser smoke was performed by main.
- **Reused agents:** None; independent review not performed.
- **Main agent:** /root; model unavailable. Unknown historical activity unavailable.

### Token count

**Usage report for PEOPLE-07:**

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 7465186 | 7452800 | 2105 | 7467291 | turn-5ad0c2dcccf7a84ab67a9c1e | provisional; incomplete |
| Children | 0 | 0 | 0 | 0 | observed none | final activity |

- Project-scoped private recorder, 2026-11-08. One prompt; later calls/final excluded; cached/reasoning subsets not added. Reconcile next checkpoint. No controlled comparison.

### Experiment outcome

- Cause: synthetic auth preview had no instructor assignment API, so Vite returned HTML where the client expected JSON. Connected existing guarded assignment/assessment handlers and migrations to isolated preview D1; client now reports a safe unavailable message for malformed responses.
- Browser smoke: synthetic People → Assignments showed empty list; New assignment produced an isolated synthetic draft. No real learner code, mail or remote mutation. Assessment submissions remain unavailable without a real producer. Previous evidence that preview omitted assignment APIs is superseded by this follow-up.
- `npm run check` passed 8 OpenSpec changes, typecheck, lint, 28 Vitest files / 308 tests, 4 workflow tests and build. No independent review or human acceptance claimed. Evidence workflow/evidence/course-onboarding/course-people/verification.md and handoff.
- Next owner: Darryl for UI acceptance and separately reviewed release. Tokens alone do not establish efficiency or quality.

**PEOPLE-07 reconciliation, 2026-11-08:** Completed turn-5ad0c2dcccf7a84ab67a9c1e: input 11013537, cached 10999040, output 3716, total 11017253. This replaces the provisional snapshot.

## Prompt PEOPLE-08 — 2026-11-08, Asia/Singapore

**Prompt:** Commit, push and create the PR.

### Agents spawned

- **New agents:** None; the requested Git and PR workflow is sequential and does not require delegation.
- **Reused agents:** None. No new independent review was performed.
- **Main agent:** /root; model unavailable.

### Token count

| Agent | Input | Cached input (subset) | Output | Total | Source | Status |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Main | 1947942 | 1924352 | 2544 | 1950486 | turn-5b63f2cb7c27498d566e7a50 | provisional; incomplete |
| Children | 0 | 0 | 0 | 0 | observed none | final activity |

- Private project-scoped recorder snapshot; later calls and final excluded. Cached tokens are a subset; reconcile at the next checkpoint. No controlled comparison.

### Experiment outcome

- The preceding invitation recovery PR #15 was merged. The People work was based on updated main on a separate branch for review. Existing verification is recorded in workflow/evidence/course-onboarding/course-people/verification.md; independent review and manual UI acceptance remain pending.
