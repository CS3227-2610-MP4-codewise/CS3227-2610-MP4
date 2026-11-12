import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Presentation prototype, run manually on synthetic fixtures.
// This is not installed as an agent-host hook or a product release gate.
const fingerprint = (source) => createHash('sha256').update(source).digest('hex');
const baseline = 'export const syntheticAnswer = 1;\n';
const changed = 'export const syntheticAnswer = 2;\n';
const completeLog = '# Synthetic prompt\n### Agents spawned\nNone\n### Token count\nUnavailable\n';
function checkCloseout({ log, source, verification }) {
  const reasons = [];
  for (const heading of ['### Agents spawned', '### Token count']) {
    if (!log.split(/\r?\n/).includes(heading)) reasons.push(`Missing ${heading}`);
  }
  if (verification.exitCode !== 0) reasons.push('Verification did not pass');
  if (verification.sourceSha256 !== fingerprint(source)) {
    reasons.push('Source changed after verification');
  }
  return { decision: reasons.length ? 'BLOCK' : 'ALLOW', reasons };
}
const verification = { exitCode: 0, sourceSha256: fingerprint(baseline) };
const cases = [
  { id: 'A', scenario: 'Missing token section', expected: 'BLOCK',
    input: { log: '# Synthetic prompt\n### Agents spawned\nNone\n', source: baseline, verification } },
  { id: 'B', scenario: 'Source edited after passing check', expected: 'BLOCK',
    input: { log: completeLog, source: changed, verification } },
  { id: 'C', scenario: 'Required sections and matching source', expected: 'ALLOW',
    input: { log: completeLog, source: baseline, verification } },
  { id: 'D', scenario: 'False narrative added to complete log', expected: 'ALLOW',
    input: { log: `${completeLog}\nAn independent reviewer approved this.\n`, source: baseline, verification } },
];
const results = cases.map(({ input, ...item }) => ({ ...item, ...checkCloseout(input) }));
const report = {
  runAt: new Date().toISOString(),
  scope: 'Actual manual execution of a deterministic prototype on synthetic fixtures',
  integration: 'No lifecycle hook installed. No product code or historical MP4 run evaluated.',
  results,
  limitation: 'Case D passes deliberately: format and freshness checks cannot establish narrative truth. Verification metadata is fixture input, not authenticated tool telemetry.',
};
writeFileSync(fileURLToPath(new URL('./results.json', import.meta.url)), JSON.stringify(report, null, 2) + '\n');
console.log('CLOSEOUT CHECKER PROTOTYPE / SYNTHETIC FIXTURES');
for (const row of results) console.log(`${row.id}  ${row.decision.padEnd(5)}  ${row.scenario}`);
console.log('D exposes a limit: narrative truth still needs source reconciliation.');
if (results.some((row) => row.expected !== row.decision)) process.exitCode = 1;
