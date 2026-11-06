# UI clarity review — 2026-11-06

Owner: Darryl. Requirements UI-01/02/07/08, AUTH-01–03, SUB-01. Design: warm-workbook-v1 plus user-approved clarity addendum. Branch codex/shared-authentication continues the current producer; no unrelated changes carried forward. Shared/instructor presentation only; no student/backend/contracts changes.

## Commits completed before UI edits

- b62165f: isolated Workers Free password-hash feasibility evidence.
- 386b681cf8b352374e748a329691ac158b1cc132: Firebase/Brevo implementation, specifications, tests and configuration templates.
- b169c11: committed producer manifest, handoff and project log.

The subsequent UI refinement is uncommitted for visual review. No push, merge or deployment.

## Result

Compact single-panel sign-in/recovery instead of repeated introductions. Shared SVG book/code brand and labelled action icons, integrated password visibility, short contextual hints/errors, no marketing/footer repetition. Invitation list autoloads and retains current identity, clear pending/signup/email distinctions and optional status guidance. Less duplicate instructor heading/help copy; saved/draft/private/published semantics and dedicated editor navigation remain.

## Actual verification

- PASS final npm run check: six strict OpenSpec changes, TypeScript, ESLint,169 Vitest tests/9 files,4 Node deployment checks and production build (242.22kB/gzip76.02kB JS;10.49kB/gzip2.73kB CSS).
- Required existing domain/security suites remain passing; no tests added solely to mirror cosmetic markup. Backend/shared transport diff is empty.
- Independent read-only /root/auth_review: two focused source reviews. Findings: retain concise Codewise-password distinction and visible signed-in identity. Both repaired and rechecked. SVGs decorative, icon controls labelled/type=button/44px; private/version guards preserved. Main also invalidated pending invitation reads on denial/session loss.
- Browser: sign-in at320/768/1024/1440 actual CSS viewport widths, no horizontal overflow; eye toggle with empty field works and Tab reaches submit. Recovery navigation works. System dark and emulated light/reduced-motion observed.
- Instructor: new dedicated editor, title/question/instructions edits, Save draft then reload retains values. Tested only a newly created synthetic UI clarity demo; existing assignments untouched, no publication. At320/768/1024/1440, document scroll width is viewport minus scrollbar (305/753/1009/1425), no horizontal overflow.
- Invitations: synthetic instructor identity visible, list autoloads, invented recipient queues mail and appears Awaiting signup / Email queued. Actual320px emulation yields305px document width; controls stack with identity preserved. Initial browser-wide override affected another active tab, so that non-320 observation was rejected and the target tab rechecked with scoped emulation; narrow artifact replaced with a320px capture.
- Browser viewport/media overrides restored. No real password, learner code, external email or live-provider call in UI checks.
- Local build initially hit the known tool permission restriction on Vite; final full check ran successfully with authorized local build permissions. No automatic-review rejection remains.

## Evidence

[Sign-in desktop](sign-in-desktop.jpg), [sign-in320](sign-in-320.jpg), [recovery](recovery-desktop.jpg), [invitations desktop](invitations-desktop.jpg), [invitations320](invitations-320.jpg), [instructor desktop](instructor-desktop.jpg), [instructor320](instructor-320.jpg).

Screenshots contain only invented local identities and a deliberately synthetic draft. Native200% zoom, full browser/screen-reader/contrast/state matrix and all theme/width combinations remain unverified; this is representative UI verification, not completion of warm-workbook cross-role acceptance.

## Manual acceptance pending

Review compact sign-in/recovery, the invitation list/status disclosure and saved assignment editing in the local previews. Check the revised copy, icon meanings, keyboard/focus and preferred display size. Darryl manual acceptance remains open (task6.4). Real Firebase/Brevo setup, NUS delivery, Keith course authorization/review and hosted capacity remain pending from SH-AUTH; no integration/deployment task closed.

Final evidence receipt: unchanged Gitleaks8.24.2 scanned the non-ignored source export (~1.36MB), no leaks. Auth logout returned to the compact sign-in form. A later attempt to refresh the desktop screenshot failed at browser capture; the earlier successful screenshot was retained and display overrides were explicitly restored. This does not add a screenshot pass or change the earlier verified UI/source/build results.
