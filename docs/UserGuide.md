# Codewise User Guide

Baseline: repository `4e65c32`, audited 13 November 2026 (Singapore time). This guide describes the implemented browser application. Hosted availability depends on the revision and configuration deployed by the team. Local implementation and synthetic previews are not proof of a hosted release.

## Access and testing

Codewise is a programming workbook. Instructors publish Python assignments and review submitted work; students write answers, submit immutable attempts, and read feedback after instructor release. Codewise does not execute submitted code or automatically run tests.

| Destination     | Address                                                                | Purpose                                               |
| --------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- |
| Product website | <https://cs3227-2610-mp4-codewise.github.io/CS3227-2610-MP4/>          | Project information and guides; separate from the app |
| Staging app     | <https://codewise-staging.codewise-cs3227-2610.workers.dev/sign-in>    | Team-managed testing                                  |
| Production app  | <https://codewise-production.codewise-cs3227-2610.workers.dev/sign-in> | Team-managed release                                  |
| Local app       | <http://127.0.0.1:8787/sign-in>                                        | Requires developer setup                              |

**Peer-test access:** ask Darryl or Keith for an invitation to a synthetic test course and the environment/revision to test. There is no public registration, shared password in this repository, or ability to grant yourself Instructor access. Use synthetic data only. If the team has not supplied an invitation and configured deployment, authenticated testing is not ready. See the [submission release checklist](../workflow/evidence/final-submission/verification.md); older foundation evidence does not verify current feature flows.

For local testing, a developer must configure Firebase/password and email integration in the ignored local environment file. See [developer setup](DeveloperGuide.md#local-setup). Installation without credentials can run automated tests and display the public page, but cannot provide a complete sign-in test. Use the configured single origin `127.0.0.1:8787` for authenticated testing.

Every screenshot below is deliberately a **manual insertion placeholder**. No live screenshots are included. Capture synthetic data only; hide personal details and never capture invitation/reset capabilities, passwords or provider secrets.

## Sign in and join a course

1. Open the invitation supplied by your instructor. It identifies the intended course and role.
2. Use the invited NUS email (supported domains: `u.nus.edu`, `u.duke.nus.edu`, `u.yale-nus.edu.sg`). Passwords must contain 8–64 characters. Follow the setup form. New recipients choose and confirm a password. Existing recipients use their existing account password; validated acceptance adds the invited course role to the same account.
3. Complete any email proof/recovery step shown. For an invalid or expired link, request a replacement rather than editing it.
4. On later visits, use **Sign in** with your email and password. Use the password recovery link if needed, then follow the email and reset form.
5. Open an available course from your workspace. The Student/Instructor switch appears only for authorized contexts. Switching views does not grant membership.
6. Sign out using the account menu. If your session expires or access changes, sign in again or return to an available workspace as directed.

> **Screenshot placeholder UG-01 — Sign in:** insert the email/password form, sign-in action and password recovery link. Use a fictitious email and leave the password empty.

> **Screenshot placeholder UG-02 — Course entry:** insert a synthetic course list for a dual-role account, with course open action and the conditional Student/Instructor switch.

## Instructor: courses and People

Eligible instructors and the configured starting owner can create a course from the course workspace. Enter its details and submit the creation form. An account without server-side authority cannot use this action.

Open a course and select **People** to inspect members and pending invitations. Choose Student or Instructor when inviting a recipient. The selected role takes effect after validated acceptance. Existing accounts retain their other course roles. Invitation status, revocation and account-recovery actions depend on your permission and the invitation state. Use **Resend** for an available pending invitation and **Revoke** to invalidate it, confirming the action when prompted. **Remove from course** removes the displayed membership after confirmation; it does not delete the account or its other course memberships. Password recovery does not change course membership.

> **Screenshot placeholder UG-03 — People:** insert a synthetic course People page showing student/instructor labels, role-targeted invitation form and a pending invitation. Redact capability links.

## Instructor: create and publish assignments

1. Open a course's **Assignments** view and create an assignment.
2. Enter the title and due date. The form labels the deadline as **Singapore time**; the server stores UTC.
3. Add questions, instructions, Python starter code, and rubric criteria with scoring guidance and maximum points. Instructions support formatted content; inspect the preview before publishing. Private reference solutions are separate from student-visible starter code.
4. Use the question controls to reorder or remove questions. Check the order and rubric.
5. Save the draft and wait for confirmation. Saving alone does not publish. Resolve validation or revision-conflict messages first.
6. Follow publication review and confirmation. Publication creates an immutable assignment version. Later edits and republication create newer versions; existing attempts keep their original version.
7. Inspect published-version history to confirm what was released.

> **Screenshot placeholder UG-04 — Authoring:** insert a synthetic question with instructions, starter code, rubric and save/publication controls. Keep private references collapsed or explicitly synthetic.

> **Screenshot placeholder UG-05 — Publication:** insert final publication review showing question order and deadline, followed by the resulting published version.

## Student: find work and edit answers

Open your course, choose a published assignment and open its workbook. The overview shows the available publication and deadline in Singapore time. Assignment rows may show **Due soon**, **Submitted**, or **Feedback released** according to server-reported state; these labels do not replace the exact attempt or deadline details. Unpublished instructor drafts are not available to students.

The workbook keeps instructions and rubric guidance beside the answer. Use the question navigation and **Previous**/**Next** to move between questions. Edit Python source under **Working copy**. Starter code is a starting point, not a submission. Tab indents four spaces; press Esc then Tab to leave the editor using the keyboard.

Answers save automatically. Wait for the server-acknowledged saved state: unsaved, saving or failed states are not confirmation. The source limit is 32 KiB per question after newline normalization. There is no code execution or Run output.

When another tab changes the same answer, **Save conflict** compares both versions. **Keep my version** and **Use saved version** require confirmation before replacement. Copy the version you want to preserve first; clipboard failure provides a manual-copy fallback. A same-tab recovery copy does not establish a successful server save.

When a newer publication appears, your answer is not silently overwritten. Use **Move my work** and review replacement choices. Existing work on the target version requires explicit selection before replacement; changed questions may require manual editing.

> **Screenshot placeholder UG-06 — Workbook:** insert a synthetic question, Python answer, saved status, Working copy/Submitted attempts tabs and question navigation.

> **Screenshot placeholder UG-07 — Conflict:** insert the two-column Save conflict comparison and choice/confirmation controls, using different synthetic answers.

## Student: submit and inspect an attempt

1. Open **Review assignment** and inspect each answer's saved revision and blank-answer warnings. Resolve failed saves and conflicts. Blank answers are explicitly identified; the system does not complete them.
2. Choose **Submit assignment…**, inspect the snapshot details, then **Confirm and submit**. Opening review or cancelling does not submit.
3. Wait for success and the attempt identifier. The server enforces deadline and publication rules. A rejected request is not a completed attempt.
4. Open **Submitted attempts** and select the attempt. Its source is read-only. Later working-copy edits do not change it. Further allowed submissions create separate attempts.

On a connection failure, use **Try again** on the submission error. This retries the same request identity to prevent accidental duplicate attempts. If prompted to reload saved answers or move to a newer publication, follow that action before confirming a new snapshot. Editing can continue after the deadline, but that does not mean submission is allowed.

> **Screenshot placeholder UG-08 — Confirmation:** insert the review list with saved revisions, a blank-answer warning if relevant, and Confirm and submit.

> **Screenshot placeholder UG-09 — Attempt:** insert the read-only submitted source, attempt identifier, publication context and server submission time.

## Instructor: assess and release

Open **Assessments** for a publication and select a student's submitted attempt. Confirm its attempt/publication context. Assessment uses immutable submitted source, not later working-copy edits.

Read the code, enter criterion scores and feedback, and add exact source-line observations where useful. Navigate through every question and save. Incomplete or invalid grading prevents approval. **Save**, **Approve**, and **Release** are separate: students see feedback only after release. Editing invalidates the prior approval and requires another approval before release.

Where AI is configured and enabled, generation requests a private suggestion. Review each question's scores, rationale and comments. Reference inclusion starts off and requires explicit selection. Applying a suggestion is an explicit all-question action, separate from approval and release. Empty/whitespace-only source uses manual assessment rather than generation.

**AI limitation:** validation does not establish grading correctness. The recorded live evaluation found accepted incorrect scores and contradictory explanations. Independently check every score and statement. AI can be disabled or unavailable; manual assessment remains the fallback. There is no automatic release or student AI progress chat in this checkout.

Use **History & corrections** to inspect saved revisions/releases. Corrections require a revised assessment, approval and release. Withdrawal makes the selected public feedback unavailable without changing the submitted attempt.

> **Screenshot placeholder UG-10 — Manual assessment:** insert immutable source, criterion score fields, a line observation and separate save/approval/release controls.

> **Screenshot placeholder UG-11 — AI suggestion:** insert a synthetic private suggestion with question scores/rationale, reference opt-in and explicit apply action. Label it as awaiting instructor review.

## Student: read released feedback

Open the relevant attempt under **Submitted attempts**. Released feedback shows criterion scores, explanations and source observations against that exact attempt. Selecting an observation highlights matching submitted lines. Unmatched observations are identified rather than attached to unrelated source.

History distinguishes current, replaced and withdrawn feedback. Withdrawn versions show their withdrawal state without former feedback content. Submitted source remains available when feedback is pending, unavailable or withdrawn. Feedback for another attempt does not replace the selected attempt's feedback.

> **Screenshot placeholder UG-12 — Feedback:** insert released criterion feedback, a selected source observation and release history against the exact attempt. Optionally add a withdrawal notice without withdrawn content.

## Troubleshooting

| What you see                          | Action                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| Sign-in unavailable / not configured  | Ask the team to check configuration; there is no bypass                        |
| Expired session                       | Preserve visible unsaved text, sign in, and reopen an authorized workspace     |
| No courses / missing assignment       | Ask the instructor to check accepted membership and publication                |
| Saving failed / too many requests     | Keep the page open, preserve text, wait as directed and retry                  |
| Deadline passed / publication changed | Follow the displayed action; a working copy is not an attempt                  |
| No released feedback                  | Wait for release; private assessments and suggestions are not student feedback |
| AI unavailable / rejected / stale     | Continue manual grading rather than repeatedly generating to bypass limits     |

## Peer-test walkthrough

Use two invited synthetic accounts (Instructor and Student) in the same course. Publish two questions with a future deadline. The student edits both, waits for saved states, confirms submission and records the attempt ID. The instructor opens that exact attempt, grades manually, saves, approves and releases. The student opens the same attempt and inspects feedback. Edit the working copy afterwards and confirm submitted source stays unchanged. Test conflicts, a newer publication, corrections and withdrawal separately. AI testing requires separately verified provider configuration and budget; the manual walkthrough does not require it.
