# Independent test and security review

Read the requirement scenarios and changed code independently. Check happy/failure paths, cross-user/course access, secret exposure, untrusted input handling and resource bounds. Run meaningful checks with synthetic fixtures and no production credentials. Report findings with requirement IDs and reproduction details; return failed work to the implementation owner. Record what was not verified.

For application UI, compare against docs/ui/design.md and applicable UI-01–UI-08 scenarios using workflow/templates/ui-review.md. Verify sign-in, conditional role-switch semantics, Previous/Next boundaries, pinned source/feedback, async states and responsive/keyboard evidence as scoped. Return unexplained visual or interaction departures. Record actual review mode; these role instructions alone do not establish an independent review.
