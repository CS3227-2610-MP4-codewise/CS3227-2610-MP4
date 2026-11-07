# UI review: instructor course creation

- Human owner: Darryl (shared/instructor); Keith's approval of the technical packet is reported by Darryl. Student consumer not part of this increment.
- Source: local implementation, based on `4f3264be60fabb58ede92b2e15984592016530bf`; branch/PR are being prepared.
- Design reference: [docs/ui/design.md](../../../../docs/ui/design.md), `warm-workbook-v1`.
- Requirements: COU-01/02/07, AUTH-01–03, UI-01/04/07/08.
- Reviewer: independent read-only agent `/root/course_creation_review`; source/test review only, no browser inspection.
- Evidence directory: this directory; source and automated test results in [verification.md](verification.md).

| Review area | Requirement / acceptance | Outcome and evidence |
|---|---|---|
| Design identity | UI-01 workbook palette/type/control treatment | **Unverified visually.** Form uses shared `Action`, existing warm tokens and a ruled, labeled layout (`CreateCourseForm.tsx`, `styles.css`); no rendered review yet. |
| Versioned workspace | UI-04 keep global header and course tabs; creation does not change published work | **Unverified manually.** `Workspace.tsx` retains Courses/Account and existing Assignments/Grading/Students navigation; automated build passes. |
| Responsive/keyboard | UI-07 keyboard, focus, announcements, touch size, 320/768/1024/1440px, 200% zoom | **Unverified.** Human local browser checklist is in verification.md. |
| Contrast/appearance | UI-01/UI-07 actual light/dark focus and contrast | **Unverified.** CSS consumes shared tokens; no screenshot or measured contrast evidence collected. |
| Honest state | UI-08 pending, duplicate suppression, cancellation, retry, denied/error, acknowledgment | **Automated controller states pass** in `npm run check`; rendered browser behavior and focus/announcement remain unverified. No success state occurs before a matching course acknowledgment. |
| Privacy/authority | AUTH-02 no browser-granted roles or unrelated course access | **Automated local-D1 checks pass.** Forged alias/admin fields and unrelated-course reads are denied; see verification.md. |
| Verification | OpenSpec, lint, typecheck, tests and build | **Pass:** `npm run check`, including25 Vitest files/264 tests and4 deployment tests. Focused course D1 suite16/16. |

No intentional design departure. Manual acceptance and task2.3 remain open until the local browser checklist is completed and recorded.
