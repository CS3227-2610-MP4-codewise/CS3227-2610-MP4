# Automated metrics

Source `0e843c58765bf4aedc588abf5c5e637ee19430a6`; Edge 157.0.4341.46, real CDP rendering, 100% zoom, deviceScaleFactor 1. [Raw main](metrics.json), [supplemental original-state reduced motion](metrics-reduced-initial.json), [runner](run/measure.mjs).

| Check | Result | Evidence / limits |
|---|---|---|
| Overflow | **pass** | 104/104: scrollWidth equals viewport width; no page-level sideways scroll. |
| Literal target size | **fail** | 96 instances: only h3[tabindex="-1"], 22 px high. See F1. All actionable controls and source regions meet 44×44. |
| Focus visibility | **pass** | Every enumerated button/select/link/[tabindex] was programmatically focused after CDP Tab establishes keyboard modality; visible outline ≥2 px, contrast ≥3:1. This does not establish human tab order or screen-reader behavior. |
| Contrast light | **pass** | Initial text minimum 5.142:1; selected source/token/number minimum 4.923:1. See contrast.md. |
| Contrast dark | **pass** | Initial text minimum 6.753:1; selected source/token/number minimum 5.484:1. See contrast.md. |
| Annotation mapping | **pass** | 48/48 Enter activations: A line 1 in question 1; B lines 2–3 in question 1; C long line 1 in question 2. Both mirrored pressed states, exact highlighted range, retained trigger focus, expected live text and named note content recorded. No source was executed. |
| Wrapped logical lines | **pass** | 320 light/dark: 174-character question-2 line is 256.5 px = 9×28.5 px, one logical number; each source remains numbered 1,2,3,4. Indentation preserved. |
| Unmatched safety | **pass** | Wrong excerpt and past-end range appear only in unavailable-evidence list. Only valid question-2 line 1 is annotated. |
| Version history | **pass** | 8/8: select Version 1; replaced label and release time; no Current feedback heading. |
| Withdrawals | **pass** | 16/16 tombstones have time, no criteria table or score text. In withdrawn-current, selecting older v1 also remains replaced, never current. |
| No revival | **pass** | 8/8: older v1 still labelled replaced after current v2 withdrawal. |
| Stale retry | **pass** | 8/8 CDP Enter retry activations show released content. |
| History marker | **pass** | 8/8: three rows; middle only has Feedback released; no scores. History has no open attempt, so source-presence check is not applicable there. |
| Source retained | **pass** | 96/96 open-attempt views retain both named Submitted source regions in every feedback state; expired exposes no feedback content. |
| Truthful states | **pass** | Distinct loading/none/stale/expired/network/unavailable text, expected retry/sign-in controls, no placeholder scores. released-noannotations has criteria but no markers; replaced/withdrawn have explicit version states. |
| Privacy DOM | **pass** | 104/104 initial outerHTML scans plus selected/retry/older variants: no PRIVATE-, reason, approv, reviewer, privateReference, PRIVATE_REFERENCE or synthetic draft sentinel. Producer internals never enter API bodies. Integration/caches across real accounts remain unverified. |
| Reduced motion | **pass** | 104/104 post-interaction scans plus 16 supplemental original stale/withdrawn-current scans: every panel descendant has zero transition-duration and animation-duration. Remaining original views are unchanged or gain selected-note elements before the primary scan. |

## Exact combinations

Every one of the following 104 combinations ran (no omissions at 100%). Main raw data records original, selected, retry, older and reduced variants separately.

| Width | Theme | States |
|---|---|---|
| 320 | light | loading, none, released, released-noannotations, replaced, withdrawn-historical, withdrawn-current, unmatched, stale, expired, network, unavailable, history |
| 320 | dark | loading, none, released, released-noannotations, replaced, withdrawn-historical, withdrawn-current, unmatched, stale, expired, network, unavailable, history |
| 768 | light | loading, none, released, released-noannotations, replaced, withdrawn-historical, withdrawn-current, unmatched, stale, expired, network, unavailable, history |
| 768 | dark | loading, none, released, released-noannotations, replaced, withdrawn-historical, withdrawn-current, unmatched, stale, expired, network, unavailable, history |
| 1024 | light | loading, none, released, released-noannotations, replaced, withdrawn-historical, withdrawn-current, unmatched, stale, expired, network, unavailable, history |
| 1024 | dark | loading, none, released, released-noannotations, replaced, withdrawn-historical, withdrawn-current, unmatched, stale, expired, network, unavailable, history |
| 1440 | light | loading, none, released, released-noannotations, replaced, withdrawn-historical, withdrawn-current, unmatched, stale, expired, network, unavailable, history |
| 1440 | dark | loading, none, released, released-noannotations, replaced, withdrawn-historical, withdrawn-current, unmatched, stale, expired, network, unavailable, history |

## Unverified combinations

All widths × both themes × released/history at real 200% browser zoom (16 combinations) are unverified. No real browser zoom was driven; CDP device metrics are not zoom. All other states at 200% are also unverified. Real VoiceOver, human keyboard order/reachability, physical touch, forced colors, text-only zoom, alternate browsers and the full composed app shell/auth/authorization/D1 paths were not reviewed. Reduced-motion emulation is browser-level; no OS preference change or real screen-reader speech is claimed.

F1 is a literal requested `[tabindex]` check failure, not evidence of an undersized clickable action. No task or acceptance was recorded.
