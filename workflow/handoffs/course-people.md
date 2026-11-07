# Handoff: Course People

- Owner: Darryl. COU-03/07, UI-01/07/08; warm-workbook-v1. Branch: codex/invitation-identity-recovery, based on unmerged PR15; this increment remains uncommitted.
- Course People API uses existing authentication, course authority, membership and invitation records. Current members and pending recipients are grouped by email; revoked/removed entries disappear. Removal is guarded and scoped to the exact course, deactivates its membership roles and revokes pending invitations. Account and other courses remain.
- Owned files: managed auth route/store and DTO, instructor course People UI/navigation, isolated D1 tests, OpenSpec/design/evidence and member logs. No new identity/membership store or Keith student implementation.
- Verification and review: [evidence](../evidence/course-onboarding/course-people/verification.md) and [UI review](../evidence/course-onboarding/course-people/ui-review.md). No independent agent review or live delivery/deployment.
- Next: Darryl performs manual UI/accessibility acceptance and decides how to integrate with PR15; Keith reviews the composed C-ID boundary. Uncertain provider reset reconciliation remains pending from PR15.

Coordinator follow-up: active creators are identified by the existing creation receipt and cannot remove themselves through the People mutation. Other-instructor removal and coordinator transfer policy are not altered. Legacy/operator-created courses without receipts do not acquire a fabricated coordinator. The synthetic preview button can restore its synthetic instructor session after accidental local removal.

Synthetic navigation repair: the local auth preview now composes the real course HTTP handler against its isolated D1 and permits the synthetic workspace destination. A signed-in /sign-in visit redirects to /workspace. Browser check observed People → Courses with Synthetic course and /sign-in → course list. This preview does not implement assignment/assessment endpoints. No live provider or deployment is claimed.

The loopback auth preview now composes the existing guarded assignment/assessment handlers and their migrations using isolated synthetic D1; this supersedes the earlier statement that assignment APIs are absent. Synthetic browser smoke observed an empty assignment list and created a draft. No actual student submissions or live provider are supplied.
