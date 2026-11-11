import { BoundaryError } from '../../shared/instructor-contracts/schema';
export type InvitationPreview =
  | {
      courseName: string;
      role: 'student' | 'instructor';
      roles: ('student' | 'instructor')[];
      registered: boolean;
      recovery: boolean;
      session: 'none' | 'matching' | 'other';
    }
  | { legacy: true; session: 'none' | 'other' };
export function joinedWorkspaceMessage(role: 'student' | 'instructor') {
  return role === 'student'
    ? 'You can now open your Student workspace.'
    : 'You can now open your Instructor workspace.';
}
export function parseInvitationPreview(value: unknown): InvitationPreview {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BoundaryError('INVALID_CONTRACT');
  const v = value as Record<string, unknown>;
  if (v.legacy === true) {
    if (v.session !== 'none' && v.session !== 'other')
      throw new BoundaryError('INVALID_CONTRACT');
    return { legacy: true, session: v.session };
  }
  if (
    typeof v.courseName !== 'string' ||
    v.courseName.length < 1 ||
    v.courseName.length > 120 ||
    (v.role !== 'student' && v.role !== 'instructor') ||
    typeof v.registered !== 'boolean' ||
    (v.recovery !== undefined && typeof v.recovery !== 'boolean') ||
    (v.roles !== undefined &&
      (!Array.isArray(v.roles) ||
        v.roles.length < 1 ||
        v.roles.length > 2 ||
        v.roles.some((r: unknown) => r !== 'student' && r !== 'instructor'))) ||
    !['none', 'matching', 'other'].includes(v.session as string)
  )
    throw new BoundaryError('INVALID_CONTRACT');
  return {
    courseName: v.courseName,
    role: v.role,
    roles: (v.roles ?? [v.role]) as ('student' | 'instructor')[],
    registered: v.registered,
    recovery: v.recovery === true,
    session: v.session as 'none' | 'matching' | 'other',
  };
}
export async function authRequest(
  path: string,
  csrf?: string,
  input?: unknown,
): Promise<unknown> {
  const response = await fetch('/api/auth/' + path, {
    method: input === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers:
      input === undefined
        ? {}
        : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf ?? '' },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  if (!response.ok) {
    if (response.status === 401) throw new BoundaryError('UNAUTHENTICATED');
    if (response.status === 403) throw new BoundaryError('FORBIDDEN');
    if (response.status === 429) throw new BoundaryError('RATE_LIMITED');
    if (response.status === 400) throw new BoundaryError('INVALID_CONTRACT');
    throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  }
  return response.json();
}
/** Take a capability out of URL/history before any network request. Never persist it. */
export function takeInvitation(
  location: { hash: string; pathname: string; search: string },
  replace: (url: string) => void,
) {
  if (location.pathname !== '/sign-in') return null;
  const fragment = new URLSearchParams(location.hash.slice(1)),
    invite = fragment.get('invite');
  if (location.hash) replace(location.pathname + location.search);
  return invite &&
    /^[a-f0-9]{64}$/.test(invite) &&
    fragment.getAll('invite').length === 1
    ? invite
    : null;
}
export function authMessage(error: unknown) {
  return error instanceof BoundaryError && error.code === 'UNAUTHENTICATED'
    ? 'Session expired. Sign in again.'
    : error instanceof BoundaryError && error.code === 'FORBIDDEN'
      ? 'You do not have access to this action.'
      : error instanceof BoundaryError && error.code === 'RATE_LIMITED'
        ? 'Too many attempts. Try again in 90 seconds.'
        : error instanceof BoundaryError && error.code === 'INVALID_CONTRACT'
          ? 'Check your NUS email and required details.'
          : 'Could not complete the request. Try again.';
}
export function takeAuthProof(
  location: { pathname: string; search: string; hash: string; origin?: string },
  replace: (url: string) => void,
) {
  // window.location is live: replaceState mutates it synchronously.
  const source = {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    origin: location.origin,
  };
  const empty = { invite: null, code: null, ticket: null };
  let pathname = location.pathname,
    hash = location.hash,
    nativeCode: string | null = null;
  if (pathname === '/auth/action') {
    // Strip even malformed secrets before bootstrap; never navigate to continueUrl.
    replace('/auth/reset');
    try {
      const query = new URLSearchParams(source.search),
        continuation = new URL(query.get('continueUrl') ?? '');
      if (
        query.getAll('mode').length !== 1 ||
        query.get('mode') !== 'resetPassword' ||
        query.getAll('oobCode').length !== 1 ||
        query.getAll('continueUrl').length !== 1 ||
        !source.origin ||
        continuation.origin !== source.origin ||
        continuation.username ||
        continuation.password ||
        continuation.search ||
        !['/sign-in', '/auth/reset'].includes(continuation.pathname)
      )
        return empty;
      nativeCode = query.get('oobCode');
      pathname = continuation.pathname;
      hash = continuation.hash;
    } catch {
      return empty;
    }
  } else if (!['/sign-in', '/auth/reset'].includes(pathname)) return empty;
  const fragment = new URLSearchParams(hash.slice(1));
  const invite =
    pathname === '/sign-in' &&
    fragment.getAll('invite').length === 1 &&
    /^[a-f0-9]{64}$/.test(fragment.get('invite') ?? '')
      ? fragment.get('invite')
      : null;
  const ticket =
    fragment.getAll('ticket').length === 1 &&
    /^[a-f0-9]{64}$/.test(fragment.get('ticket') ?? '')
      ? fragment.get('ticket')
      : null;
  const candidate =
    nativeCode ??
    (fragment.getAll('code').length === 1 ? fragment.get('code') : null);
  const code =
    ticket && /^[A-Za-z0-9_-]{1,2048}$/.test(candidate ?? '')
      ? candidate
      : null;
  if (source.pathname === '/auth/action' || source.hash) replace(pathname);
  return { invite, code, ticket };
}
