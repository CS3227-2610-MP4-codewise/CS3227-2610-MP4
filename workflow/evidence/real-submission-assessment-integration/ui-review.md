# UI review: real submission assessment integration

- Human owner: Darryl, instructor assessment. Source base: `8db77950c5cdd4c2f8724ec6812eda56b53bd584`, with local changes.
- Design: `docs/ui/design.md`, `warm-workbook-v1`. Requirements: UI-04/05/06/07/08, SUB-03/04, GRADE-02–04, AUTH-01–03.
- Review mode: main-agent source inspection; no independent or human review. Existing instructor file only; no shared-file write window claimed. Keith producer revision: `53c1974`.

| Area | Outcome and evidence |
| --- | --- |
| Design identity and appearance (UI-01/07) | Unverified in browser. The change adjusts only a response limit and does not intentionally change layout or styling. |
| Sign-in / role switch (UI-02/03) | Unverified in this increment; no changes. |
| Versioned work and navigation (UI-04/05) | Unverified end to end. Source inspection confirms real attempt IDs are sent to the existing assessment endpoint; server allows up to 1,000 list entries. The UI parser now accepts that same limit. No browser acceptance performed. |
| Evidence links (UI-06) | Unverified in this increment. |
| Responsive and keyboard (UI-07) | Unverified; no viewport, zoom, pointer or keyboard checks performed. |
| Honest states (UI-08) | Source inspection identified that 101–1,000 valid results previously failed parsing; limit aligned. No executed 101-item browser test. Other states unverified. |
| Privacy (AUTH-02/GRADE-04) | Unverified end to end; student release composition remains outstanding. |
| Verification | Focused D1 suites could not start their assertions: Miniflare loopback connection returned EACCES. Full check reached lint after 17/17 OpenSpec validations and successful typecheck, then failed on pre-existing untracked `workflow/evidence/module-wrapup-parallel-simulation/run.mjs` unused `tasks` variable. |

No screenshots or manual walkthrough were captured. No intentional design departure. Outcome: pending verification and acceptance; next owner Darryl for assessment integration, Keith for the student consumer and cross-review.

## 2026-11-12 continuation — real submissions

The instructor review list consumes real attempt IDs. C-REL now has a separate request-bound student release endpoint with ownership and current Student membership checks; no student UI was added. Independent source review found no concrete privacy defect. The synthetic local-D1 journey has been exercised; see the increment log for exact final checks. Manual walkthrough remains pending: in a synthetic course, submit work, select its pinned publication and attempt, save a grade, approve and release, then correct and withdraw; inspect navigation, version labels, unsaved prompts, keyboard, narrow and zoomed layouts in warm-workbook-v1 (UI-04–08). No human acceptance or screenshots are claimed.

### Verification checkpoint

Final focused real-D1 run passed 3 files / 12 tests, including release owner/peer/membership/session denial, correction and tombstone privacy. The default full `npm run check` failed in its test phase under runtime timeouts/Windows lock contention; it is not a pass. Strict OpenSpec validation, typecheck, build and deployment-script tests passed separately. A broader isolated timeout investigation is pending. Human browser acceptance remains outstanding.

Final automated result: full Vitest run passed 51 files / 661 tests / 0 skipped with one worker and longer local runtime timeouts; deployment-script tests passed 4/4. Default parallel `npm run check` failed under timeouts and Windows file locking, so it remains a failed invocation. The manual checklist above has not been performed or accepted.

## Manual acceptance — 2026-11-12

Darryl reports that manual acceptance passed for the real assessment integration. This records the user's result; no new screenshots or additional agent-observed walkthrough are claimed. Requirements: UI-04–08, warm-workbook-v1, SUB-03/04 and GRADE-02–04.
