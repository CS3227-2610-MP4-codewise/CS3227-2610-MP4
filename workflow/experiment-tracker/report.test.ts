// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';

const template = readFileSync(
  'workflow/experiment-tracker/report.html',
  'utf8',
);

function fixture() {
  return {
    generated: '2026-11-09T00:00:00Z',
    status: 'partial',
    increments: [
      { id: 'complete', comparison_group: 'clean', hypothesis: '' },
      { id: 'incomplete', comparison_group: 'gaps', hypothesis: '' },
    ],
    runs: [
      {
        id: 'good-run',
        increment_id: 'complete',
        root: 'good',
        state: 'stopped',
        partial: 0,
      },
      {
        id: 'bad-run',
        increment_id: 'incomplete',
        root: 'bad',
        state: 'paused',
        partial: 0,
      },
    ],
    members: [
      { run_id: 'good-run', session_id: 'good', parent: null },
      { run_id: 'bad-run', session_id: 'bad', parent: null },
      { run_id: 'bad-run', session_id: 'unadmitted-child', parent: 'bad' },
    ],
    sessions: [
      { id: 'good', parent: null },
      { id: 'bad', parent: null },
      { id: 'unadmitted-child', parent: 'bad' },
    ],
    admitted_turns: [
      {
        run_id: 'good-run',
        session_id: 'good',
        turn_id: 'good-turn',
        terminal: 'task_complete',
        partial: 0,
      },
      {
        run_id: 'bad-run',
        session_id: 'bad',
        turn_id: 'bad-turn',
        terminal: 'task_complete',
        partial: 0,
      },
    ],
    sources: [
      { session_id: 'good', warning: null, last_sync: '2026-11-09T00:00:00Z' },
      {
        session_id: 'bad',
        warning: 'Bad source warning',
        last_sync: '2026-11-09T00:00:00Z',
      },
    ],
    records: [
      {
        run_id: 'good-run',
        session_id: 'good',
        turn_id: 'good-turn',
        kind: 'usage',
        data: {
          model: 'synthetic',
          input_tokens: 80,
          cached_input_tokens: 20,
          output_tokens: 20,
          reasoning_output_tokens: 0,
          total_tokens: 100,
        },
      },
    ],
    windows: [],
    roles: [],
    annotations: [],
    blocked_intervals: [],
    coordination_checks: [],
    repeated_tool_candidates: {},
    legacy: { excluded_records: 0 },
    tracker_overhead: null,
    coverage: [
      '1 session(s) have no registered transcript; token coverage incomplete.',
      '1 completed admitted turn(s) have no usable token usage; totals cover observed records only.',
      'Source warnings: token coverage partial; totals represent observed records only.',
    ],
  };
}

function load(data = fixture()) {
  const html = template.replace(/\/\*DATA\*\/\s*null/, () =>
    JSON.stringify(data).replaceAll('<', '\\u003c'),
  );
  document.documentElement.innerHTML = html;
  const script = document.querySelector('script')?.textContent;
  if (!script) throw new Error('Missing dashboard script');
  // Execute the trusted local dashboard against synthetic metadata and real DOM controls.
  new Function(script)();
}

function select(id: string, value: string) {
  const control = document.getElementById(id) as HTMLSelectElement;
  control.value = value;
  control.dispatchEvent(new Event('change'));
}

function linkedSessions() {
  const card = [...document.querySelectorAll('.card')].find(
    (element) => element.firstElementChild?.textContent === 'Linked sessions',
  );
  return card?.querySelector('.value')?.textContent;
}

function coverageText() {
  return (
    [...document.querySelectorAll('section')].find(
      (element) =>
        element.querySelector('h2')?.textContent ===
        'Coverage and tracker overhead',
    )?.textContent ?? ''
  );
}

function selectedStatus() {
  return document.getElementById('generated')?.textContent ?? '';
}

afterEach(() => {
  document.documentElement.innerHTML = '';
});

it('includes linked children with no admitted turn, including their missing-source row', () => {
  load();
  expect(linkedSessions()).toBe('3');
  expect(coverageText()).toContain('unadmitted-child');
  expect(coverageText()).toContain('No registered transcript');
  select('run', 'bad-run');
  expect(linkedSessions()).toBe('2');
  select('session', 'unadmitted-child');
  expect(linkedSessions()).toBe('1');
  expect(coverageText()).toContain('unadmitted-child');
  expect(coverageText()).toContain('No registered transcript');
});

it.each([
  ['increment', 'complete'],
  ['group', 'clean'],
  ['run', 'good-run'],
  ['session', 'good'],
])('scopes coverage and status to the selected %s', (id, value) => {
  load();
  select(id, value);
  expect(linkedSessions()).toBe('1');
  expect(selectedStatus()).toContain('observed-complete');
  expect(coverageText()).not.toContain('no registered transcript');
  expect(coverageText()).not.toContain('no usable token usage');
  expect(coverageText()).not.toContain('Source warnings');
  expect(coverageText()).not.toContain('Bad source warning');
});

it('preserves scoped gaps for incomplete sessions and restores global gaps on reset', () => {
  load();
  select('session', 'bad');
  expect(linkedSessions()).toBe('1');
  expect(coverageText()).toContain('no usable token usage');
  expect(coverageText()).toContain('Bad source warning');
  expect(coverageText()).not.toContain('no registered transcript');
  select('session', 'good');
  expect(selectedStatus()).toContain('observed-complete');
  document.getElementById('reset')?.click();
  expect(linkedSessions()).toBe('3');
  expect(selectedStatus()).toContain('partial');
  expect(coverageText()).toContain('no registered transcript');
});

it('reports unavailable for conflicting filters without borrowing global gaps', () => {
  load();
  select('increment', 'complete');
  select('session', 'bad');
  expect(linkedSessions()).toBe('0');
  expect(selectedStatus()).toContain('unavailable');
  expect(coverageText()).not.toContain('no registered transcript');
  expect(coverageText()).not.toContain('no usable token usage');
});

it('keeps an attached source row for a linked child without an admitted turn', () => {
  const data = fixture();
  data.sources.push({
    session_id: 'unadmitted-child',
    warning: null,
    last_sync: '2026-11-09T00:00:00Z',
  });
  load(data);
  select('session', 'unadmitted-child');
  expect(linkedSessions()).toBe('1');
  expect(coverageText()).toContain('unadmitted-child');
  expect(coverageText()).toContain('No parser warning');
  expect(coverageText()).not.toContain('no registered transcript');
  expect(selectedStatus()).toContain('unavailable');
});

it('uses run membership when one session appears in multiple increments', () => {
  const data = fixture();
  data.sessions = [{ id: 'shared', parent: null }];
  data.members = data.members
    .filter((m) => m.session_id !== 'unadmitted-child')
    .map((m) => ({ ...m, session_id: 'shared' }));
  data.admitted_turns = data.admitted_turns.map((t) => ({
    ...t,
    session_id: 'shared',
  }));
  data.records = data.records.map((r) => ({ ...r, session_id: 'shared' }));
  data.sources = [
    { session_id: 'shared', warning: null, last_sync: '2026-11-09T00:00:00Z' },
  ];
  load(data);
  select('run', 'good-run');
  expect(linkedSessions()).toBe('1');
  expect(selectedStatus()).toContain('observed-complete');
  expect(coverageText()).not.toContain('no usable token usage');
  select('run', 'bad-run');
  expect(linkedSessions()).toBe('1');
  expect(selectedStatus()).toContain('partial');
  expect(coverageText()).toContain('no usable token usage');
});

it('keeps draining and provisional coverage scoped to sessions with pending turns', () => {
  const data = fixture();
  data.runs[0].state = 'draining-to-stop';
  Object.assign(data.admitted_turns[0], { terminal: null });
  load(data);
  select('session', 'good');
  expect(selectedStatus()).toContain('provisional');
  expect(coverageText()).toContain('Draining: pending turns');
  select('session', 'bad');
  expect(coverageText()).not.toContain('Draining: pending turns');
});

it('retains counter and fallback coverage only when that usage is selected', () => {
  const data = fixture();
  Object.assign(data.records[0].data, { input_tokens: null });
  data.records[0].kind = 'usage_fallback';
  load(data);
  select('session', 'good');
  expect(selectedStatus()).toContain('partial');
  expect(coverageText()).toContain('Usage counters unavailable: input_tokens');
  expect(coverageText()).toContain('Cumulative fallback');
  select('session', 'bad');
  expect(coverageText()).not.toContain('Usage counters unavailable');
  expect(coverageText()).not.toContain('Cumulative fallback');
});

it('does not apply another session partial flag to a complete session', () => {
  const data = fixture();
  data.runs[0].partial = 1;
  data.members.push({
    run_id: 'good-run',
    session_id: 'partial-child',
    parent: 'good',
  });
  data.sessions.push({ id: 'partial-child', parent: 'good' });
  data.sources.push({
    session_id: 'partial-child',
    warning: null,
    last_sync: '2026-11-09T00:00:00Z',
  });
  data.admitted_turns.push({
    run_id: 'good-run',
    session_id: 'partial-child',
    turn_id: 'partial-turn',
    terminal: '',
    partial: 1,
  });
  load(data);
  select('run', 'good-run');
  expect(selectedStatus()).toContain('partial');
  expect(coverageText()).toContain('Explicit partial finalization');
  select('session', 'good');
  expect(selectedStatus()).toContain('observed-complete');
  expect(coverageText()).not.toContain('Explicit partial finalization');
});
