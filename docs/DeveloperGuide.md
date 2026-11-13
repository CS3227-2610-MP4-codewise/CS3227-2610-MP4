# Codewise Developer Guide

Baseline: `4e65c32`, audited 13 November 2026 (Singapore time). This guide describes current source, not certification that the same revision is deployed. See [submission verification](../workflow/evidence/final-submission/verification.md) for checks and release gaps, and [User Guide](UserGuide.md) for interactions.

## Architecture and ownership

One React/Vite browser application calls one native Cloudflare Worker API backed by a D1 database per environment. Firebase supplies password/proof authority; the Worker maps identity into one authoritative application account/session/course store. Gmail delivers configured proof links. Student and instructor modules share that store. SoCLaaS is called only through the server gateway.

This component overview uses architectural notation. The following class, sequence and state diagrams are UML views; GitHub renders their Mermaid blocks. Diagrams omit unrelated detail; source and runtime validators are authoritative.

```mermaid
flowchart LR
  B[React browser] -->|same-origin API and cookie| W[Cloudflare Worker]
  W --> A[Managed auth and course authority]
  W --> I[Instructor assignments and assessments]
  W --> S[Student drafts attempts and feedback]
  A --> DB[(D1 per environment)]
  I --> DB
  S --> DB
  A --> F[Firebase password and proof API]
  A --> G[Gmail delivery]
  I --> AI[Secure AI gateway]
  AI --> DB
  AI --> L[SoCLaaS]
  P[GitHub Pages product site] -. links to .-> B
```

| Location                                        | Responsibility                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/web/main.tsx`                              | Public entry and browser route selection                                                |
| `src/web/auth/`, `src/web/ui/`                  | Auth screens, shared workbook controls, context switch and sanitized instructions       |
| `src/web/instructor/`, `src/server/instructor/` | Darryl: authoring/publication, attempt review, assessment/approval/release              |
| `src/web/student/`, `src/server/student/`       | Keith: discovery, editor/drafts, immutable attempts and released feedback               |
| `src/server/index.ts`                           | API composition, health, API reservation, assets and security headers                   |
| `src/server/auth/`, `src/server/courses/`       | Darryl: shared accounts/sessions, invitations/recovery, membership/object authorization |
| `src/server/ai/`                                | Server-only transport, admission/accounting, context resolution and validation          |
| `src/shared/`                                   | DTOs and closed runtime schemas; parsing is not authorization                           |
| `src/server/db/migrations/`                     | Ordered shared SQL migrations; one active schema writer                                 |
| `src/product-site/`                             | GitHub Pages website source; guides are rendered in at build time                       |

Read [Ownership](../workflow/Ownership.md) and [IntegrationContracts](../workflow/IntegrationContracts.md) before shared-service edits. Both members review composed boundaries; policy agreement does not replace exact-revision consumer acceptance. These diagrams describe source composition, not completion of all historical OpenSpec gates.

## Identity and object authorization

The active composition in `src/server/index.ts` uses `ManagedAuthRoutes`, `ManagedStore`, `CourseAuthority` and `composeIdentityCourse`. Retained Google/OIDC adapter code and early workflow notes describe an earlier integration, not the active Firebase browser path.

```mermaid
classDiagram
  class ManagedAuthRoutes {
    fetch(request)
    requireSession(request)
    requireMutationOrigin(request)
  }
  class ManagedStore
  class CourseAuthority {
    requireCourse(principal, courseId, permission)
    requireObject(principal, object, action)
  }
  class IdentityCoursePort {
    <<interface>>
    requireSession(request)
    requireMutationOrigin(request)
    requireCourse(principal, courseId, permission)
    requireObject(principal, object, action)
  }
  class AssignmentService
  class AssessmentWorkflow
  ManagedAuthRoutes --> ManagedStore : persists identity and sessions
  IdentityCoursePort ..> ManagedAuthRoutes : composition forwards identity
  IdentityCoursePort ..> CourseAuthority : composition forwards authority
  AssignmentService --> IdentityCoursePort : authorizes
  AssessmentWorkflow --> IdentityCoursePort : authorizes
```

Session cookies identify server-validated accounts. Mutations require exact-origin/CSRF checks. Resolve an object's authoritative course before private reads/writes; browser role/course values never authorize. Guarded D1 writes recheck authority against revocation between initial lookup and commit. Workspace switching uses trusted contexts for presentation only. Student DTOs exclude references, private assessments and provider payloads. Protected responses are no-store. Secrets never belong in `VITE_*`, fixtures or logs.

## Versioned work and submissions

An instructor draft is revision-checked and editable. Publication freezes question order/content, rubric and version IDs. Student working copies belong to an account and published question version. Submission freezes acknowledged answer revisions into an immutable attempt. Assessment pins publication, attempt and source hashes, so later working-copy edits cannot change evidence.

This conceptual UML model summarizes relationships, not literal SQL tables. Migrations and `src/shared/instructor-contracts/` define fields and keys.

```mermaid
classDiagram
  class Course
  class Membership {
    userId
    role
    active
  }
  class AssignmentDraft {
    revision
  }
  class Publication {
    assignmentVersionId
    deadlineAt
  }
  class QuestionVersion {
    questionVersionId
    rubricVersionId
  }
  class WorkingCopy {
    userId
    revision
    sourceHash
  }
  class Attempt {
    attemptId
    submittedAt
  }
  class SubmittedAnswer {
    source
    sourceHash
  }
  class AssessmentRevision
  class Release {
    releaseVersion
  }
  Course "1" o-- "0..*" Membership
  Course "1" o-- "0..*" AssignmentDraft
  AssignmentDraft "1" --> "0..*" Publication : publishes
  Publication "1" *-- "1..*" QuestionVersion
  QuestionVersion "1" <-- "0..*" WorkingCopy : targets
  Publication "1" <-- "0..*" Attempt : pins
  Attempt "1" *-- "1..*" SubmittedAnswer
  QuestionVersion "1" <-- "0..*" SubmittedAnswer : pins
  Attempt "1" <-- "0..*" AssessmentRevision : assesses
  AssessmentRevision "1" <-- "0..*" Release : approved public projection
```

```mermaid
sequenceDiagram
  actor Student
  participant UI as Workbook and review
  participant API as studentHandler / StudentWork
  participant DB as D1
  Student->>UI: Edit answer
  UI->>API: Save source with baseRevision
  API->>DB: Check identity, membership and revision, then persist
  alt Revision conflict
    DB-->>API: Current saved revision
    API-->>UI: Conflict and saved copy
    UI-->>Student: Compare and explicitly choose
  else Save succeeds
    DB-->>API: Acknowledged revision and hash
    API-->>UI: Saved
    Student->>UI: Review then confirm submission
    UI->>API: Pinned revisions and retry identity
    API->>DB: Guard authority, publication, deadline and snapshot atomically
    DB-->>API: Immutable attempt or existing retry result
    API-->>UI: Attempt identifier
  end
```

`src/server/student/http.ts`, `work.ts` and tests define body bounds, conflicts, atomic snapshots, deadline equality, retry fingerprints and limits. Source normalizes to LF with a 32 KiB per-question limit. Inspect these before changing policy. Tab recovery does not establish a server save. No submitted Python is executed.

## Assessment and release

`AssessmentWorkflow` composes identity, `AssignmentService`, `AssessmentRepository` and real `D1SubmissionCatalog`. `D1OwnedAttemptReader` and student release ports bind reads to the current account and exact attempt. Normal composition uses real D1 submissions; sample injection is restricted to explicit loopback development.

This state diagram expresses approval/publication semantics. Corrections create new revisions/releases with retained history; withdrawal exposes a public tombstone rather than deleting the attempt or audit.

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Draft: Edit and save revision
  Draft --> Approved: Complete valid grading and approve
  Approved --> Draft: Edit invalidates approval
  Approved --> Released: Explicit release of approved revision
  Released --> CorrectionDraft: Create correction revision
  CorrectionDraft --> CorrectionApproved: Save valid grading and approve
  CorrectionApproved --> CorrectionDraft: Edit invalidates approval
  CorrectionApproved --> Released: Release new version; prior version replaced
  Released --> Withdrawn: Withdraw selected public version
```

Source observations require valid ranges and exact excerpts against immutable submitted source. Student feedback distinguishes current/replaced/withdrawn versions. Unmatched observations are not attached to unrelated lines. Suggestion adoption, approval and release are separate server operations; disabling UI controls is insufficient enforcement.

## Server-only AI and resources

```mermaid
sequenceDiagram
  actor Instructor
  participant W as AssessmentWorkflow
  participant G as SecureAIGateway
  participant D as GatewayStore / D1
  participant P as SoCLaaS transport
  Instructor->>W: Explicit generate with reference opt-in
  W->>W: Authorize and pin publication / attempt / prompt
  W->>G: Resolve selected immutable evidence
  alt Disabled, blank source or admission refused
    G-->>W: Unavailable or refused (manual grading remains)
  else Admitted
    G->>D: Reserve bounded request and resources
    G->>P: Server-only bounded request
    P-->>G: Untrusted output and usage
    G->>G: Parse closed schema, validate scores and source evidence
    G->>D: Record outcome and settle or retain accounting
    G-->>W: Valid private candidate or failure
    W->>W: Recheck authority and evidence on read / adoption
    W-->>Instructor: Review suggestion, then explicit adoption
  end
```

The gateway implements configuration, admission, reuse, retry and uncertain-work accounting. Cached results still require current authorization. Do not clear debt after a timeout or infer provider capability from an application output cap. Verify model access/quotas before activation. The evaluation-specific no-retry adapter does not mean all runtime requests never retry.

The [12-attempt live evaluation](../workflow/evidence/instructor-ai-assessment/live-quality-evaluation.md) concludes **needs repair**: schema-valid candidates had wrong scores or contradictory explanations. Blank-source guards and prompt repairs narrow failures without proving reliability or general injection resistance. Prompt fingerprint changes can invalidate old candidates with `STALE_EVIDENCE`; 512-output profiles now fail closed. Review compatibility, supported output/framing limits and cross-environment budget coordination before activation. This submission audit makes no provider calls.

## Browser and API entry points

| Browser entry                                                             | Function                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `/`                                                                       | Public introduction                                                 |
| `/sign-in`, `/auth/finish`, `/auth/forgot`, `/auth/reset`, `/auth/action` | Authentication/proof/recovery                                       |
| `/auth/invitations?courseId=…`                                            | Authorized People/invitation UI                                     |
| `/workspace`                                                              | Resolve available context; optional role hint grants no permissions |
| `/instructor/assignments` and `/instructor/assignments/:id`               | Authoring                                                           |
| `/instructor/review` and `/instructor/assessments/:id`                    | Attempt selection and assessment                                    |
| `/student` and `/student/…`                                               | Discovery/workbook, parsed by `src/web/student/model.ts`            |

API groups: `/api/auth/*`, `/api/courses/*`, `/api/instructor/*`, `/api/student/*`, and public `GET /api/health`. Their route handlers and shared schemas define exact verbs/payloads. Unknown API paths return JSON errors rather than SPA HTML. Health tests metadata readiness, not all tables, providers or feature flows.

## Local setup

Use Node.js 22.12+ and the lockfile (CI uses Node 22). In PowerShell use `.cmd` wrappers when script execution policy requires them.

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run db:local
npm.cmd run dev:api
```

Open <http://127.0.0.1:8787>. Before authenticated use, copy `.dev.vars.example` into ignored `.dev.vars`, configure Firebase, exact `AUTH_ORIGIN=http://127.0.0.1:8787`, owner bootstrap and mail as described by the current example and [auth runbook](../workflow/auth/README.md). The current setup section supersedes its preserved historical Google notes; active `firebase.ts`, `managed-routes.ts`, and `environment.ts` define runtime configuration. Never put credentials in guides, chat or source.

`npm.cmd run dev` starts Wrangler/Vite at 8787/5173 for UI iteration; prefer the configured single origin for real auth/CSRF testing. `npm.cmd run dev:workflow -- --setup-owner-course` sets up a synthetic local instructor course for an existing configured owner, not remote provisioning. Isolated `dev:instructor`, `dev:assessment` and `dev:auth` previews use synthetic adapters; label evidence accordingly. Inspect local student seed plans in `workflow/student/` before use.

## Verification and code quality

```powershell
npm.cmd run check
npm.cmd run format:check
```

`check` runs strict OpenSpec validation, TypeScript, ESLint, Vitest, deployment-gate tests and client build. Formatting is separate. See [actual audit results](../workflow/evidence/final-submission/verification.md): a focused rerun does not make an earlier failed command pass. Use integration/security checks for changed boundaries. CI also scans secrets, audits dependencies and bundles the Worker. Opt-in live evaluation must not run during ordinary tests.

UI follows [warm-workbook-v1](ui/design.md) with dated approved refinements, UI-01–UI-08, shared controls/palette, accessible navigation and explicit version/save/error states. Complete the [UI review](../workflow/templates/ui-review.md) for app UI changes. This pass changes guides and the product website rather than application UI/permissions.

## Agentic SE process and workflow files

Read `AGENTS.md`, `openspec/config.yaml`, relevant proposal/design/spec/tasks, ownership and contracts before bounded changes. The coordinator assigns requirements and write ownership; specification clarifies scenarios; implementation supplies code/evidence; independent review returns findings to the writer; humans accept and release. Role files alone are not proof separate agents ran. This audit uses one main agent and no children. DEV-01–DEV-04 cover change control, coordination, security and evidenced deliverables.

The [per-file inventory](../workflow/FILE-INDEX.md) provides a brief purpose for every workflow file. Directory map:

| Location                                                                                      | Purpose                                                                                         |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `workflow/agents/`                                                                            | Coordinator/specification/implementation/reviewer instructions                                  |
| `workflow/templates/`, `workflow/handoffs/`                                                   | Log/review templates and dated transitions with revisions, findings, blockers and next owner    |
| `workflow/Ownership.md`, `workflow/IntegrationContracts.md`                                   | Writers, interfaces, decisions and historical agreements                                        |
| `workflow/contracts/`, `workflow/fixtures/`                                                   | Reusable acceptance checks and synthetic fixtures                                               |
| `workflow/scripts/`                                                                           | Deploy configuration, trusted-release gate, smoke checks and tests                              |
| `workflow/auth/`, `workflow/course/`, `workflow/student/`                                     | Local provisioning plans/operators and boundary checks                                          |
| `workflow/instructor-preview/`, `workflow/assessment-preview/`, `workflow/connected-preview/` | Isolated/connected previews, adapters and integration checks                                    |
| `workflow/measured-evaluation/`                                                               | Deterministic context/validator controls and assistant review                                   |
| `workflow/ai-quality-evaluation/`                                                             | Opt-in bounded live evaluation, accounting/no-retry controls and offline rehearsals             |
| `workflow/experiment-tracker/`                                                                | Explicit recording controls, redacted exports and coverage tests; private runtime stays ignored |
| `workflow/evidence/`                                                                          | Change-grouped verification, synthetic browser captures, metrics, manifests and findings        |
| `workflow/README.md`, `workflow/FILE-INDEX.md`                                                | Entry point and file catalogue                                                                  |

Conventional exceptions are deliberate: `.github/` hosts tool-discovered Actions/PR configuration; `openspec/` hosts CLI-discovered specs; `.agents/skills/` hosts assistant skills; root build/lint/config/lock files are tool entry points; `src/` is product code; `docs/` and `logs/` are required deliverables. Moving these into `workflow/` would break discovery or obscure product code. Graders, fixtures and preview adapters naturally remain under `workflow/`. Historical evidence is preserved.

Darryl logs every prompt with its own Agents spawned and Token count sections. Keith uses substantial-request checkpoints and explicit recorder opt-in. See [policy](../logs/README.md) and [summary index](../logs/INDEX.md). Do not infer missing agents, tokens or reviews. Reconcile provisional measurements when scoped telemetry is available; report missing measurements honestly. [Reflections](Reflections.md) separates observations from confounded comparisons.

## Releases and GitHub Pages

`.github/workflows/deploy-staging.yml` runs main-push CI and staging deployment/smoke, then protected production approval with the same run's artifact/trust checks. Follow [Deployment](Deployment.md); no ad hoc production migrations or development-data publication. Record commit, Actions run, smoke and authenticated acceptance before claiming feature-release readiness. Historical foundation deployment is not the current release manifest.

`.github/workflows/product-site.yml` runs `npm run site:build` (`workflow/scripts/build-product-site.mjs`), which copies `src/product-site/` and renders this guide and the [User Guide](UserGuide.md) into `site-dist/user-guide.html` and `site-dist/developer-guide.html` (GitHub-style heading anchors, browser-rendered Mermaid, guide-to-guide links kept on the site, other repository links sent to GitHub). It uploads `site-dist/` and deploys it through `github-pages` on main. Settings → Pages must use **GitHub Actions**. The site's primary app link is the production sign-in. Site changes become public after the reviewed workflow succeeds; this audit prepares files without claiming a fresh remote publication.

## Acknowledgements

Known reuse visible in repository records is listed below. Members must verify attribution and add omitted external snippets/assets before submission. Dependencies retain their upstream licenses; exact versions/transitive packages are in `package.json` and the lockfile.

| Source                                                                                                                                                                                                                                                                  | Use                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec)                                                                                                                                                                                                                      | Spec schema, CLI and generated assistant integrations                                                       |
| [React](https://react.dev/), [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/)                                                                                                                                                                   | Browser implementation and build/type tools                                                                 |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/), [D1](https://developers.cloudflare.com/d1/)                                                                                                                                                           | Worker/storage/migration/deploy patterns and Wrangler                                                       |
| [Firebase Authentication](https://firebase.google.com/docs/auth), [Gmail](https://developers.google.com/gmail)                                                                                                                                                          | Password/proof authority and configured email transport                                                     |
| [openid-client](https://github.com/panva/openid-client)                                                                                                                                                                                                                 | Retained earlier OIDC adapter                                                                               |
| [Prism](https://prismjs.com/), [react-markdown](https://github.com/remarkjs/react-markdown), [remark-gfm](https://github.com/remarkjs/remark-gfm), [rehype-raw](https://github.com/rehypejs/rehype-raw), [rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) | Highlighting and formatted/sanitized instructions                                                           |
| [Vitest](https://vitest.dev/), [Testing Library](https://testing-library.com/), [jsdom](https://github.com/jsdom/jsdom), [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)                                                                                | Tests and code quality                                                                                      |
| [GitHub Pages](https://docs.github.com/en/pages), [Mermaid](https://mermaid.js.org/)                                                                                                                                                                                    | Product-site publishing and diagram notation                                                                |
| [NUS SoCLaaS](https://dochub.comp.nus.edu.sg/cf/guides/soclaas/)                                                                                                                                                                                                        | Required server-side model service                                                                          |
| Team-supplied SourceAcademy screenshot                                                                                                                                                                                                                                  | Recorded layout inspiration; no SourceAcademy code copying claimed                                          |
| Team MP3 contribution conventions                                                                                                                                                                                                                                       | Log organization inspiration; no MP3 app code copying claimed                                               |
| AI development assistants                                                                                                                                                                                                                                               | Planning, implementation, reviews and documentation, summarized in `logs/` and subject to team verification |

The UML views were prepared from repository source during this audit. No external screenshots or new image assets were added.
