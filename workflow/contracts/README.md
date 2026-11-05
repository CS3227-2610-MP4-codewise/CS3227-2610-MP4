# Running and reusing the instructor contract suites

This package verifies candidate contracts and synthetic adapters. K1–K6 agreement and real identity/submission/release/provider integration remain pending.

From this worktree:

    npm.cmd run check
    npx.cmd vitest run src/shared/instructor-contracts/contracts.test.ts

The focused file registers 82 contract cases using the exports in instructor-contracts.ts. The full check additionally runs the existing six application and four Node workflow tests.

Valid payloads are named by fixtureGraph in ../fixtures/instructor-contracts/graph.ts; invalidExamples() exports one exact invalid payload per boundary and expected safe error code. Other mutation/race cases live in the reusable suites and focused test file. All accounts, source, grades and provider outputs are synthetic.

Reusable suite registration:

- identityContractSuite(name, factory): factory supplies authorized/missing/foreign-course/revoked/bad-origin scenarios and a revocation control.
- publicationContractSuite(name, factory): supplies richer private record, producer projection and independently specified expected public record.
- submissionContractSuite(name, factory): supplies the canonical fixture publication and immutable attempt; the consumer validates coverage, joins and hashes.
- releaseContractSuite(name, factory): supplies released content, currentness, tombstone and public projection.
- releaseProtocolContractSuite(name, factory): supplies replaceable release/withdraw/currentness methods and tests replay/conflict/current-versus-historical withdrawal.
- gatewayContractSuite(name, factory): supplies request, payload, pinned publication and attempt; the synthetic driver exercises injected auth/config/admission/request-record/clock/transport/validator seams. It is not a live gateway implementation.

For a real reviewed producer, arrange synthetic fixture seeding/loading in the factory's test setup (beforeAll can await the producer), then provide detached expected snapshots/ports to these same registrations. Record producer/consumer commit SHAs, contract/policy version and actual checks. Keep additional producer transaction/concurrency/session/provider tests in its owning feature change; passing the snapshot suites alone does not prove those guarantees.

Do not wire workflow fixture factories into src/server/index.ts or introduce a deployed fallback. Constructors receive server-side ports; parsed user/role DTOs never authorize. No production credentials, learner submissions, network provider calls or submitted-code execution are needed for these suites.

The single review packet is [K1–K6](../IntegrationContracts.md#keith-review-packet--pending-agreement). Actual results and limitations: [verification](../evidence/instructor-development-contracts/verification.md).
