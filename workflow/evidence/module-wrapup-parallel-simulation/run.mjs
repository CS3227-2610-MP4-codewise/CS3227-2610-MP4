import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Assumed durations, in model minutes. These are not MP4 measurements.
const assumedMinutes = {
  agreeContract: 6,
  serverImplementation: 18,
  uiImplementation: 14,
  designTests: 8,
  integrate: 8,
  executeTests: 4,
  review: 10,
  repairAndRecheck: 6,
};
function schedule(mode, coordination = 0) {
  const intervals = [];
  let cursor = 0;
  const append = (name, duration, start = cursor) => {
    const end = start + duration;
    intervals.push({ name, start, end, duration });
    cursor = Math.max(cursor, end);
  };
  append('agreeContract', assumedMinutes.agreeContract);
  if (mode === 'parallel') {
    append('extraCoordination', coordination);
    const start = cursor;
    for (const name of ['serverImplementation', 'uiImplementation', 'designTests']) {
      append(name, assumedMinutes[name], start);
    }
  } else {
    for (const name of ['serverImplementation', 'uiImplementation', 'designTests']) {
      append(name, assumedMinutes[name]);
    }
  }
  // Execution and review wait for integrated code. They are never overlapped.
  for (const name of ['integrate', 'executeTests', 'review', 'repairAndRecheck']) {
    append(name, assumedMinutes[name]);
  }
  return { mode, coordination, elapsedModelMinutes: cursor, intervals };
}
const sequential = schedule('sequential');
const parallel = schedule('parallel', 4);
const sensitivity = [0, 4, 10, 18, 22, 26].map((overhead) => {
  const run = schedule('parallel', overhead);
  return { extraCoordinationMinutes: overhead, elapsedModelMinutes: run.elapsedModelMinutes,
    reductionPercent: Number((100 * (sequential.elapsedModelMinutes - run.elapsedModelMinutes) / sequential.elapsedModelMinutes).toFixed(1)) };
});
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'Executed deterministic scheduling simulation using assumed durations; not recovered or measured MP4 results',
  assumptions: ['Same task durations, review and repair in both conditions',
    'Server, UI implementation and test design can start from an agreed interface',
    'Three independent implementation slots, no resource contention',
    'No interface churn or extra rework beyond the stated coordination allowance',
    'Integration, test execution, review and repair remain sequential'],
  assumedMinutes, sequential, parallel,
  elapsedReductionPercent: Number((100 * (74 - 56) / 74).toFixed(1)),
  speedupRatio: Number((74 / 56).toFixed(2)),
  breakEvenExtraCoordinationMinutes: 22,
  sensitivity,
  limitation: 'This model illustrates conditional elapsed-time savings. It does not measure agent productivity, monetary cost, token usage, quality or historical MP4 speedup.',
};
if (sequential.elapsedModelMinutes !== 74 || parallel.elapsedModelMinutes !== 56) throw new Error('Unexpected schedule');
if (sensitivity.find((row) => row.extraCoordinationMinutes === 22).reductionPercent !== 0) throw new Error('Unexpected break-even');
writeFileSync(fileURLToPath(new URL('./results.json', import.meta.url)), JSON.stringify(report, null, 2) + '\n');
console.log('SCHEDULING SIMULATION / ASSUMED MODEL MINUTES');
console.log(`Sequential: ${sequential.elapsedModelMinutes}; parallel with 4 extra coordination minutes: ${parallel.elapsedModelMinutes}`);
console.log(`Elapsed-time reduction: ${report.elapsedReductionPercent}%; speedup ratio: ${report.speedupRatio}x`);
console.log('Extra coordination break-even: 22 model minutes. No historical timings recovered.');
