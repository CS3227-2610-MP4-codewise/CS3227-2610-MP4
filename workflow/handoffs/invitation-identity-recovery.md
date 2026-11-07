# Handoff: invitation identity recovery

- Human owner: Darryl. Requirements: COU-03–05/07, applicable SHA-01/02/03/05/08/11, UI-01/02/07/08, warm-workbook-v1.
- Producer branch: codex/invitation-identity-recovery, based on merged main 408edc1; implementation is local until separately released. Keith owns student dashboard/submission consumers and has not reviewed this revision.
- Owned changes: existing course-onboarding specs/design/tasks; migration 0011; Firebase and managed auth store/routes; shared invitation DTO; auth UI/client; isolated synthetic provider/mail/D1 tests and preview; evidence and Darryl prompt records. No duplicated identity or membership store.
- Interface, migration and recovery decisions: [verification](../evidence/course-onboarding/invitation-identity-recovery/verification.md). Legacy audit/link records retained. Group revoke and resend states are distinct from acceptance; grouped role set is explicitly shown and checked atomically.
- Review: existing `/root/reviewer` reused for independent read-only security review. Findings returned to main agent and addressed; no claim of independently executed final tests or Keith review.
- Limits: provider reset outcome may remain uncertain and leave a fail-closed lock, as before; no verified operational reconciliation. No live email, staged migration, production operation or delivery was performed by this fix. Manual UI accessibility and acceptance remain pending.
- Next owner: Darryl for UI acceptance and controlled staging verification when separately authorized; Keith for consumer integration and composed-boundary review. Release only through reviewed GitHub Actions workflow. Resource usage is in the Darryl log, not inferred.

Final local `npm run check` passed 8 OpenSpec changes, TypeScript, ESLint, 28 Vitest files / 305 tests, 4 deployment workflow tests and the build. The independent reviewer performed static review, not an independent test run. Live-provider delivery, staged migration and manual UI acceptance remain separate gates.
