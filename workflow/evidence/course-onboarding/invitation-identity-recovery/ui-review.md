# UI review: invitation identity recovery

- Design: `docs/ui/design.md`, warm-workbook-v1; UI-01/02/07/08. Human owner Darryl; reviewer `/root/reviewer` read-only security review, not human acceptance.
- **Role and state:** automated schema and D1 tests cover grouped roles, duplicate entry, conservative delivery and changed role set. The join form displays the roles and offers the selected password action. Actual browser acceptance is pending.
- **Keyboard, responsive, contrast, appearance:** unverified; 320/768/1024/1440, 200% zoom, light/dark, focus and keyboard matrix not executed.
- **Security and error states:** synthetic provider/D1 tests cover explicit existing password vs create/reset and proof-bound identity, wrong password, revocation and retries. Real provider, NUS delivery, uncertain provider outcome recovery and actual user acceptance are not verified.
- **Design departures:** none intentionally selected; no new visual tokens. Full assessment pending human review.
- Outcome: pending human UI acceptance. [Technical evidence](verification.md).
