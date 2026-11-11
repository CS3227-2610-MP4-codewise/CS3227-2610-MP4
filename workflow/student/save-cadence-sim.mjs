/**
 * Deterministic synthetic editing session for task 1.4 (SW-03/04, OPS-01). No randomness, no
 * network, no real learner data. Counts saves for a debounce / max-interval cadence.
 */

/** Synthetic session: bursts of typing separated by pauses, with navigation flushes. */
export function syntheticSession({
  minutes = 60,
  burstMs = 45_000,
  keyEveryMs = 400,
  pauseMs = 30_000,
  navigateEveryMs = 5 * 60_000,
  blurAtMs = [20 * 60_000, 40 * 60_000],
} = {}) {
  const end = minutes * 60_000;
  const events = [];
  for (let start = 0; start < end; start += burstMs + pauseMs)
    for (let t = start; t < Math.min(start + burstMs, end); t += keyEveryMs)
      events.push({ at: t, type: 'key' });
  for (let t = navigateEveryMs; t < end; t += navigateEveryMs)
    events.push({ at: t, type: 'flush' }); // Previous/Next/Review
  for (const t of blurAtMs) events.push({ at: t, type: 'flush' }); // blur
  events.push({ at: end, type: 'flush' }); // before submit
  events.sort((a, b) => a.at - b.at || (a.type === 'key' ? -1 : 1));
  return { end, events };
}

/** Number of save requests for the cadence (debounce after last edit, max interval since first unsaved edit). */
export function countSaves(session, debounceMs, maxMs) {
  let saves = 0;
  let dirtySince = null;
  let lastEdit = null;
  const due = () =>
    dirtySince === null
      ? Infinity
      : Math.min(lastEdit + debounceMs, dirtySince + maxMs);
  for (const event of session.events) {
    while (due() <= event.at) {
      saves++;
      const at = due();
      // Edits after this save restart the dirty window; none occurred before the event.
      dirtySince = null;
      lastEdit = null;
      void at;
    }
    if (event.type === 'key') {
      dirtySince ??= event.at;
      lastEdit = event.at;
    } else if (dirtySince !== null) {
      saves++;
      dirtySince = null;
      lastEdit = null;
    }
  }
  return saves;
}
