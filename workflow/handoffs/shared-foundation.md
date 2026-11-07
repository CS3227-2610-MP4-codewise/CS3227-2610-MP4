# Shared foundation handoff

Owner: Darryl. Consumer/reviewer: Keith (C-ID and student integration). Requirements: AUTH-01–03, SUB-01, DEV-02, UI-01–04/UI-07–08; design warm-workbook-v1.

Base origin/main 79495387ec766c2d9c41b43ee87e9505e7d8bf85; implementation commit 870bc40. Migration 0007 is the next migration at this base; recheck before any merge or release. Darryl owns the serialized shared schema/API window, course authority, instructor UI and local operator; Keith retains student/submission ownership. His review is pending.

Course membership checks current account, session and course. Account administration is separate. The production Worker passes course authority to managed auth and composes assignment endpoints using the transactional write guard. Operator helper explicitly provisions an existing account in local D1 only. See workflow/course/README.md for local use. Invitation acceptance is not enrollment. Staging/production instructor provisioning has no implemented reviewed operator procedure yet and needs a separately reviewed release-safe procedure; no remote data has been changed.

Evidence: workflow/evidence/shared-foundation/verification.md. Local synthetic authorization and preview tests are not real Firebase or browser acceptance. Follow the reviewed GitHub Actions staging/release process for any deployment. Next: complete integrated browser and security verification, UI review, safe deployment provisioning procedure, Keith review and user manual acceptance before closing remaining section 9 tasks.
