import type { ReactNode } from 'react';
export type IconName =
  | 'book'
  | 'mail'
  | 'lock'
  | 'eye'
  | 'eye-off'
  | 'plus'
  | 'arrow-left'
  | 'arrow-right'
  | 'save'
  | 'publish'
  | 'refresh'
  | 'logout'
  | 'check'
  | 'edit'
  | 'trash';
const paths: Record<IconName, ReactNode> = {
  book: (
    <>
      <path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z" />
      <path d="M12 6v14M6 9l-1 2 1 2m12-4 1 2-1 2" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="m3 3 18 18M10 5a12 12 0 0 1 12 7 18 18 0 0 1-4 4M6 6a18 18 0 0 0-4 6s4 7 10 7a11 11 0 0 0 5-1" />
      <path d="M10 10a3 3 0 0 0 4 4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  'arrow-left': <path d="m12 5-7 7 7 7M5 12h15" />,
  'arrow-right': <path d="m12 5 7 7-7 7M19 12H4" />,
  save: (
    <>
      <path d="M5 3h12l4 4v14H3V3h2Z" />
      <path d="M7 3v6h10V3M7 21v-8h10v8" />
    </>
  ),
  publish: (
    <>
      <path d="m7 8 5-5 5 5M12 3v13M4 15v6h16v-6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6 6a8 8 0 0 1 13 3M18 18a8 8 0 0 1-13-3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H4v16h5m6-12 4 4-4 4m-7-4h11" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  edit: (
    <>
      <path d="m16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" />
    </>
  ),
};
export function Icon({
  name,
  className = '',
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={'cw-icon ' + className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
export function Brand({ href = '/' }: { href?: string }) {
  return (
    <a className="cw-wordmark cw-brand" href={href} aria-label="Codewise home">
      <Icon name="book" />
      <span className="cw-brand-name">
        codewise<span>.</span>
      </span>
    </a>
  );
}
