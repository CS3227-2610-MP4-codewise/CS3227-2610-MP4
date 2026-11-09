# Proposal

## Why

Students currently have no implemented course-to-assignment browsing journey: the student directories contain ownership notes, and the shared workspace shows an unavailable student consumer. Keith accepted a bounded dashboard that connects authorized courses to published assignments and a read-only overview before editor/submission work begins.

## What Changes

- Add student course navigation consuming the existing trusted workspace-context producer and shared role switch. This supplies the actual student consumer required by course-onboarding task 4.3; that task remains open until its integration checks run. [SD-01/05, COU-06/07, AUTH-01–03]
- Add a student-safe, course-scoped published assignment list: one row per logical assignment, latest published version only, title, deadline with named timezone and an explicit Open action. Never use instructor draft listings or fabricate submission/feedback status. [SD-02/04, SUB-01/04]
- Open an exact immutable publication in a read-only overview with published questions, starter text and public rubric guidance. Republished content must not silently replace an open version. Editing, save/submit, feedback, progress, historical-version discovery and AI remain later increments. [SD-03/04, SUB-01]
- Follow [the UI design](../../../docs/ui/design.md) revision `warm-workbook-v1`, UI-01/02/03/04/07/08, across student course list, assignment list and overview; include loading, empty, expired-session, denied, network, stale-response and retry states. The overview is a document, not an interactive question-work workspace. [SD-05/06]

Accepted scope: Keith's explicit recommendation acceptance and subsequent planning go-ahead on 2026-11-09 include the read-only overview. Planning defaults make the remaining small details concrete: course pages retain producer ID order; assignment pages sort by deadline ascending then assignment ID; past deadlines stay visible; display deadlines in UTC (explicitly labelled) without inventing a course timezone or submission eligibility; use bounded next-page navigation rather than accumulating pages. These defaults remain reviewable in this proposal.

## Capabilities

### New Capabilities

- `student-assignment-dashboard`: authorized student course discovery, public published assignment listing, exact-version read-only overview and recoverable navigation states (SD-01–06).

### Modified Capabilities

None. `openspec list --specs --json` reports no canonical specs. This delta consumes the in-flight identity, course-onboarding, publication and warm-workbook requirements without duplicating their stores or changing their policies.

## Impact

Keith owns future `src/web/student/` and `src/server/student/` consumers and their focused tests. Darryl retains SH-AUTH, SH-ID, the shared switch and assignment publication producers. Expected shared integration points are `src/web/main.tsx`, `src/server/index.ts`, a new student public-summary DTO, and any minimal publication-query or reusable-renderer addition. Exact writer windows and producer/consumer revisions must be recorded before those files are edited; this plan grants none.

Observed gaps: the current assignment list reads instructor drafts; course-by-ID and multi-page verification endpoints are instructor-only. A reviewed public listing producer and student-safe selected-course/currentness handling are prerequisites, not completed integration. The documented dashboard producer reference is `8f93f51c1f6a36dd64908bd550e90b68e9957af1`; compare with the selected integration source. Existing C-PUB remains the overview contract, subject to exact-revision review including instruction-format compatibility.

No new storage, migration, dependency, provider, AI activation, feature deployment or public registration is proposed. This change creates planning artifacts only. Implementation requires a later instruction and the boundary gates in tasks.md; hosted acceptance requires the reviewed release workflow. Planning/log evidence is separate from runtime/UI acceptance.
