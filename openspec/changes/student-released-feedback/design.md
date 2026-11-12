# Design

## Context

See proposal.md (Why) and `specs/student-feedback/spec.md` (SF-01–SF-08).

What exists today:

- **Producer.** Darryl's `AssessmentService.consumer(request)` implements `ReleaseReadPort { getAuthorized(principal, assessmentId, releaseVersion), currentness(principal, assessmentId) }` (`src/server/instructor/ports/contracts.ts`). It authorizes the request-bound principal as the attempt's own submitter with current membership. It also re-checks the attempt's evidence digest and the currentness token around each read. It is not composed into any student route.
- **Projections.** `src/shared/instructor-contracts/release.ts` defines closed `releaseSchema`, `withdrawnSchema` and `currentnessSchema`, plus `assertCurrentRelease` and `currentnessToken`. These are Darryl's, used unchanged.
- **Keith's routes.** `studentHandler` (`src/server/student/http.ts`) already serves `GET /api/student/attempts/:attemptId` through `currentStudentGuard`, with uniform 404s and `no-store`. The browser's `AttemptView` (`src/web/student/Attempts.tsx`) renders that attempt read-only.
- **The gap.** The port is keyed by assessment ID. `instructor_assessments.attempt_id` is UNIQUE, but only Darryl's repository reads it.

## Goals / Non-Goals

**Goals:**
- One Keith route family that turns "my attempt ID" into the closed C-REL projections, with authority checked first and currentness re-checked last.
- No Keith-side storage, copy or cache of assessment data.
- A minimal additive producer method, written by Keith in a window Darryl grants and reviewed by Darryl. Keith can build and test against a fake until the grant.

**Non-Goals:**
- Progress evidence selection, the AI gateway or `progress-explanation` requests (PROG-01–03).
- Changes to the release lifecycle, release DTOs or instructor screens.
- Push notifications or polling for new releases.

## Decisions

### D1. Producer method: one additive batch method on `ReleaseReadPort`

Keith writes this method in Darryl's files under a granted writer window, and Darryl reviews it as SH-REL producer owner (name and shape subject to his agreement in task 1.1):

```ts
attemptReleases(
  principal: TrustedPrincipal,
  attemptIds: string[], // 1..50 unique, the caller's own attempts
): Promise<Map<string, { assessmentId: string; currentness: Currentness; releaseVersions: number[] } | null>>;
```

`null` means no assessment or no release for that attempt. Attempts that are not the caller's own fail authorization as a whole (`FORBIDDEN`). Keith maps that to the uniform 404. Versions are every version ever released for the attempt, including superseded and withdrawn ones.

- The method is batched so the history page (up to 50 rows, `STUDENT_ATTEMPT_PAGE`) costs one producer call, not 50. One call per attempt would multiply D1 reads per history load by the page size.
- The implementation reuses the consumer's existing request-bound `authorize` (own attempt, current membership, evidence digest) for every attempt in the batch, so no new authority path is created. A single repository read maps attempt IDs to assessments and release versions.
- **Alternative rejected: Keith's student routes read `instructor_assessments` directly.** That spreads Darryl's table and its invariants into the student service and bypasses the producer's authorization. Writing the method inside the producer keeps one read boundary, which Darryl reviews.
- **Alternative considered: Darryl writes it.** This was the original plan. Keith takes the write to avoid waiting on Darryl's build time; Darryl's review remains the gate.
- **Alternative rejected: derive versions as 1..current.** The current version is null after a current withdrawal, so the earlier versions would be lost.

### D2. Routes (Keith, `src/server/student/http.ts`)

| Method and path | Result |
|---|---|
| `GET /api/student/attempts/:attemptId/feedback` | `{schemaVersion:1, state:'none'}`, or `{schemaVersion:1, state:'released'|'withdrawn', currentness, versions:[{releaseVersion, state}], release?: Release}`, where `release` is present only when current |
| `GET /api/student/attempts/:attemptId/feedback/:releaseVersion` | The exact `Release` (released or superseded) or `Withdrawn` tombstone |
| `GET /api/student/publications/:pub/attempts` (existing) | Each row gains `feedbackReleased: boolean` (SF-07) |

The order for each request:

1. Require the session (401).
2. Check own attempt and current membership through Keith's existing guarded attempt read. A miss is the uniform 404, before any producer call.
3. Call `attemptReleases`.
4. Call `getAuthorized` for the chosen version.
5. For the current-release route, run `assertCurrentRelease(release, currentness, token)` and then call `currentness` once more. If the token changed, respond 409 `STALE_FEEDBACK` (SF-02).

The per-version states (`released`, `superseded`, `withdrawn`) in the summary are read from the producer's currentness projection (`versionState`): withdrawn when listed as withdrawn, released when it is the current version, otherwise superseded. This is the producer's own rule for one version. The single-version route re-verifies each state against the producer's projection of that version. Fetching every version's projection on each open was rejected: it costs one full producer authorization per version against the Workers Free query limit. (Keith decision, 2026-11-12.)

Error mapping reuses the student error set:
- Producer `FORBIDDEN`/`NOT_FOUND` → 404.
- `STALE_EVIDENCE` → 409 `STALE_FEEDBACK`.
- `UPSTREAM_UNAVAILABLE` or a missing port → 503.

The routes have no mutations, so no CSRF check, and no rate limit beyond the existing reads. The new response wrapper is a closed `schemaVersion 1` schema in a Keith-owned `src/shared/student-feedback.ts`. It embeds Darryl's schemas by reference and never re-declares their fields.

### D3. Composition

`studentHandler` gains an optional `feedback?: (request: Request) => StudentReleasePort` dependency. `StudentReleasePort` is `ReleaseReadPort` plus `attemptReleases`. When it is absent, feedback routes return 503 and the history marker is `false`: fail closed and honestly, without claiming "none". Keith composes `AssessmentService.consumer` there in `src/server/index.ts` within the granted window, after Darryl's review of the producer method. Loopback samples never feed it.

### D4. Annotation matching in the browser, against the loaded attempt

The attempt view already holds the exact attempt (`GET /api/student/attempts/:id`). A pure function in `src/web/student/feedback-model.ts` checks each annotation:
- Its `submittedAnswerId` is one of this attempt's answers, with a matching `questionVersionId`.
- `1 ≤ startLine ≤ endLine ≤ line count`.
- The LF-joined lines equal `excerpt` exactly.

Failures go to an "unavailable evidence" list (SF-04).

- Matching uses only the student's own released data and the attempt they already hold, so doing it client-side discloses nothing new. It avoids the server reloading source per request.
- **Alternative rejected: server-side match flags.** They would add fields alongside Darryl's projection and duplicate the attempt read.

### D5. No caching

There is no Service Worker, no `sessionStorage` and no module-level memo for feedback. State lives in the mounted `AttemptView`, and remounting refetches (SF-02). This makes cache invalidation (the K5 consumer responsibility) trivially safe, at the cost of one request per open.

### D6. UI (warm-workbook-v1)

- **Layout.** The feedback panel sits inside the existing work pane of the attempt view, under the attempt metadata. A per-question criterion table shows criterion, score / bounds and explanation. Source is numbered and monospaced. Annotated lines get a letter marker and the `annotation` token fill plus a left rule (not colour-only). Each marker is a button. A labelled "Observations" list beneath the source has the same buttons.
- **The note.** Selecting a marker or list entry sets the selected annotation. The note (proportional text, criterion, line range and explanation) sits in a `role="region"`, and an `aria-live="polite"` status announces it. Focus stays on the trigger.
- **History.** A version selector lists "Version N (current)", "Version N (replaced)" and "Version N (withdrawn)" entries. The release or withdrawal time appears in the heading of the version shown, because the summary carries no per-version times and fetching every version to label the list was rejected (Keith decision, 2026-11-12). Withdrawn entries render the tombstone text only.
- **Responsive.** At 320 px or 200% zoom, the note stacks below the source, markers stay ≥44 px, and line numbers stay logical when wrapped. Tokens come from `docs/ui/design.md` (`accent`, `annotation`, typography rows). No new font or package.
- **States** (SF-06). Loading, none, released, withdrawn, stale (with retry), expired session (the existing sign-in recovery), network (with retry) and unavailable. On the feedback routes only, a 503 shows the unavailable state ("not available right now", no retry button) rather than the network state. Other student routes keep treating 503 as a network failure (Keith decision, 2026-11-12).

## Risks / Trade-offs

- [Keith edits Darryl's producer and weakens a guarantee] → Keith reuses the existing `authorize` and currentness helpers, adds producer tests beside Darryl's, and stays inside the recorded window; Darryl's review is required before composition.
- [Darryl declines the window or reshapes `attemptReleases`] → Keith's routes depend only on `StudentReleasePort`, so a reshaped method changes one adapter, and Darryl can write it instead. A fake port with `workflow/assessment-preview/public-fixtures.ts` keeps Keith unblocked, and those runs are labelled fixture-only (SF-08).
- [Extra D1 reads per open: Keith's attempt guard, then the producer's own authorize → read → authorize → currentness] → This is bounded per request. History uses one batched call. Measure on local D1 in task 4.x and record it, as in the student-drafts save-cadence note.
- [A release lands between the history load and opening the attempt] → The marker is load-time state only. The attempt view always refetches and shows the truth.
- [Excerpt matching false negatives from line-ending differences] → K4 stores LF-normalised source with a final LF kept, and Darryl's producer validates excerpts against the same canonical source. Any mismatch is shown as unavailable, never shifted.
- [Superseded content shown to students may surprise instructors] → This follows Decision 2 and P4 (history preserved, clearly labelled replaced). It is noted for Darryl's review in task 1.1.

- [Feedback reads are not rate-limited; a released open costs about 33 production D1 queries and 2 provider lookups, so a scripted loop by a signed-in student could drain the Workers Free daily quotas] → Accepted by Keith on 2026-11-13 for the class deployment (6.1 finding S1). Revisit after the staging check (task 6.3), on real quota pressure, or in a shared student rate-limit change; the SW-11 per-account limiter can be reused.

## Migration Plan

No schema migration. The change ships with the normal reviewed CI and staging → production release workflow. The routes return 503 until Darryl's composition lands, so a partial rollout fails closed. Rollback is a revert of Keith's routes, the UI and the composition line. There is no stored state to undo.

## Open Questions

- The exact error code name Darryl's port uses for "not your attempt" inside a batch. Either maps to the same 404.
