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

function load(data: object = fixture()) {
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

function toolFixture() {
  const data = fixture();
  const calls = (run_id: string, session_id: string, names: string[]) =>
    names.map((name, index) => ({
      run_id,
      session_id,
      turn_id: `${session_id}-turn`,
      kind: 'tool',
      data: { name, call_id: `${session_id}-call-${index}` },
    }));
  return {
    ...data,
    records: [
      ...data.records,
      ...calls('good-run', 'good', ['Shell', 'Shell', 'SharedOnce']),
      ...calls('bad-run', 'bad', [
        'Shell',
        'Shell',
        'Shell',
        'Other',
        'Other',
        'SharedOnce',
      ]),
    ],
    repeated_tool_candidates: { Shell: 5, Other: 2, SharedOnce: 2 },
  };
}

function repeatedTools() {
  const section = [...document.querySelectorAll('details')].find((element) =>
    element
      .querySelector('summary')
      ?.textContent?.startsWith('Repeated tool-name candidates'),
  );
  return {
    summary: section?.querySelector('summary')?.textContent,
    candidates: JSON.parse(
      section?.querySelector('pre')?.textContent ?? 'null',
    ),
  };
}

it.each([
  ['increment', 'complete'],
  ['group', 'clean'],
  ['run', 'good-run'],
  ['session', 'good'],
])('recomputes repeated tool counts for the selected %s', (id, value) => {
  load(toolFixture());
  expect(repeatedTools().candidates).toEqual({
    Shell: 5,
    Other: 2,
    SharedOnce: 2,
  });
  select(id, value);
  expect(repeatedTools().summary).toContain('3 observed calls');
  expect(repeatedTools().candidates).toEqual({ Shell: 2 });
});

it('clears candidates for empty selections and restores counts on reset', () => {
  load(toolFixture());
  select('increment', 'complete');
  select('session', 'bad');
  expect(repeatedTools().summary).toContain('0 observed calls');
  expect(repeatedTools().candidates).toEqual({});
  document.getElementById('reset')?.click();
  expect(repeatedTools().summary).toContain('9 observed calls');
  expect(repeatedTools().candidates).toEqual({
    Shell: 5,
    Other: 2,
    SharedOnce: 2,
  });
});

function annotationFixture() {
  const data = fixture();
  return {
    ...data,
    annotations: [
      {
        increment_id: 'complete',
        session_id: 'good',
        ts: data.generated,
        kind: 'context',
        agent: 'main',
        task: 'editor',
        data: { summary: 'Clean context' },
      },
      {
        increment_id: 'incomplete',
        session_id: 'bad',
        ts: data.generated,
        kind: 'decision',
        agent: 'main',
        task: 'review',
        data: { summary: 'Unrelated decision' },
      },
      {
        increment_id: 'complete',
        session_id: null,
        ts: data.generated,
        kind: 'decision',
        agent: 'main',
        task: null,
        data: { summary: 'Increment decision' },
      },
    ],
  };
}

function annotationText() {
  return (
    [...document.querySelectorAll('section')].find(
      (element) =>
        element.querySelector('h2')?.textContent ===
        'Decisions, context, reviews and handoffs — annotated',
    )?.textContent ?? ''
  );
}

it('scopes run-only annotations to the run increment and restores all annotations on reset', () => {
  load(annotationFixture());
  expect(annotationText()).toContain('Unrelated decision');
  select('run', 'good-run');
  expect(annotationText()).toContain('Clean context');
  expect(annotationText()).toContain('Increment decision');
  expect(annotationText()).not.toContain('Unrelated decision');
  select('run', 'bad-run');
  expect(annotationText()).toContain('Unrelated decision');
  expect(annotationText()).not.toContain('Clean context');
  expect(annotationText()).not.toContain('Increment decision');
  document.getElementById('reset')?.click();
  expect(annotationText()).toContain('Clean context');
  expect(annotationText()).toContain('Unrelated decision');
});

it.each([
  ['increment', 'incomplete'],
  ['group', 'gaps'],
  ['session', 'bad'],
])(
  'shows no annotations for a selected run conflicting with %s',
  (id, value) => {
    const data = annotationFixture();
    // Shared-session annotations still must not cross a conflicting run boundary.
    data.annotations.push({
      ...data.annotations[0],
      increment_id: 'incomplete',
      data: { summary: 'Conflicting shared-session annotation' },
    });
    load(data);
    select('run', 'good-run');
    select(id, value);
    expect(linkedSessions()).toBe('0');
    expect(annotationText()).not.toContain('Clean context');
    expect(annotationText()).not.toContain('Increment decision');
    expect(annotationText()).not.toContain('Unrelated decision');
    expect(annotationText()).not.toContain(
      'Conflicting shared-session annotation',
    );
  },
);

it('retains session filtering within the selected run increment', () => {
  const data = annotationFixture();
  data.annotations.push({
    ...data.annotations[0],
    increment_id: 'incomplete',
    data: { summary: 'Other increment with same session' },
  });
  load(data);
  select('run', 'good-run');
  select('session', 'good');
  expect(annotationText()).toContain('Clean context');
  expect(annotationText()).not.toContain('Increment decision');
  expect(annotationText()).not.toContain('Other increment with same session');
});
