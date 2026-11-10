# Task 5.2 computer-use checklist — 2026-11-10

## Current recheck and sign-off

This checkpoint supersedes the earlier run below. All 35 screenshots were retaken under the same filenames. See [browser recheck](task-5.2-recheck.md), [manifest](screenshots/manifest.json) and [inspector captures](inspector-readings/).

| Check                                    | Current outcome                                                                                                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1: Tab → Try again → Space, API blocked | **Pass for failed retry:** Assignments heading focused, visible ring. Unblocking caused automatic revalidation; no separate successful Space-retry claim.                                      |
| Normal 1280 px window / 200%             | **Pass for inspected layout:** device toolbar off, DevTools undocked, resize overlay 1280 px before zoom; Edge Zoom 200%, effective layout 640 px. Header wraps. Four zoom filenames replaced. |
| Space/Enter on role selector             | **Finding F4:** both preserve focused checked Instructor radio. Left Arrow changes to Student and focuses Your courses. Documented switch semantics unresolved.                                |
| VoiceOver headings / once-only messages  | **Unverified:** tools have no audio feed. Local listening report requested from Keith; AX focus/names do not prove speech.                                                                     |
| Rendered target samples                  | **Pass:** action text span 140.578×44, Open 736×44, Refresh list 70.023×44, Sign in border box 76.813×44. Not exhaustive.                                                                      |
| Rendered color samples                   | **Calculated from DevTools computed RGB:** primary 11.42:1, accent 5.72:1, deadline 5.14:1, Sign in light 13.22:1/dark 12.89:1. DevTools contrast-widget ratio unverified.                     |
| States                                   | Categories retaken. Loading uses temporary 10-second latency. Cross-tab image retains synthetic overview with focus in DevTools; reload shows expired recovery. Earlier F2 remains open.       |
| Checks / cleanup                         | `npm run check` passes: 456 + 4 tests, specs/typecheck/lint/build. Zero active temporary memberships; profile removed; browser settings restored; signed out.                                  |

**Sign-off: accept observed F1 repair and normal-window zoom layout; overall return with findings.** F2/F4, VoiceOver listening, remaining combinations and Keith acceptance keep task 5.2 unchecked. No application source edits by this review.

## Earlier run (historical)

The following describes the preceding run. Screenshot links now point to retakes; their current method/interpretation is above.

SD-05/06; UI-01/02/03/04/07/08; design `warm-workbook-v1`. Actual local native-Edge run by main `/root`; no independent or human acceptance claimed. **Pass**, **fail**, **partial** and **unverified** below describe this run only. See [UI review](ui-review.md).

## Keyboard (no mouse during the named keyboard sequences)

| Check                                                             | Result                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab order: brand, role selector, Courses, account, content, pager | **Pass for inspected sequences.** Shift+Tab from heading reached account → Courses → checked Student radio → brand. Tab from heading reached course link. After 100 course links, Tab reached Next courses. Page two's six links then First page were reachable. Skip to content is an additional expected stop before brand.          |
| Focus always visible, light/dark                                  | **Fail overall.** Heading, starter source and pager rings visible in screenshots. Failed and successful Try again remove the focused button and leave focus on the HTML document, without a visible focus target. Exhaustive every-control/theme combinations unverified.                                                              |
| Page heading focused on arrival                                   | **Pass for ready courses, assignments and overview**, and direct invalid/unavailable/session-expired entries. Native AX explicitly reported the corresponding heading. Loading/transient transitions sometimes reported HTML content; cross-tab expired session hides the heading (F2).                                                |
| Space/Enter on role selector and buttons; Enter on links          | **Partial.** Pointer and native radio arrow transitions work. Space triggered Try again. Enter opened View assignments, Next courses and First page. Separate role Space/Enter activation and Enter on every button remain unverified. Current implementation is a radio group, not the switch semantics documented by design.md (F4). |
| Starter source reachable by Tab; arrow-key horizontal scrolling   | **Pass.** One Tab from overview heading focused “Starter code for question 1”. Right shifted source text within its region. [Before](screenshots/overview-code-320-dark.png), [after](screenshots/overview-code-scrolled-320-dark.png). Page width stayed contained.                                                                   |

## Screen reader (VoiceOver)

| Check                                         | Result                                                                                                                                                                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Each page heading spoken on arrival           | **Unverified.** Cmd+F5 was attempted; no usable VoiceOver UI/audio observation was obtained. Native heading focus is verified separately and does not establish speech.                                                                               |
| Status/error read once                        | **Unverified.** AX exposes a status message plus a visible message; source uses a visually hidden live status and an ordinary visible paragraph. This is not proof of duplicate speech or once-only speech. Needs an actual VoiceOver listening pass. |
| Standalone meaningful links                   | **Pass for exposed names; speech unverified.** AX exposes course name + View assignments, Open + full assignment title, Next courses, First page, and First page of assignments.                                                                      |
| Starter source name, deadline/version clarity | **Pass for accessible label and visible text; speech unverified.** “Starter code for question 1”; “Fri 20 Nov 2026, 15:59 UTC”; publication timestamp and exact version ID. [Overview](screenshots/overview-1440-dark.png).                           |

## Sizes

Device toolbar used Responsive with height 900. Filenames describe **CSS viewport width**, not PNG pixel width: native screenshots include device scaling, then were cropped without rescaling. These are viewport captures, not complete long-page exports.

| Surface     | 320                                           | 768                                           | 1024                                           | 1440                                           | 1280, browser-reported 200%                            |
| ----------- | --------------------------------------------- | --------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| Courses     | [shot](screenshots/courses-320-light.png)     | [shot](screenshots/courses-768-light.png)     | [shot](screenshots/courses-1024-light.png)     | [shot](screenshots/courses-1440-light.png)     | [shot](screenshots/courses-1280-zoom200-light.png)     |
| Assignments | [shot](screenshots/assignments-320-light.png) | [shot](screenshots/assignments-768-light.png) | [shot](screenshots/assignments-1024-light.png) | [shot](screenshots/assignments-1440-light.png) | [shot](screenshots/assignments-1280-zoom200-light.png) |
| Overview    | [shot](screenshots/overview-320-light.png)    | [shot](screenshots/overview-768-light.png)    | [shot](screenshots/overview-1024-light.png)    | [shot](screenshots/overview-1440-light.png)    | [shot](screenshots/overview-1280-zoom200-light.png)    |

- **Pass visually for inspected content:** no page-wide horizontal overflow/overlap observed; long assignment title, version ID and instructions wrap. [Long course name at 320](screenshots/courses-page2-320-light.png) also wraps. Wide source remains independently scrollable.
- Header wraps at 320, retaining visible role selector, Courses and Account. **Unverified:** expanded narrow account menu and complete control operation at every size.
- Browser AX reported `Zoom: 200%` after five zoom-in shortcuts at device width 1280, then `Zoom: 100%` after reset. Device emulation can affect the relationship between browser zoom and effective layout width; a separate ordinary desktop-window 1280px zoom pass remains advisable/unverified. [Zoomed source focus](screenshots/overview-code-1280-zoom200-light.png).

## Display settings

- **Pass visually for inspected light/dark surfaces:** [desktop dark](screenshots/overview-1440-dark.png), [narrow dark](screenshots/overview-320-dark.png), and dark source focus linked above. Filled [Next](screenshots/courses-page1-pager-1440-light.png) and Sign in ([light](screenshots/session-expired-1440-light.png), [dark](screenshots/session-expired-1440-dark.png)) labels are visible.
- **Reduced motion: partial.** Rendering panel AX confirmed `prefers-reduced-motion: reduce`. Subsequent inspected navigation was static; shared stylesheet disables animations/transitions for that preference. No frame-by-frame animation audit or full role-transition/motion matrix performed.
- **Contrast: calculated pass; rendered DevTools inspection unverified.** The following WCAG relative-luminance ratios were calculated from declared `styles.css` tokens. Screenshots visually corroborate appearance, but these values are not DevTools measurements of each rendered element.

| Combination                              | Light   | Dark    |
| ---------------------------------------- | ------- | ------- |
| Primary text / canvas                    | 11.42:1 | 12.91:1 |
| Secondary/deadline/version text / canvas | 5.14:1  | 8.38:1  |
| Accent link/focus / canvas               | 5.72:1  | 8.83:1  |
| Filled action text / ink background      | 13.22:1 | 12.89:1 |

- **Tap targets: unverified as a complete rendered check.** Source declares 44px minimums for Student links and shared action controls. Screenshots show rendered Next/Sign in, but attempts to obtain inspector dimensions did not yield a valid measurement. Do not equate CSS declarations with measured coverage of brand, role labels, Courses, Account, every action and pager.

## States and screenshots

| State                      | Actual setup / result                                                                                                                                                                            | Screenshot                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading                    | Network menu AX confirmed Slow 4G; opened exact overview, observed Assignment / Loading…                                                                                                         | [Loading](screenshots/loading-1440-dark.png)                                                                                                                                                |
| Course with no assignments | Temporary authorized synthetic course 100, no publications; long name                                                                                                                            | [Desktop](screenshots/empty-1440-light.png), [320](screenshots/empty-320-light.png)                                                                                                         |
| Normal lists and overview  | Existing local course plus explicitly approved synthetic published assignment                                                                                                                    | Size matrix above                                                                                                                                                                           |
| Long content               | Eight instruction paragraphs, long title, deliberately wide Python source, public rubric                                                                                                         | Overview/source links above                                                                                                                                                                 |
| Two pages                  | Seeded 105 synthetic courses using existing local-only helper; with original course, page one has 100 rows, page two has synthetic 100–105                                                       | [Page-one pager](screenshots/courses-page1-pager-1440-light.png), [page two desktop](screenshots/courses-page2-1440-light.png), [page two 320](screenshots/courses-page2-320-light.png)     |
| Unavailable                | `/student/assignments/made-up-version`; safe unavailable message and available-workspace link                                                                                                    | [Unavailable](screenshots/unavailable-1440-light.png)                                                                                                                                       |
| Invalid link               | Existing course assignments with `?cursor=broken`; invalid-link message and First page of assignments                                                                                            | [Invalid link](screenshots/invalid-link-1440-light.png)                                                                                                                                     |
| Can't reach server         | DevTools blocked only the selected `/api/student/courses/…/assignments` request; shell/static page still loads. Connection message and Try again; Space retry works. API process was not stopped | [In-app network failure](screenshots/network-failure-1440-light.png)                                                                                                                        |
| Session expired            | Signed out in a second tab, closed it and returned to original overview; protected content clears but shared shell hides heading/Sign in. Reload restores explicit session message               | [Cross-tab finding](screenshots/session-cross-tab-320-light.png), [reloaded 320](screenshots/session-expired-320-light.png), [reloaded desktop](screenshots/session-expired-1440-light.png) |

Additional finding: selecting Offline and then Refresh list follows a whole-document navigation and reaches the browser's network error, rather than in-app retry. [Browser error](screenshots/offline-navigation-browser-error.png). API-only blocking above separately verifies the in-app failure state. Do not claim the exact stopped-API procedure ran.

## Findings and remaining acceptance

1. **F1 — retry focus loss: repaired 2026-11-10, keyboard recheck pending.** Activate Try again, both while blocked and after restoring API access; replacement removed focus to HTML content. Repair: Try again now moves focus to the page heading before reloading (`src/web/student/StudentWorkspace.tsx`). A jsdom regression test (failing and then succeeding retry) fails before the repair and passes after; `src/web/student` 31/31, ESLint, typecheck and build pass.
2. **F2 — cross-tab expired-session recovery:** shared role availability failure clears/hides main content, including the recovery heading/Sign in. Reload works. Return to Keith/Darryl for composed shell/session repair.
3. **F3 — full-page Refresh while Offline:** browser error bypasses the application recovery screen; distinguish from an API-only failure and review recovery expectations.
4. **F4 — role control/design mismatch:** runtime exposes native radios, while design.md specifies switch semantics. Ask shared-shell owner/team to reconcile implementation or explicitly update the design; this review grants no departure.

Task 5.2 remains unchecked pending repairs, VoiceOver speech, role Space/Enter, actual contrast/44px inspection, outstanding combinations and Keith's manual acceptance. No source fixes, commit, push, archive or deployment performed.

Screenshot privacy: 35 saved PNGs are cropped to the page; browser chrome, DevTools and account email menus are excluded. No email is visible in the saved captures. Synthetic source was not executed.
