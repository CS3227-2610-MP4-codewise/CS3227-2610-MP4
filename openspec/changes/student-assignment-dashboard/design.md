# Design

## Context

See proposal.md for the accepted browsing scope. Source inspection baseline is `f62b23891434d18414ef8179a326749fc85365bf` (2026-11-09); this is an inspection reference, not consumer clearance. [Current contract decisions](../../../workflow/IntegrationContracts.md#current-decision-status--keith-confirmation-2026-11-09) supersede historical pending-policy statements in older documents. Source review, integration and human UI acceptance are still required.

Observed seams:

- `src/web/main.tsx` routes `/workspace` to `InstructorWorkspace`, which discovers roles but displays an unavailable student consumer. Reuse `src/web/ui/workspace-switch.tsx` and account/brand components.
- `GET /api/courses/contexts` supports `studentAfter`, role-filtered pages of 100, current session/course checks and closed `src/shared/courses.ts` schemas. Selected course GET and `/contexts/verify` are instructor-only. Do not copy their instructor client into student code.
- `AssignmentService.list` and `D1Assignments.list` read instructor draft summaries. They are unsuitable for student listing. `publicVersion` and C-PUB `publicationSchema` already supply immutable public content.
- `CourseAuthority.requireCourse(..., 'student-read')` currently accepts either course role. Student dashboard membership must be explicitly checked against the authoritative Student role, including on a deep link; the action's name alone is insufficient. Preserve existing instructor-public-read semantics.
- Publication roots carry course/assignment IDs, publication number, title and UTC deadline. `InstructionPreview.tsx` already uses installed Markdown/GFM/sanitizing dependencies; sharing a rendering component requires a named edit window and compatibility checks, not another renderer or dependency.

## Goals / Non-Goals

**Goals:** a small browser/server consumer composed over reviewed identity and publication producers; bounded requests; exact publication links; demonstrable privacy/currentness and accessible warm-workbook-v1 presentation.

**Non-Goals:** new identity/course/publication stores, changes to C-ID SessionView, instructor role semantics, unpublished assignment discovery, submission policies or learner status. The overview is an ordered read-only document; question-work navigation, answer tabs and margin feedback remain later workbook increments (UI-05/06).

## Decisions

### 1. Bounded course-first navigation

Proposed browser destinations are `/student`, `/student/courses/:courseId/assignments` and `/student/assignments/:assignmentVersionId`. The existing shared `/workspace` selection delegates to the student consumer only when trusted context permits it. Final path compatibility is reviewed in the shared routing window before activation.

Use context pages of at most 100 courses, preserving producer ID order and `studentAfter`. Next page replaces the displayed page; Back/return refetches the saved local cursor rather than restoring an unchecked data snapshot. Never merge many pages into a long-lived authorized list, so the instructor-only verification endpoint need not be extended for this increment. Repeated/non-progressing cursors fail safely. Course details for direct links come from the guarded student listing envelope, including empty courses; never search only the first context page or infer access from a browser course name.

Alternative: accumulate all courses and add a role-aware bulk-verification API. Deferred because it expands shared authority and request/state bounds without benefiting this course-first slice.

### 2. Minimal student listing producer, no duplicated assignment data

Propose `GET /api/student/courses/:courseId/assignments?cursor=...` with closed response:

```text
{ schemaVersion: 1, course: { id, name },
  items: [{ assignmentId, assignmentVersionId, title, publishedAt, deadlineAt }],
  nextCursor: string | null }
```

The producer selects the highest publication number per logical assignment in that course, then orders by `(deadlineAt ASC, assignmentId ASC)`, selecting 51 rows to return at most 50 and determine nextCursor. Read title/deadline from immutable publication roots, never draft JSON. Past deadlines remain in the same list; neither hiding them nor labelling submission eligibility is part of browsing. UTC is the explicit display timezone; retain full server timestamps and avoid inventing a course timezone.

Cursor proposal: bounded opaque encoding of the last `(deadlineAt, assignmentId)` key, validated using existing timestamp/ID limits, maximum 512 characters; it is a query position, not authority. Reject unknown or duplicate query parameters. Missing/malformed fields fail through the existing safe error boundary. Each page is a fresh authorized query. Concurrent publication can move rows between pages; guarantee deterministic pages for unchanged data, not a multi-request historical snapshot. Refresh/restart at page one after an explicit refresh; show retry on invalid cursors, never silently drop results or loop.

Darryl remains publication producer owner. The preferred implementation adds a bounded public-list read to his existing repository, with a student consumer adapter under Keith's server area. Darryl supplies/reviews that producer addition; no producer edit is assigned to Keith by this plan. A new `src/shared/student-assignments.ts` would contain the summary-envelope validator, with existing C-PUB remaining authoritative for overview. Exact DTO/path and public-list SQL review are task 1 gates, not a second C-PUB contract or presumed joint approval.

Alternative: filter instructor draft summaries in the browser. Rejected because it exposes unpublished/private metadata and cannot provide correct publication versions.

### 3. Student-specific authority at disclosure

The server uses the existing trusted SH-AUTH session and SH-ID object/course resolution. Darryl's SH-ID producer must expose/approve an explicit current Student-membership check for selected-course and version reads; do not broaden or reinterpret the existing generic public-read action. Reuse the same D1 records. Listing SQL guards account/session/course/Student membership in the data-read statement, including the course envelope for an empty list. The public-version producer resolves its course internally, applies object checks and rechecks current Student authority at the data-disclosure boundary. Add equivalent guarded reads in the existing producer if its multi-statement composition cannot guarantee this; do not implement a parallel authority store.

Deep-link IDs and cursors never authorize. Bind and verify returned course/version IDs against the selected destination; mismatches are unavailable, not a fallback to latest or another course. Use the existing safe error envelope and no-store headers: expired session requests sign-in, inaccessible/missing objects get a non-enumerating unavailable response, and network/503 failures offer retry. Exact code compatibility follows the reviewed shared boundary.

Alternative: rely solely on the earlier contexts response or `student-read` action. Rejected because browser contexts can be stale and that action currently permits instructor-only membership.

### 4. Exact-version overview and safe rendering

Propose `GET /api/student/publications/:assignmentVersionId` as a guarded student facade returning existing C-PUB Publication. Opening pins the version in the URL; response validation confirms assignment/course/version identity. Reload reauthorizes that version. An old authorized link may remain readable without adding a historical-version picker. Republishing does not mutate a loaded version or redirect it to latest.

Render title, UTC deadline, version identity and all questions in publication order, with public instructions, selectable indentation-preserving Python starter text and public rubric descriptors/bounds. No learner code, input editors, Working copy/Submitted/Feedback tabs, submit control, AI calls or execution affordance. This document view does not implement the split question/work surface; no unexplained design departure is introduced. When that surface is later implemented it must satisfy UI-04/05/06 fully.

Reuse the current sanitized instruction rendering through an agreed neutral shared component. Verify existing plain-text publications retain meaning and formatted content matches the selected producer revision. Unsupported new formats fail safely instead of guessing. Student payload validators and public SQL exclude private references, draft history, provider details and unreleased assessments. Summaries also omit private source revision/fingerprint metadata. Do not store protected payloads in localStorage, IndexedDB, a service worker or an offline cache.

### 5. Shared shell and state transitions

Use existing canvas/page/ink/secondary/rule/accent tokens, proportional text, restrained serif headings and monospaced source. Course/assignment lists use plain ruled rows, not analytics cards. Keep shared identity/logout and the authorized Student/Instructor switch; reuse its existing cancellation semantics before leaving dirty instructor work. No student dirty-work editor is introduced here.

Each request has a destination/generation key; abort where supported and ignore results after navigation, logout/account change, role change or unmount. Clear incompatible content before rendering another role/account/course. Revalidate on browser back/forward restoration and focus return; access remains authorized per request, with no promise of instantaneous server-push revocation. Network loss shows unavailable/retry rather than stale protected content as current. No automatic polling or unbounded retries.

| Surface | Required states | Recovery |
| --- | --- | --- |
| Courses | loading, authorized page, no eligible workspace, revoked role, network/expired session | next/back refetch; shared sign-in or authorized workspace |
| Assignments | loading, published rows, empty course, inaccessible course, invalid cursor, network/expired session | retry scoped request, refresh page one, return to courses |
| Overview | loading, exact public version, missing/denied, mismatched/unsupported payload, network/expired session | retry exact version or return to list; never latest substitution |

Focus the destination heading and announce only changed status; preserve visible focus and meaningful link names. Verify pointer/Space switching, keyboard order, touch targets, 320/768/1024/1440px, 200% zoom, light/dark and reduced motion. Only source blocks may have labelled local horizontal scrolling. Complete `workflow/templates/ui-review.md` with actual evidence; this planning checkpoint marks runtime rows not applicable and future integration unverified.

### 6. Ownership, evidence and experiment boundaries

Keith owns student implementation and this plan/log; Darryl owns shared producers. Before implementation, name exact writers for `src/server/index.ts`, `src/web/main.tsx`, `src/shared/student-assignments.ts`, publication query additions, SH-ID Student authority additions and shared instruction renderer extraction. Record baseline and final SH-AUTH/SH-ID/SH-PUB/consumer revisions. No shared code write window is opened here; existing IntegrationContracts and Ownership files remain unchanged.

This plan is authored by main `/root`, role Coordinator, without subagents or independent review. Implementation would record a prospective Implementer responsibility without renaming runtime identity; no delegation is implied. Existing tracker run remains attributed to `project-experiment-tracker`; its stop request drains this initiating turn. A new dashboard run can begin only in a later active turn after settlement, under explicit recording authorization, with this log reused. Never relabel historical turns or claim a complete dashboard-only usage total.

## Risks / Trade-offs

- Shared producer changes can overlap Darryl's work → serialized exact-file windows and reviewed compatibility packet before dependent code.
- Existing generic public-read authorization accepts either role → explicitly test instructor-only denial on Student routes without regressing instructor routes.
- Publication sorting changes during pagination → fresh bounded pages, explicit refresh, no snapshot claim; test unchanged-data traversal and republication races.
- Protected data outlives revocation in browser state → no persistent payload storage, revalidation on entry/focus/history restore, generation guards and content clearing on denial.
- Rich instructions can execute content or reinterpret legacy text → reuse reviewed sanitizer and format contract with malicious/legacy fixtures.
- Full publication payloads include up to 20 questions with bounded source/rubrics → retain existing C-PUB bounds, fetch one overview only on demand, never preload all publications; measure worst-case authorized payload/rendering before acceptance.

## Migration Plan

No schema migration or dependency is planned. Resolve shared gates, implement protected producers/consumers locally with synthetic fixtures, then run full checks and real composed UI/consumer verification. Keep course-onboarding task 4.3 open until its actual bidirectional first-opposite-role invitation tests pass at pinned revisions. Do not complete unrelated course-onboarding hosted tasks through local dashboard evidence.

Release only through the reviewed GitHub Actions workflow after successful staging and separately authorized deployment. Never copy local preview accounts/course data. Rollback removes the new route/shell composition through a reviewed application release while preserving authoritative identity/publication data. If producer gates are unavailable, retain the explicit unavailable student state; no fixture-backed protected route may stand in for integration.
