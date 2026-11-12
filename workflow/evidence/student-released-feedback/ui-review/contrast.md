# Rendered contrast

getComputedStyle supplies resolved colors, including light-dark(). A 1×1 browser canvas converts CSS colors to sRGB; transparent backgrounds are composited recursively over ancestor backgrounds. WCAG relative luminance: sRGB linearization at 0.04045, weights 0.2126/0.7152/0.0722, ratio (Lmax+0.05)/(Lmin+0.05). These are rendered CSS colors, not raw token strings or screenshot estimates.

All text is held to 4.5:1; focus, selected-line rule and marker borders to 3:1. Initial text minimum: light **5.142:1**, dark **6.753:1**. Selected source text/syntax/number minimum: light **4.923:1**, dark **5.484:1**. No measured combination fails. The selected source uses fill plus left rule; focus uses an offset 2–3 px outline. All focus samples match :focus-visible; marker/observation outlines are ink while selection rule is accent.

| Theme | Element / state | Kind | Foreground RGB | Background RGB | Ratio | Result |
|---|---|---|---|---|---|---|
| dark | `.cw-fb-bounds` | text | (190, 194, 176) | (37, 38, 32) | 8.377:1 | pass |
| dark | `.cw-fb-bounds (selected view)` | text | (190, 194, 176) | (37, 38, 32) | 8.377:1 | pass |
| dark | `.cw-fb-code` | text | (240, 236, 223) | (44, 46, 38) | 11.645:1 | pass |
| dark | `.cw-fb-code (selected view)` | text | (240, 236, 223) | (44, 46, 38) | 11.645:1 | pass |
| dark | `.cw-fb-code (selected view)` | text | (240, 236, 223) | (72, 56, 45) | 9.456:1 | pass |
| dark | `.cw-fb-code .token` | text | (199, 181, 238) | (44, 46, 38) | 7.388:1 | pass |
| dark | `.cw-fb-code .token` | text | (215, 165, 220) | (44, 46, 38) | 6.753:1 | pass |
| dark | `.cw-fb-code .token` | text | (225, 173, 128) | (44, 46, 38) | 6.875:1 | pass |
| dark | `.cw-fb-code .token` | text | (240, 236, 223) | (44, 46, 38) | 11.645:1 | pass |
| dark | `.cw-fb-code .token (selected view)` | text | (199, 181, 238) | (44, 46, 38) | 7.388:1 | pass |
| dark | `.cw-fb-code .token (selected view)` | text | (215, 165, 220) | (44, 46, 38) | 6.753:1 | pass |
| dark | `.cw-fb-code .token (selected view)` | text | (225, 173, 128) | (44, 46, 38) | 6.875:1 | pass |
| dark | `.cw-fb-code .token (selected view)` | text | (225, 173, 128) | (72, 56, 45) | 5.583:1 | pass |
| dark | `.cw-fb-code .token (selected view)` | text | (240, 236, 223) | (44, 46, 38) | 11.645:1 | pass |
| dark | `.cw-fb-code .token (selected view)` | text | (240, 236, 223) | (72, 56, 45) | 9.456:1 | pass |
| dark | `.cw-fb-criteria td` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `.cw-fb-criteria td (selected view)` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `.cw-fb-criteria th` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `.cw-fb-criteria th (selected view)` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `.cw-fb-letter` | text | (255, 179, 153) | (37, 38, 32) | 8.832:1 | pass |
| dark | `.cw-fb-letter (selected view)` | text | (255, 179, 153) | (37, 38, 32) | 8.832:1 | pass |
| dark | `.cw-fb-letter (selected view)` | text | (255, 179, 153) | (72, 56, 45) | 6.471:1 | pass |
| dark | `.cw-fb-marker` | text | (255, 179, 153) | (44, 46, 38) | 7.969:1 | pass |
| dark | `.cw-fb-marker (selected view)` | text | (255, 179, 153) | (44, 46, 38) | 7.969:1 | pass |
| dark | `.cw-fb-marker (selected view)` | text | (255, 179, 153) | (72, 56, 45) | 6.471:1 | pass |
| dark | `.cw-fb-no` | text | (190, 194, 176) | (44, 46, 38) | 7.558:1 | pass |
| dark | `.cw-fb-no (selected view)` | text | (190, 194, 176) | (44, 46, 38) | 7.558:1 | pass |
| dark | `.cw-fb-no (selected view)` | text | (190, 194, 176) | (72, 56, 45) | 6.138:1 | pass |
| dark | `.cw-student-notice` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `.cw-student-source .token` | text | (199, 181, 238) | (44, 46, 38) | 7.388:1 | pass |
| dark | `.cw-student-source .token` | text | (215, 165, 220) | (44, 46, 38) | 6.753:1 | pass |
| dark | `.cw-student-source .token` | text | (225, 173, 128) | (44, 46, 38) | 6.875:1 | pass |
| dark | `.cw-student-source .token` | text | (240, 236, 223) | (44, 46, 38) | 11.645:1 | pass |
| dark | `.cw-wb-feedback-marker` | text | (187, 213, 175) | (37, 38, 32) | 9.624:1 | pass |
| dark | `a. focus outline` | indicator | (255, 179, 153) | (37, 38, 32) | 8.832:1 | pass |
| dark | `button.cw-action.cw-action--secondary focus outline` | indicator | (255, 179, 153) | (37, 38, 32) | 8.832:1 | pass |
| dark | `button.cw-fb-marker border` | indicator | (255, 179, 153) | (44, 46, 38) | 7.969:1 | pass |
| dark | `button.cw-fb-marker focus outline` | indicator | (240, 236, 223) | (44, 46, 38) | 11.645:1 | pass |
| dark | `button.cw-fb-observation focus outline` | indicator | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `code.cw-fb-code on annotation` | text | (240, 236, 223) | (72, 56, 45) | 9.456:1 | pass |
| dark | `div.cw-fb-source focus outline` | indicator | (255, 179, 153) | (37, 38, 32) | 8.832:1 | pass |
| dark | `h3` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `h3 (selected view)` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `h3. focus outline` | indicator | (255, 179, 153) | (37, 38, 32) | 8.832:1 | pass |
| dark | `h4` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `h4 (selected view)` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `p` | text | (190, 194, 176) | (37, 38, 32) | 8.377:1 | pass |
| dark | `p` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `p (selected view)` | text | (190, 194, 176) | (37, 38, 32) | 8.377:1 | pass |
| dark | `p (selected view)` | text | (240, 236, 223) | (37, 38, 32) | 12.906:1 | pass |
| dark | `pre.cw-student-source.cw-wb-attempt-source focus outline` | indicator | (255, 179, 153) | (37, 38, 32) | 8.832:1 | pass |
| dark | `select. focus outline` | indicator | (255, 179, 153) | (37, 38, 32) | 8.832:1 | pass |
| dark | `selected-line left rule` | indicator | (255, 179, 153) | (72, 56, 45) | 6.471:1 | pass |
| dark | `span.cw-fb-no on annotation` | text | (190, 194, 176) | (72, 56, 45) | 6.138:1 | pass |
| dark | `span.cw-wb-feedback-marker border` | indicator | (187, 213, 175) | (37, 38, 32) | 9.624:1 | pass |
| dark | `span.token.keyword on annotation` | text | (215, 165, 220) | (72, 56, 45) | 5.484:1 | pass |
| dark | `span.token.number on annotation` | text | (199, 181, 238) | (72, 56, 45) | 5.999:1 | pass |
| dark | `span.token.operator on annotation` | text | (240, 236, 223) | (72, 56, 45) | 9.456:1 | pass |
| dark | `span.token.punctuation on annotation` | text | (240, 236, 223) | (72, 56, 45) | 9.456:1 | pass |
| dark | `span.token.string on annotation` | text | (225, 173, 128) | (72, 56, 45) | 5.583:1 | pass |
| light | `.cw-fb-bounds` | text | (97, 100, 87) | (241, 236, 226) | 5.142:1 | pass |
| light | `.cw-fb-bounds (selected view)` | text | (97, 100, 87) | (241, 236, 226) | 5.142:1 | pass |
| light | `.cw-fb-code` | text | (44, 48, 41) | (255, 253, 247) | 13.218:1 | pass |
| light | `.cw-fb-code (selected view)` | text | (44, 48, 41) | (244, 229, 219) | 10.934:1 | pass |
| light | `.cw-fb-code (selected view)` | text | (44, 48, 41) | (255, 253, 247) | 13.218:1 | pass |
| light | `.cw-fb-code .token` | text | (44, 48, 41) | (255, 253, 247) | 13.218:1 | pass |
| light | `.cw-fb-code .token` | text | (99, 87, 154) | (255, 253, 247) | 6.144:1 | pass |
| light | `.cw-fb-code .token` | text | (138, 60, 124) | (255, 253, 247) | 6.841:1 | pass |
| light | `.cw-fb-code .token` | text | (146, 82, 41) | (255, 253, 247) | 5.965:1 | pass |
| light | `.cw-fb-code .token (selected view)` | text | (44, 48, 41) | (244, 229, 219) | 10.934:1 | pass |
| light | `.cw-fb-code .token (selected view)` | text | (44, 48, 41) | (255, 253, 247) | 13.218:1 | pass |
| light | `.cw-fb-code .token (selected view)` | text | (99, 87, 154) | (255, 253, 247) | 6.144:1 | pass |
| light | `.cw-fb-code .token (selected view)` | text | (138, 60, 124) | (255, 253, 247) | 6.841:1 | pass |
| light | `.cw-fb-code .token (selected view)` | text | (146, 82, 41) | (244, 229, 219) | 4.934:1 | pass |
| light | `.cw-fb-code .token (selected view)` | text | (146, 82, 41) | (255, 253, 247) | 5.965:1 | pass |
| light | `.cw-fb-criteria td` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `.cw-fb-criteria td (selected view)` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `.cw-fb-criteria th` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `.cw-fb-criteria th (selected view)` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `.cw-fb-letter` | text | (155, 62, 43) | (241, 236, 226) | 5.721:1 | pass |
| light | `.cw-fb-letter (selected view)` | text | (155, 62, 43) | (241, 236, 226) | 5.721:1 | pass |
| light | `.cw-fb-letter (selected view)` | text | (155, 62, 43) | (244, 229, 219) | 5.478:1 | pass |
| light | `.cw-fb-marker` | text | (155, 62, 43) | (255, 253, 247) | 6.622:1 | pass |
| light | `.cw-fb-marker (selected view)` | text | (155, 62, 43) | (244, 229, 219) | 5.478:1 | pass |
| light | `.cw-fb-marker (selected view)` | text | (155, 62, 43) | (255, 253, 247) | 6.622:1 | pass |
| light | `.cw-fb-no` | text | (97, 100, 87) | (255, 253, 247) | 5.952:1 | pass |
| light | `.cw-fb-no (selected view)` | text | (97, 100, 87) | (244, 229, 219) | 4.923:1 | pass |
| light | `.cw-fb-no (selected view)` | text | (97, 100, 87) | (255, 253, 247) | 5.952:1 | pass |
| light | `.cw-student-notice` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `.cw-student-source .token` | text | (44, 48, 41) | (255, 253, 247) | 13.218:1 | pass |
| light | `.cw-student-source .token` | text | (99, 87, 154) | (255, 253, 247) | 6.144:1 | pass |
| light | `.cw-student-source .token` | text | (138, 60, 124) | (255, 253, 247) | 6.841:1 | pass |
| light | `.cw-student-source .token` | text | (146, 82, 41) | (255, 253, 247) | 5.965:1 | pass |
| light | `.cw-wb-feedback-marker` | text | (61, 98, 69) | (241, 236, 226) | 5.884:1 | pass |
| light | `a. focus outline` | indicator | (155, 62, 43) | (241, 236, 226) | 5.721:1 | pass |
| light | `button.cw-action.cw-action--secondary focus outline` | indicator | (155, 62, 43) | (241, 236, 226) | 5.721:1 | pass |
| light | `button.cw-fb-marker border` | indicator | (155, 62, 43) | (255, 253, 247) | 6.622:1 | pass |
| light | `button.cw-fb-marker focus outline` | indicator | (44, 48, 41) | (255, 253, 247) | 13.218:1 | pass |
| light | `button.cw-fb-observation focus outline` | indicator | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `code.cw-fb-code on annotation` | text | (44, 48, 41) | (244, 229, 219) | 10.934:1 | pass |
| light | `div.cw-fb-source focus outline` | indicator | (155, 62, 43) | (241, 236, 226) | 5.721:1 | pass |
| light | `h3` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `h3 (selected view)` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `h3. focus outline` | indicator | (155, 62, 43) | (241, 236, 226) | 5.721:1 | pass |
| light | `h4` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `h4 (selected view)` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `p` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `p` | text | (97, 100, 87) | (241, 236, 226) | 5.142:1 | pass |
| light | `p (selected view)` | text | (44, 48, 41) | (241, 236, 226) | 11.420:1 | pass |
| light | `p (selected view)` | text | (97, 100, 87) | (241, 236, 226) | 5.142:1 | pass |
| light | `pre.cw-student-source.cw-wb-attempt-source focus outline` | indicator | (155, 62, 43) | (241, 236, 226) | 5.721:1 | pass |
| light | `select. focus outline` | indicator | (155, 62, 43) | (241, 236, 226) | 5.721:1 | pass |
| light | `selected-line left rule` | indicator | (155, 62, 43) | (244, 229, 219) | 5.478:1 | pass |
| light | `span.cw-fb-no on annotation` | text | (97, 100, 87) | (244, 229, 219) | 4.923:1 | pass |
| light | `span.cw-wb-feedback-marker border` | indicator | (61, 98, 69) | (241, 236, 226) | 5.884:1 | pass |
| light | `span.token.keyword on annotation` | text | (138, 60, 124) | (244, 229, 219) | 5.658:1 | pass |
| light | `span.token.number on annotation` | text | (99, 87, 154) | (244, 229, 219) | 5.082:1 | pass |
| light | `span.token.operator on annotation` | text | (44, 48, 41) | (244, 229, 219) | 10.934:1 | pass |
| light | `span.token.punctuation on annotation` | text | (44, 48, 41) | (244, 229, 219) | 10.934:1 | pass |
| light | `span.token.string on annotation` | text | (146, 82, 41) | (244, 229, 219) | 4.934:1 | pass |

Raw per-control outlines, dimensions, resolved colors, source-token colors and selected range measurements are in [metrics.json](metrics.json). Coverage: all 104 original combinations, all focusable controls enumerated by the requested selectors, all 48 released observation activations. Absent elements are not counted (for example no criteria in a tombstone, no history marker inside an open attempt). This does not verify forced colors or human focus perception at 200% zoom.
