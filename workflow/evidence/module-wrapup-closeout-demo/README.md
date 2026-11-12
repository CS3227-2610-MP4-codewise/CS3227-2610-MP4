# Closeout checker presentation prototype

Created during presentation preparation on 2026-11-10, after the recorded MP4 incidents. Run `node workflow/evidence/module-wrapup-closeout-demo/run.mjs` from the repository root. It writes `results.json` next to the script.

This is a manually executed deterministic demonstration on synthetic fixtures. It checks two required log headings, a successful verification status and a matching SHA-256 source fingerprint. It is not an installed lifecycle hook, a historical mid-project intervention, a product test or a measured productivity comparison. A future hook or explicit closeout command could invoke this kind of check after its actual host interface is verified.

Cases A and B demonstrate detecting missing structure and stale verification. Case C demonstrates the passing path. Case D deliberately passes a false narrative because this mechanical checker cannot determine its truth. Fixture verification metadata is not independently authenticated execution evidence. A production version would need trusted capture of command results, the full relevant source set and prompt/turn attribution.

The historical motivation is in logs/darryl/07-prompt-workflow-audit.md and logs/darryl/17-instructor-authoring-ux.md (IUX-07/08). Lecture 5 slides 24 and 30 and Lecture 10 slide 12 connect lifecycle checks and executable harness rules. The demonstration supports only the stated fixture-level detection claims. No time, token or quality improvement is measured.
