# Darryl prompt experiment - real submission assessment integration

Owner: Darryl. Change/requirements: real-submission-assessment-integration; SUB-03/04, GRADE-02-04, AUTH-01-03, UI-04/05/06/07/08. Branch: main, local checkout behind cached origin/main.

## Prompt RSAI-01 - 2026-11-12 (time unavailable)

**Prompt (redacted):** Verify Keith's reviewed C-SUB producer and integrate real submissions into the instructor assessment lifecycle, subject to the stated producer and shared-writer gates; verify and hand off without deployment or live provider calls.

### Agents spawned

- **New agents:** None. Delegation was not explicitly authorized in this session; preflight was performed by the main agent.
- **Reused agents:** None.
- **Main agent:** /root; model identity unavailable.
- **Historical activity:** Producer handoff records a prior domain implementer and reviewer; their identities and usage were not independently established in this turn.

### Token count

| Agent | Input | Cached input | Output | Total tokens | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main agent | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; current turn incomplete |
| Child agents | none | none | none | none | observed activity | no child spawned |

- Total: unavailable. Shared-turn group ID unavailable; no per-prompt allocation inferred.
- Recorder project scope matched this repository. Report failed with EPERM writing its external data directory; no refreshed source records were available. Later calls and final response are outside the checkpoint.
- Reconciliation: retry at the next permitted checkpoint; do not invent measurements or double count.

### Experiment outcome

- Expected benefit: integrate the actual reviewed producer and preserve the shared boundary.
- Observed: cached origin/main e5c981d includes PR #26; handoff pins review revision 53c1974 and describes producer tests and Keith-reported composed acceptance. Handoff explicitly says Darryl's review is pending and identifies a remaining disagreement with Darryl's earlier submission packet over idempotency fingerprint and key scope. Producer catalog supplies getAuthorized, scope and list; normal composition was already added at 1a5b924. Current checkout is 27 commits behind cached origin/main and has extensive pre-existing edits.
- Checks: read-only git status, cached revision, handoff, producer code and producer verification records. No product tests run. Recorder failed as above. No product or shared composition edits; no deployment or live calls.
- Evidence: cached origin/main workflow/handoffs/student-drafts.md and workflow/evidence/student-drafts/{composed-acceptance,final-checks}.md.
- Independent review and C-REL handoff not performed; complete approval/review of the exact producer boundary and a serialized shared composition window remain unverified. Keith's manual composed acceptance is reported without captured IDs/screenshots and does not establish the requested full approval/release journey.
- Comparison: no controlled comparison. Blocker / next owner: Darryl and Keith resolve/document the exact C-SUB compatibility differences and review the exact revision, then establish the writer window and resume on an appropriate current base.

## Prompt RSAI-02 - 2026-11-12 (time unavailable)

**Prompt (redacted):** Ask whether logs and relevant work should be committed on a branch, and what to do next.

### Agents spawned

- New: none; this is a repository-status question and delegation was not requested.
- Reused: none. Main: /root; model identity unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; recorder previously failed with EPERM |
| Children | none | none | none | none | observed activity | none |

Total and shared-turn group unavailable; reconcile at the next permitted checkpoint. Prior RSAI-01 measurement remains unavailable.

### Experiment outcome

- Checked local status, worktrees, cached main and the prior submission packet. Local main is at af1bc90 and behind cached origin/main e5c981d; existing dirty work spans several increments. Prior gateway work was published in PR #28 and is on cached origin/main despite local changes remaining.
- No commit, branch, merge, deployment or product change was made. Recommend inventory and selectively preserve unpublished work before updating; do not commit all dirty files together. Evaluate producer compatibility and record any actual agreement needed before integration.
- No controlled comparison. No product tests run. Next owner: Darryl or the assistant upon an authorized cleanup/integration request.

## Prompt RSAI-03 - 2026-11-12 (time unavailable)

**Prompt (redacted):** Inventory and preserve existing work, then continue the requested integration.

### Agents spawned

- New: none; no delegation explicitly requested. Reused: none. Main: /root, model unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; recorder EPERM |
| Children | none | none | none | none | observed | no children |

Total and shared-turn ID unavailable. Reconcile at a later accessible recorder checkpoint; no duplicate attribution.

### Experiment outcome

- Compared dirty files to cached origin/main e5c981d: all application files and most artifacts match; unique local logs and module-wrapup evidence remain, and shared coordination files differ due to newer remote changes. Existing checkout left intact. A clean source archive of cached origin/main was prepared in temp.
- Producer handoff pins 53c1974; catalog was composed in 1a5b924. Examined real catalog, student contract and existing instructor create/list flows. Exact C-SUB compatibility and full composed lifecycle remain under review.
- No product changes, branch, commit, push, deployment or live provider calls at this checkpoint. No test results yet. No controlled comparison.

## Prompt RSAI-04 - 2026-11-12 (time unavailable)

**Prompt (redacted):** Approve continuation.

### Agents spawned

- New: none; no delegation requested. Reused: none. Main: /root, model unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; recorder EPERM |
| Children | none | none | none | none | observed | no children |

Total and source group unavailable. Reconcile later without double counting shared turns.

### Experiment outcome

- User approved continuation; no inference of Keith's separate review or of live calls/deployment. Read instructor assessment tasks, producer handoff, catalog and code; checked OpenSpec status. Creating a node_modules junction failed with access denied; dependency copy attempted instead.
- No implementation or product verification claimed at this checkpoint. No controlled comparison.

## Prompt RSAI-05 - 2026-11-12 (time unavailable)

**Prompt (redacted):** Continue working.

### Agents spawned

- New: none; no delegation requested. Reused: none. Main: /root, model unavailable.

### Token count

| Agent | Input | Cached input | Output | Total | Source record | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Main | unavailable | unavailable | unavailable | unavailable | unavailable | provisional; recorder EPERM |
| Children | none | none | none | none | observed | no children |

Total and source group unavailable. Reconcile later without double counting shared turns.

### Experiment outcome

- Continued inspection of actual assessment creation and D1 test harness. Exact tests, code changes and outcome to be recorded after verification. No controlled comparison.

### RSAI-05 progress update

- GitHub main was independently checked at e5c981d. Created remote branch codex/real-submission-assessment-integration at that revision; existing checkout preserved.
- Focused vitest run initially failed before tests due to the default temporary directory; with writable TEMP, Miniflare failed with EACCES connecting to loopback. 11 tests failed setup, 15 skipped. No D1 assertions passed. Full npm run check started separately; results to follow.
- Source review found the request-bound C-REL consumer is incompatible with the instructor-only D1SubmissionCatalog and instructor-only assessment object wrapper in normal composition. Drafted a blocked handoff with exact revisions and required checks. The earlier fingerprint/key-scope differences are producer contract-review questions, not a proven defect.
- `npm run check` on the clean source archive: OpenSpec 17/17, typecheck and lint passed; Vitest reported 24 failed/26 passed files, 35 failed/397 passed/228 skipped tests. Many D1 setups reported loopback EACCES; a separate UI interaction timed out and was not diagnosed. The run was interrupted after these results; deployment tests and build were not reached. This is not a successful check.
- The handoff and this prompt log were committed to remote branch codex/real-submission-assessment-integration at 030ce3c; historical unpublished logs/evidence remain unchanged in the original checkout and are not yet committed. No product implementation or manual acceptance was completed. Independent reviewer was not performed because delegation was not requested. Next: run real D1 tests in an environment permitting local loopback, implement and verify the instructor integration and agree the student consumer adapter with Keith.

