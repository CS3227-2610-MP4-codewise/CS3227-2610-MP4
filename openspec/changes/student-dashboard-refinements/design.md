# Design

Design revision: `docs/ui/design.md` `warm-workbook-v1`, UI-01/04/07/08. Requirements are DR-01–03 and AS-01–03 (see specs). The motivation is in proposal.md.

## Context

Observed at `bb990cd`:

- **Student times:** every student time goes through `formatDeadline` in `src/web/student/model.ts`. It formats locale-independent UTC (`Fri 13 Nov 2026, 06:05 UTC`), and 17 call sites in six files use it.
- **Instructor times are not uniform.**
  - The assessment and review screens use `new Date(x).toLocaleString()`. That is the browser's locale and machine time zone, giving `13/11/2026, 2:05:09 pm` on Keith's en-SG / Asia/Singapore Mac.
  - The assignment authoring screen pins `Asia/Singapore` with a medium date style and the suffix " Singapore".

  Keith's example matches the first form, so DR-01 adopts its layout but pins the time zone.
- **Points and scores:** rubric guidance renders `{min}–{max} points` in `StudentWorkspace.tsx` (overview) and `Workbook.tsx` (question pane). `Feedback.tsx` renders `X of N (range min–max)`.
- **Assignment list:**
  - `AssignmentList` renders the rows from `GET /api/student/courses/:id/assignments`. The query is `StudentReads.list` in `src/server/student/repository.ts`, and the DTO is `src/shared/student-assignments.ts`.
  - Attempts are in `student_attempts(user_id, assignment_id, course_id, seq, submitted_at, …)`, indexed `(user_id, assignment_id, seq)`.
  - `StudentFeedback.released(principal, attemptIds, port)` already batches release currentness for SF-07 and turns producer failure into "no markers".

## Goals / Non-Goals

**Goals:**
- One student time formatter with fixed output.
- Max-only points.
- Authoritative status tags from one bounded extra read.

**Non-Goals:**
- Changing instructor screens or the reviewed SD list DTO or query.
- Migrations, client caching of status, or new tag kinds.

## Decisions

### 1. Fixed-output Singapore formatter (DR-01)

Replace the body of `formatDeadline` (keeping the name, so call sites and the "server time" labels need no edit) with `Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).formatToParts`. The string is assembled from the parts as `${day}/${month}/${year}, ${hour}:${minute}:${second} ${dayPeriod.toLowerCase()}`. Building from parts, rather than using `format()`, keeps the output identical across ICU versions and browsers that differ in punctuation, narrow spaces or `PM` casing. The formatter is created once at module scope. The doc comment changes from "UTC is the explicit display timezone" to the DR-01 rule.

*Alternatives:*
- Machine-local `toLocaleString()`: matches the instructor screens byte for byte only on Singapore machines, and a student abroad would see a shifted deadline. Rejected (Keith, Decision 1).
- Manual UTC+8 arithmetic: works because Singapore has no daylight saving, but `Intl` with a named zone states the intent and stays correct if that ever changes.

### 2. Points and score text (DR-02, DR-03)

Add a small `formatPoints(max)` helper in `model.ts` that returns `(N points)` or `(1 point)`, keeping the number's own decimal text (`String(n)`). It is used by both rubric-guidance sites. The feedback cell becomes `Score: {score} / {maximumScore}`. The `.cw-fb-bounds` span and its CSS are removed. Screen-reader text is the visible text, with no hidden range.

### 3. Status endpoint (AS-01, AS-02)

The new route is `GET /api/student/courses/:courseId/assignment-status?id=a&id=b…`.

- **Query:** closed. Only repeated `id` keys, 1–`STUDENT_ASSIGNMENT_PAGE` (50) unique values, each passing the contract `id()` check that the list DTO uses. Anything else is a 400 `VALIDATION`. (Revised during apply, 2026-11-13: the plan said one comma-separated `ids` key, but contract assignment IDs may contain commas, so repeated keys carry any valid ID unambiguously.)
- **Order:** session, then the course guard (`currentStudentGuard` on an active course, uniform 404), then one D1 statement for the requested IDs within that course:
  - the latest publication's `deadline_at` per assignment (the same `MAX(publication_number)` rule as the list);
  - the latest own attempt per assignment, by `submitted_at DESC, seq DESC` (the SW-08 order), through the `(user_id, assignment_id, seq)` index.
- **Release lookup:** one `StudentFeedback.released(principal, latestAttemptIds, port)` call. Producer failure gives an empty set, so no Feedback released (AS-02 scenario).
- **Derivation on the server with the injected clock `now`:** released → `feedback-released`, else an attempt → `submitted`, else `now < deadline ≤ now + 24h` → `due-soon`, else `none`. The clock and the 24 h boundary are server-side, so a wrong client clock cannot change the tag.
- **Response** (closed `assignmentStatusPageSchema`, `schemaVersion: 1`, in `src/shared/student-work.ts`): `{ schemaVersion: 1, items: [{ assignmentId, status }] }`, only for requested IDs found in the course. `status` is one of `feedback-released | submitted | due-soon | none`. There are no attempt IDs, times or scores. The response is `no-store`.

*Alternatives:*
- Adding status to the list DTO touches the shared, reviewed SD contract and couples list availability to the release producer.
- Calling history per row costs up to 50 requests per page.

Both were rejected (Keith, Decision 5).

### 4. Client tags (AS-03)

`StudentBrowse` already loads the list under an `AbortController`. After the list resolves, it issues the status request for that page's assignment IDs under the same controller, and stores the result keyed by page cursor and IDs. A late result for another page is dropped by the existing request guard. `AssignmentList` takes an optional `status` map and renders a `<span className="cw-student-tag">` (text: Feedback released / Submitted / Due soon) in the row's details column, after the title and deadline. The Open action is described by the tag (`aria-describedby`). Revised 2026-11-13 at Keith's request: rows follow the instructor row pattern. The details column (title, deadline, tag) is on the left, and the `cw-row-action` Open link is at the far right, wrapping below at widths up to 600px. On the course list, a student-scoped `a.cw-course-entry { display: flex }` stops the generic `.cw-student a` inline-flex rule from shrinking the shared course entry, so View assignments sits at the far right as on the instructor course list. It uses existing tokens (the feedback-marker style for Feedback released, neutral ink-on-paper for the others) with a text label, so colour is never the only cue. A status failure leaves the map empty, with no alert.

### Authorization and data boundaries

The read is own-data only. The course guard comes first, the attempt query is filtered by `user_id = principal`, and release currentness goes through the existing student release port, which already enforces own-attempt access. Foreign or out-of-course IDs are absent from the response, never errors, so they cannot be enumerated. Nothing is written to browser storage.

### Deployment and resources

This is one bounded extra Worker request per list page (≤50 IDs, one D1 statement plus one batched producer call), with no migration and no binding change. The client change is in the existing student chunks. Shipped through the normal PR → staging → release workflow, rollback is a PR revert.

### UI coverage

States: list loading (no tags), list loaded with status pending (no tags, no placeholder), each tag, status failure (no tags), empty list. At 320px tags wrap under the title within the row. Light and dark use the existing tokens. No design departure.

## Risks / Trade-offs

- [Two time styles across roles: instructors on machine time, students on fixed Singapore time] → They read identically on Singapore machines. The gap is recorded for Darryl rather than changing his screens.
- [Due soon is computed at request time and goes stale while the page stays open] → Tags refresh with every list load, refresh and pagination, matching SD-02's refresh behaviour. No live timer.
- [Producer outage hides Feedback released] → This is the intended safe failure (AS-02). The workbook feedback view stays the source of truth.
- [SD-02 still says "UTC-labelled deadline" in the open dashboard change] → Recorded as an archive-order item in the proposal and tasks.
