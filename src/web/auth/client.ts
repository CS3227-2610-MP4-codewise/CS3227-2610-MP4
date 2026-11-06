import { BoundaryError } from '../../shared/instructor-contracts/schema';
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
    ? 'Your session has expired. Sign in again to continue.'
    : error instanceof BoundaryError && error.code === 'FORBIDDEN'
      ? 'You no longer have access to this action. Refresh your session or contact the administrator.'
      : error instanceof BoundaryError && error.code === 'RATE_LIMITED'
        ? 'Too many attempts. Please wait 90 seconds and try again.'
        : error instanceof BoundaryError && error.code === 'INVALID_CONTRACT'
          ? 'Check your NUS email, password length and required details, then try again.'
          : 'We could not complete that request. Please try again.';
}
export function takeAuthProof(
  location: { pathname: string; search: string; hash: string },
  replace: (url: string) => void,
) {
  if (!['/sign-in', '/auth/reset'].includes(location.pathname))
    return { invite: null, code: null };
  const fragment = new URLSearchParams(location.hash.slice(1));
  const invite =
    location.pathname === '/sign-in' &&
    fragment.getAll('invite').length === 1 &&
    /^[a-f0-9]{64}$/.test(fragment.get('invite') ?? '')
      ? fragment.get('invite')
      : null;
  const code =
    fragment.getAll('code').length === 1 &&
    /^[A-Za-z0-9_-]{1,2048}$/.test(fragment.get('code') ?? '')
      ? fragment.get('code')
      : null;
  if (location.hash) replace(location.pathname + location.search);
  return { invite, code };
}
