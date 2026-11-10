import { useId, useMemo, useRef, useState } from 'react';
import { Action } from '../ui/primitives';
import { diffLines, type DiffRow, type ServerDraft } from './work-model';

const KIND_TEXT: Record<DiffRow['kind'], { mark: string; text: string }> = {
  same: { mark: '', text: 'Same line' },
  changed: { mark: '≠', text: 'Changed line' },
  'mine-only': { mark: '+', text: 'Only in my version' },
  'saved-only': { mark: '−', text: 'Only in saved version' },
};

/**
 * SW-04: side-by-side, read-only local and saved copies with a line diff. Differences carry a
 * marker symbol and spoken text as well as a rule, never colour alone. Each action that would
 * discard a copy first offers to copy that copy (with a visible fallback if the clipboard is
 * denied). Both copies are labelled; nothing here edits either of them.
 */
export function ConflictWindow({
  mine,
  saved,
  recovered,
  onKeepMine,
  onUseSaved,
  pending = false,
  title,
}: {
  mine: string;
  saved: ServerDraft;
  recovered: boolean;
  onKeepMine: () => void;
  onUseSaved: () => void;
  pending?: boolean;
  title: string;
}) {
  const rows = useMemo(() => diffLines(mine, saved.source), [mine, saved]);
  const differing = rows.filter((r) => r.kind !== 'same').length;
  const [confirm, setConfirm] = useState<'keep' | 'use' | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'denied'>(
    'idle',
  );
  const fallback = useRef<HTMLTextAreaElement>(null);
  const headingId = useId();
  // The copy offered is the version the chosen action discards.
  const discarded = confirm === 'keep' ? 'saved' : 'mine';
  const discardedText = discarded === 'saved' ? saved.source : mine;
  const discardedName = discarded === 'saved' ? 'saved version' : 'my version';

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('unavailable');
      await navigator.clipboard.writeText(discardedText);
      setCopyState('copied');
    } catch {
      setCopyState('denied');
      // Visible fallback: select the text so Ctrl/Cmd+C works.
      setTimeout(() => fallback.current?.select(), 0);
    }
  };
  const choose = (which: 'keep' | 'use') => {
    setConfirm(which);
    setCopyState('idle');
  };

  return (
    <section className="cw-wb-conflict" aria-labelledby={headingId}>
      <h3 id={headingId} tabIndex={-1}>
        {title}
      </h3>
      <p>
        {recovered
          ? 'This tab was reloaded with text that was never saved. '
          : 'Your text and the saved version differ. '}
        {differing
          ? `${differing} line${differing === 1 ? '' : 's'} differ. `
          : 'The lines are identical. '}
        Both copies are read-only here. Nothing is replaced until you choose.
      </p>
      <div
        className="cw-wb-diff-scroll"
        tabIndex={0}
        role="region"
        aria-label="Line differences, scrollable"
      >
        <table className="cw-wb-diff">
          <caption className="cw-sr-only">
            Line differences between my version and the saved version
          </caption>
          <thead>
            <tr>
              <th scope="col">My version (this tab)</th>
              <th scope="col">Saved version (revision {saved.revision})</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} data-kind={row.kind}>
                {(['mine', 'saved'] as const).map((side) => {
                  const cell = row[side];
                  const marks =
                    row.kind === 'same' ||
                    (row.kind === 'mine-only' && side === 'saved') ||
                    (row.kind === 'saved-only' && side === 'mine')
                      ? null
                      : KIND_TEXT[row.kind];
                  return (
                    <td key={side} data-empty={!cell || undefined}>
                      {cell ? (
                        <>
                          <span className="cw-wb-ln">{cell.n}</span>
                          <span className="cw-wb-mark" aria-hidden="true">
                            {marks?.mark}
                          </span>
                          {marks && (
                            <span className="cw-sr-only">{marks.text}: </span>
                          )}
                          <code>{cell.text || ' '}</code>
                        </>
                      ) : (
                        <span className="cw-sr-only">No line</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="cw-wb-legend">
        Markers: ≠ changed line, + only in my version, − only in saved version.
      </p>
      {confirm === null ? (
        <div className="cw-wb-actions">
          <Action onClick={() => choose('keep')} disabled={pending}>
            Keep my version
          </Action>
          <Action
            variant="secondary"
            onClick={() => choose('use')}
            disabled={pending}
          >
            Use saved version
          </Action>
        </div>
      ) : (
        <div className="cw-wb-confirm" role="group" aria-label="Confirm choice">
          <p>
            {confirm === 'keep'
              ? `Keep my version saves it as a new revision on top of revision ${saved.revision}. The saved version will be replaced.`
              : 'Use saved version replaces the text in this tab. My version will be discarded.'}{' '}
            Copy the {discardedName} first if you want to keep it.
          </p>
          <div className="cw-wb-actions">
            <Action variant="secondary" onClick={copy}>
              Copy other version
            </Action>
            <Action
              pending={pending}
              onClick={confirm === 'keep' ? onKeepMine : onUseSaved}
            >
              {confirm === 'keep'
                ? 'Keep mine and discard saved'
                : 'Use saved and discard mine'}
            </Action>
            <Action
              variant="secondary"
              onClick={() => setConfirm(null)}
              disabled={pending}
            >
              Back
            </Action>
          </div>
          {copyState === 'copied' && (
            <p role="status">Copied the {discardedName} to the clipboard.</p>
          )}
          {copyState === 'denied' && (
            <div role="alert" className="cw-wb-fallback">
              <p>
                The clipboard is not available. The {discardedName} is selected
                below; copy it manually (Ctrl or Cmd + C) before you continue.
              </p>
              <textarea
                ref={fallback}
                readOnly
                aria-label={`The ${discardedName}, for manual copying`}
                value={discardedText}
                rows={6}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
