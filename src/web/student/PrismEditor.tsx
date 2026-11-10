import {
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { highlightPython } from '../instructor/assignments/python-highlight';

export type CodeEditorHandle = { focus: () => void };
export type CodeEditorProps = {
  id: string;
  /** Accessible name of the text box, for example "Answer for question 1: Sum (Python)". */
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  /** Id of an element describing the editor (keyboard hint, save state). */
  describedBy?: string;
  handle?: Ref<CodeEditorHandle>;
};

const INDENT = '    ';

/**
 * Variant B editor: a native `<textarea>` that owns the caret, selection, IME composition,
 * undo and the accessible name, with an `aria-hidden` Prism layer and line-number gutter
 * painted behind it. The layers never receive input; all three share one font, line height,
 * padding and `white-space: pre` (no soft wrapping, so a logical line is one visual line and
 * the gutter cannot drift). The textarea scrolls; the other layers follow its scroll offsets.
 */
export function PrismEditor({
  id,
  label,
  value,
  onChange,
  onBlur,
  readOnly = false,
  describedBy,
  handle,
}: CodeEditorProps) {
  const input = useRef<HTMLTextAreaElement>(null);
  const layer = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const exit = useRef<HTMLSpanElement>(null);
  const selection = useRef<[number, number] | null>(null);
  useImperativeHandle(handle, () => ({ focus: () => input.current?.focus() }));

  const html = useMemo(() => highlightPython(value + '\n'), [value]);
  const lines = useMemo(() => {
    const count = value.split('\n').length;
    let text = '';
    for (let i = 1; i <= count; i++) text += (i > 1 ? '\n' : '') + i;
    return text;
  }, [value]);

  const sync = () => {
    const ta = input.current;
    if (!ta) return;
    if (layer.current) {
      layer.current.scrollTop = ta.scrollTop;
      layer.current.scrollLeft = ta.scrollLeft;
    }
    if (gutter.current) gutter.current.scrollTop = ta.scrollTop;
  };
  useLayoutEffect(() => {
    // A programmatic edit (Tab indent fallback) restores the caret after React re-renders.
    const ta = input.current;
    if (ta && selection.current) {
      ta.setSelectionRange(selection.current[0], selection.current[1]);
      selection.current = null;
    }
    sync();
  }, [value]);

  /** Replaces [start,end) keeping native undo where `execCommand` exists; falls back to state. */
  const replace = (
    ta: HTMLTextAreaElement,
    start: number,
    end: number,
    text: string,
    nextStart: number,
    nextEnd: number,
  ) => {
    ta.setSelectionRange(start, end);
    let done = false;
    try {
      done =
        typeof document.execCommand === 'function' &&
        document.execCommand('insertText', false, text);
    } catch {
      done = false;
    }
    if (done) ta.setSelectionRange(nextStart, nextEnd);
    else {
      selection.current = [nextStart, nextEnd];
      onChange(ta.value.slice(0, start) + text + ta.value.slice(end));
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Never act while an IME composition is open: Esc/Tab there belong to the IME.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape') {
      // Esc leaves the editor so Tab is never trapped; focus lands after the textarea.
      event.preventDefault();
      exit.current?.focus();
      return;
    }
    if (
      event.key !== 'Tab' ||
      readOnly ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey
    )
      return;
    event.preventDefault();
    const ta = event.currentTarget;
    const { selectionStart: s, selectionEnd: e, value: v } = ta;
    const multi = v.slice(s, e).includes('\n');
    if (!event.shiftKey && !multi) {
      replace(ta, s, e, INDENT, s + INDENT.length, s + INDENT.length);
      return;
    }
    const from = v.lastIndexOf('\n', s - 1) + 1;
    const nl = v.indexOf('\n', e);
    const to = nl === -1 ? v.length : nl;
    const block = v.slice(from, to).split('\n');
    const out = block.map((line) =>
      event.shiftKey
        ? line.replace(/^ {1,4}/, '')
        : line.length
          ? INDENT + line
          : line,
    );
    const text = out.join('\n');
    replace(ta, from, to, text, from, from + text.length);
  };

  return (
    <div className="cw-editor" data-readonly={readOnly || undefined}>
      <div className="cw-editor-frame">
        <div className="cw-editor-gutter" aria-hidden="true" ref={gutter}>
          {lines}
        </div>
        <div className="cw-editor-surface">
          <pre className="cw-editor-layer" aria-hidden="true" ref={layer}>
            <code dangerouslySetInnerHTML={{ __html: html }} />
          </pre>
          <textarea
            ref={input}
            id={id}
            className="cw-editor-input"
            aria-label={label}
            aria-describedby={describedBy}
            aria-readonly={readOnly || undefined}
            value={value}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            onScroll={sync}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
      {/* Esc target: focus lands after the textarea, so the next Tab leaves the editor. */}
      <span className="cw-editor-exit" tabIndex={-1} ref={exit}>
        Left the code editor. Press Tab to continue.
      </span>
    </div>
  );
}
