# UI review: course-role-invitations

- Human owner and role area: Darryl, shared authentication and instructor invitations.
- Source: server `4847301` and UI/preview `c1047a8`, based on `9e89848`; `codex/course-role-invitations`.
- Design: `docs/ui/design.md`, `warm-workbook-v1`. Requirements UI-01/02/07/08; COU-03–05/07.
- Review: /root UI implementation agent and /root self-inspection; /root/reviewer read-only security/behavior review. Human acceptance pending. Keith student consumer review pending.
- Evidence: [verification](verification.md).

| Review area | Outcome and evidence |
| --- | --- |
| UI-01 design identity | Partial: inspected desktop dark synthetic invitation form; warm theme and course navigation visible. Contrast and light theme not measured. |
| UI-02 sign-in and recipient flow | Partial: synthetic preview smoke and automated client/isolated provider tests; no live provider or human acceptance. Legacy form states admission only. |
| UI-03 switch | Not applicable to this increment; later shared/Keith integration remains open. |
| UI-04/05/06 versioned workspace and evidence | Not applicable to these invitation forms. |
| UI-07 responsive and keyboard | Unverified: no 320/768/1024/1440, 200% zoom or keyboard traversal matrix performed. |
| UI-01/07 contrast and appearance | Unverified: no measured contrast, light theme or screenshot artifact retained. |
| UI-08 honest state | Partial: observed synthetic student invitation as awaiting acceptance and email queued; synthetic tests cover delivery outcomes and join. Full state matrix and network-loss human review pending. |
| Privacy | Role admission uses existing account and explicit server guard; no student-assessment payload is introduced. Full consumer integration is pending. |
| Verification | See [verification](verification.md) and handoff for exact commands/results; no live mail or deployment. |

Independent review returned password-reset, revocation race, replay and mail uncertainty findings; the main agent repaired them and sought focused re-review. Unknown provider reset outcome stays fail-closed pending an operational recovery design. Student acknowledgement explicitly states that the student workspace is unavailable. No design departure has been approved. Outcome: pending manual acceptance.
