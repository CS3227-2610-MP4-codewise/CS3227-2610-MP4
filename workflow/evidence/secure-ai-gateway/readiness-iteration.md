# Gateway bounds repair brief — 2026-11-12

Invocation: `$codewise-iterate-feature gateway-reported-bounds-01`: reject reported input/output component overruns before domain validation or success. AI-02/03/04/05, SAI-02/03. Analysis, test design, implementation and verification are performed by main; an independent read-only reviewer applies quality-review. No GUI change, so UI iteration is unnecessary.

Approval: Darryl's audit request explicitly permits automatic brief approval and waives human acceptance for this increment. This is not Keith's review or live-provider authorization.

Independent review found one directly related accounting defect: valid reported usage was discarded when generated content was malformed/truncated. The autoapproved bounded outcome also preserves validated numeric usage on internal transport failures and applies the same overage/unsafe-total accounting before failure settlement. Scope adds `transport.ts`/tests; no external interface, DTO or migration change. Real transport with a synthetic fetcher is covered in the D1 composition tests; transport-only regressions can run without D1. No raw provider content is attached to errors.

Confirmed source defect at base af1bc90fa47ed0b8726a46084ce642992c807e15: input reservation 30 and requested output cap 10 accept input=35/output=1 or input=1/output=11 because the combined total is below 40.

Bounded outcome: either component violation returns a safe failed outcome, never validates/caches the payload, and retains the existing conservative reservation. Combined overruns keep existing overage/debt handling. An unsafe combined integer retains uncertainty debt rather than attempting invalid accounting. Missing usage stays unavailable; exact boundaries remain accepted. No new quota/model assumptions, interface, migration, route, activation or reconciliation operation.

Acceptance checks: synthetic component-overrun cases, exact bounds, unsafe total, existing combined overage, and existing authorization/cache/retry/uncertainty suites. Inspect accounting rows to ensure no refund. Run npm run check and focused gateway/security tests; environment-blocked tests remain unverified. No human/native UI acceptance is required for this server-only repair under the explicit waiver. External staging and Keith consumer checks remain separate gates.
