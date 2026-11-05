import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  pending?: boolean;
};

/** Presentation only. The caller owns authorization and acknowledged state. */
export function Action({
  variant = 'primary',
  pending = false,
  disabled,
  type = 'button',
  className = '',
  children,
  ...props
}: ActionProps) {
  return (
    <button
      {...props}
      type={type}
      className={`cw-action cw-action--${variant} ${className}`.trim()}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {children}
    </button>
  );
}

export function StatusMessage({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'error';
}) {
  return (
    <p className={`cw-status cw-status--${tone}`} role="status">
      {children}
    </p>
  );
}

type QuestionNavigationProps = {
  /** Zero-based position in the pinned published order. */
  index: number;
  count: number;
  onPrevious: () => void;
  /** Consumer opens review at the end; this control never submits a form. */
  onNext: () => void;
  pending?: boolean;
  finalLabel?: 'Review assignment' | 'Attempt summary';
};

export function QuestionNavigation({
  index,
  count,
  onPrevious,
  onNext,
  pending = false,
  finalLabel = 'Review assignment',
}: QuestionNavigationProps) {
  if (
    !Number.isInteger(index) ||
    !Number.isInteger(count) ||
    count < 1 ||
    index < 0 ||
    index >= count
  )
    throw new RangeError(
      'Question navigation requires a valid published position.',
    );
  return (
    <nav className="cw-question-navigation" aria-label="Question navigation">
      <Action
        variant="secondary"
        disabled={index === 0 || pending}
        onClick={onPrevious}
      >
        Previous question
      </Action>
      <p
        className="cw-navigation-position"
        aria-live="polite"
        aria-atomic="true"
      >
        Question {index + 1} of {count}
        {index === 0 && <span className="cw-sr-only">. First question.</span>}
      </p>
      <Action disabled={pending} onClick={onNext}>
        {index === count - 1 ? finalLabel : 'Next question'}
      </Action>
    </nav>
  );
}
