import {
  Component,
  lazy,
  Suspense,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Format =
  | 'heading'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'quote'
  | 'code'
  | 'link'
  | 'bullets'
  | 'numbered'
  | 'checklist';
const buttons: Array<{ type: Format; label: string; text: string }> = [
  { type: 'heading', label: 'Heading', text: 'H' },
  { type: 'bold', label: 'Bold', text: 'B' },
  { type: 'italic', label: 'Italic', text: 'I' },
  { type: 'underline', label: 'Underline', text: 'U' },
  { type: 'strike', label: 'Strikethrough', text: 'S' },
  { type: 'quote', label: 'Quote', text: '❞' },
  { type: 'code', label: 'Code', text: '</>' },
  { type: 'link', label: 'Link', text: '↗' },
  { type: 'bullets', label: 'Bulleted list', text: '•≡' },
  { type: 'numbered', label: 'Numbered list', text: '1≡' },
  { type: 'checklist', label: 'Checklist', text: '☑' },
];
const InstructionPreview = lazy(() => import('./InstructionPreview'));
class PreviewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">
        Preview unavailable. Your text is retained; return to Write to keep
        editing.
      </p>
    ) : (
      this.props.children
    );
  }
}

/** Produces Markdown source; plain legacy strings are never rewritten on load. */
export function formatInstruction(
  value: string,
  start: number,
  end: number,
  format: Format,
  href = 'url',
) {
  const selected = value.slice(start, end);
  const wrappers: Partial<Record<Format, [string, string]>> = {
    bold: ['**', '**'],
    italic: ['*', '*'],
    underline: ['<u>', '</u>'],
    strike: ['~~', '~~'],
    code:
      selected.includes('\n') || selected === ''
        ? ['```\n', selected.endsWith('\n') ? '```' : '\n```']
        : ['`', '`'],
    link: ['[', `](${href})`],
  };
  const wrapper = wrappers[format];
  const block = !wrapper;
  const rangeStart = block
    ? start === 0
      ? 0
      : value.lastIndexOf('\n', start - 1) + 1
    : start;
  const followingNewline = block ? value.indexOf('\n', end) : -1;
  const rangeEnd = block
    ? followingNewline === -1
      ? value.length
      : followingNewline
    : end;
  const blockText = value.slice(rangeStart, rangeEnd);
  const insertion = wrapper
    ? wrapper[0] + selected + wrapper[1]
    : blockText
        .split('\n')
        .map(
          (line, index) =>
            (format === 'heading'
              ? '## '
              : format === 'quote'
                ? '> '
                : format === 'numbered'
                  ? `${index + 1}. `
                  : format === 'checklist'
                    ? '- [ ] '
                    : '- ') + line,
        )
        .join('\n');
  const next = value.slice(0, rangeStart) + insertion + value.slice(rangeEnd);
  return {
    value: next,
    start:
      rangeStart +
      (wrapper?.[0].length ??
        (format === 'checklist'
          ? 6
          : format === 'numbered'
            ? 3
            : format === 'heading'
              ? 3
              : 2)),
    end: rangeStart + insertion.length - (wrapper?.[1].length ?? 0),
  };
}

export function InstructionEditor({
  value,
  readOnly,
  onChange,
}: {
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  const input = useRef<HTMLTextAreaElement>(null);
  const inputId = useId();
  function apply(type: Format) {
    const editor = input.current;
    if (!editor || readOnly) return;
    const result = formatInstruction(
      value,
      editor.selectionStart,
      editor.selectionEnd,
      type,
    );
    if (new TextEncoder().encode(result.value).length > 16384) {
      setMessage('Instructions are at the maximum length.');
      return;
    }
    setMessage(
      `${buttons.find((button) => button.type === type)?.label ?? 'Formatting'} applied. Use Preview to see it styled.`,
    );
    onChange(result.value);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(result.start, result.end);
    });
  }
  return (
    <div className="ia-field ia-instruction-editor">
      <label htmlFor={inputId}>Instructions for students</label>
      <div
        className="ia-instruction-tabs"
        role="group"
        aria-label="Instruction editor view"
      >
        <button
          type="button"
          aria-pressed={!preview}
          onClick={() => setPreview(false)}
        >
          Write
        </button>
        <button
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview(true)}
        >
          Preview
        </button>
      </div>
      {!preview && (
        <div
          className="ia-instruction-toolbar"
          role="group"
          aria-label="Instruction formatting"
        >
          {buttons.map((button) => (
            <button
              type="button"
              key={button.type}
              className={`ia-format-${button.type}`}
              aria-label={button.label}
              title={button.label}
              disabled={readOnly}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => apply(button.type)}
            >
              {button.type === 'link' ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
                  <path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" />
                </svg>
              ) : (
                button.text
              )}
            </button>
          ))}
        </div>
      )}
      {preview ? (
        <div
          className="ia-instruction-preview"
          aria-label="Formatted instruction preview"
        >
          <PreviewBoundary>
            <Suspense fallback={<p role="status">Loading preview…</p>}>
              <InstructionPreview value={value} />
            </Suspense>
          </PreviewBoundary>
        </div>
      ) : (
        <textarea
          ref={input}
          id={inputId}
          rows={6}
          maxLength={16384}
          readOnly={readOnly}
          value={value}
          placeholder="Describe the task and what students should produce."
          onChange={(event) => {
            setMessage('');
            onChange(event.target.value);
          }}
        />
      )}
      <p className="ia-hint">
        Use Preview to check headings, lists and code examples before
        publishing.
      </p>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
