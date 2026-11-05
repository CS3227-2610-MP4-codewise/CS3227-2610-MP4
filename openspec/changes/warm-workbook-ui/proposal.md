# Warm workbook UI proposal

## Why

Codewise needs a consistent interface grounded in learning and reviewing source, rather than generic dashboard styling. Darryl selected Workbook's layout with Margin's palette and requested a real role switch, sign-in page and Previous/Next navigation, which the samples did not fully specify.

## What Changes

- Establish `docs/ui/design.md` revision `warm-workbook-v1`: warm paper/terracotta tokens, proportional interface text, serif headings and monospaced source.
- Specify sign-in and session states, trusted conditional role switching, continuous question/work layout, immutable attempt views, source-linked feedback and question navigation with separate atomic assignment submission.
- Add reusable design review evidence requirements and repository/OpenSpec guidance so future role changes cite and verify the same contract.
- Record future bounded implementation tasks; implement no application feature, authentication, UI component, API or deployment in this planning increment.

The direction is selected by the user; provider, shared identity projection and domain policy decisions remain gated. A UI switch never provisions roles. The current app is still a foundation placeholder.

## Capabilities

### New Capabilities

- `workbook-experience`: visual consistency, sign-in presentation, authorized workspace switching, question/work/version context, navigation and source-linked feedback with accessible states.

### Modified Capabilities

None. No canonical specs are populated. This new UI capability complements the in-flight MVP's AUTH-01–AUTH-03, SUB-01–SUB-04, GRADE-02–GRADE-04 and DEV-01–DEV-04; it does not replace them or duplicate their server contracts.

## Impact

Current edits are planning, agent guidance, PR/review templates and documentation only. Future implementation touches shared web tokens/chrome and role-owned components after C-ID/C-PUB/C-SUB/C-REL handoffs. Darryl owns this documentation increment; Keith retains identity/student features and must review shared consumers. No new runtime dependency, schema, authentication provider, branch protection or CI visual-comparison gate is introduced. No implementation, deployment, canonical spec sync or archive is claimed.
