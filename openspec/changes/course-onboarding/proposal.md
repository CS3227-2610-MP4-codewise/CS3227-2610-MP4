## Why

A merged deployment can authenticate the first owner yet leave it with no course and no way to create one. Existing plans cover trusted operator provisioning, not the complete instructor-created-course and invitation acceptance journey. Darryl's 2026-11-07 request confirms the product target below; this change plans it and does not claim implementation or hosted readiness.

## What Changes

- Follow-up requested by Darryl: show one entry per course and recipient; pending Student and Instructor invitations are accepted together by either current link after the full role set is shown. A previously invited Firebase account without a local account uses mailbox proof and an explicit existing-password or create/reset-password choice; never silently merge or reset it. [COU-03–05/07, SHA-05/08/11, UI-01/02/07/08, warm-workbook-v1]

- Treat the existing operator-pinned `instructor@u.nus.edu` starting account as the **first admin**, with an explicit trusted course-creation capability. Email text, passwords or browser role flags never confer admin authority.
- Allow the first admin and currently authorized instructors to create a course; atomically make the creator an instructor of that new course. No automatic access to other courses.
- Allow every current course instructor to invite **students or instructors** to that course and track invitation/send/acceptance status. Instructor invitation never grants account administration.
- Preserve non-expiring, revocable, single-use admission/invitations. New recipients choose a Codewise password; registered recipients authenticate with their existing password and do not register/reset again. A previous unaccepted invitation alone is not registration.
- On explicit authenticated acceptance, atomically add the exact invited course/role to the same authoritative account, acknowledge it and show that course in the appropriate dashboard. Pending, revoked, wrong-account or scanner GET requests grant nothing.
- Retain existing roles when accepting another. Unlock a top Student/Instructor dashboard switch after trusted current access permits both, including student and instructor courses that differ. Each dashboard lists only its authorized courses; switching never grants roles.
- Update the MVP roadmap, existing auth/UI planning and C-ID handoff notes to supersede operator-only/no-membership-on-acceptance assumptions as the future target while retaining runtime/acceptance limitations.

## Capabilities

### New Capabilities

- `course-onboarding`: first-admin/course-creator authority, instructor-created courses, role-targeted invitation acceptance and authorized dual-role dashboard discovery. COU-01–COU-07 reference existing AUTH-01–03, SHA-01–12 and UI-01–08 rather than duplicate their contracts.

### Modified Capabilities

- No archived/canonical capability is modified by this delta. Existing in-flight `codewise-mvp`, `shared-authentication` and `warm-workbook-ui` plans will be cross-linked/reconciled with this target; no unfinished change is archived or falsely completed.

## Impact

Darryl owns SH-AUTH/SH-ID, first-admin policy, course command, role-targeted invitations/acceptance, trusted allowed-workspace projection, shared shell/switch and instructor dashboard/UX. Keith retains student dashboard/submission implementation and cross-reviews/consumes the composed C-ID boundary. No student implementation in Darryl's increment. One Firebase password authority and one D1 account/session/course/membership store remain; existing course membership schema already supports both roles. Invitation metadata/commands and allowed-context projection need a serialized implementation-time review and exact handoff before dependent edits.

UI follows `docs/ui/design.md` **warm-workbook-v1**, UI-01/UI-02/UI-03/UI-04/UI-07/UI-08: concise course creation, explicit role choice when sending invites, new/existing-account acceptance, role switch, honest pending/expired/revoked/denied states and unsaved-work recovery. Existing Assignments/Grading/Students course navigation is retained.

**Confirmed by Darryl:** first admin identity, instructor course creation, instructor-to-instructor invitations, new/existing-account password behaviour, course addition on acceptance and dual-role switch. **Technical proposals, not joint acceptance:** exact DTO/API extension, cross-service reservation/retry design, operator reconciliation for existing hosted owner/memberships, and Keith student consumer composition. Public self-promotion and open registration remain excluded. No application/migration/secrets/live-mail/deployment, commit or push is authorized by this planning request.
