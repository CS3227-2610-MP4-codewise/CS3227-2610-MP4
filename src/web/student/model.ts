import { workspaceContextsSchema } from '../../shared/courses';
import {
  publicationSchema,
  type Publication,
} from '../../shared/instructor-contracts/publication';
import {
  studentAssignmentPageSchema,
  studentCursor,
  type StudentAssignmentPage,
} from '../../shared/student-assignments';

/** SD-04/05: browser state is presentation only; every value here is re-authorized per request. */
export type StudentRoute =
  | { kind: 'courses'; after: string }
  | { kind: 'assignments'; courseId: string; cursor: string | null }
  | { kind: 'overview'; versionId: string; from: string | null };

const routeId = /^[A-Za-z0-9_-]{1,128}$/;
const contextCursor = /^[A-Za-z0-9_-]{1,128}$/;

/** Parses a browser location. Unknown or malformed input is null (shown as unavailable). */
export function parseStudentRoute(
  pathname: string,
  search: string,
): StudentRoute | null {
  const params = new URLSearchParams(search);
  const keys = [...params.keys()];
  const only = (allowed: string[]) =>
    keys.every((key) => allowed.includes(key)) &&
    new Set(keys).size === keys.length;
  if (pathname === '/student' || pathname === '/workspace') {
    if (!only(['after', 'role'])) return null;
    const role = params.get('role');
    if (role !== null && role !== 'student') return null;
    const after = params.get('after') ?? '';
    if (after !== '' && !contextCursor.test(after)) return null;
    return { kind: 'courses', after };
  }
  const validCursor = (value: string | null) => {
    if (value === null) return true;
    try {
      studentCursor(value);
      return true;
    } catch {
      return false;
    }
  };
  const list = /^\/student\/courses\/([^/]+)\/assignments$/.exec(pathname);
  if (list) {
    if (!routeId.test(list[1]) || !only(['cursor'])) return null;
    const cursor = params.get('cursor');
    if (!validCursor(cursor)) return null;
    return { kind: 'assignments', courseId: list[1], cursor };
  }
  const overview = /^\/student\/assignments\/([^/]+)$/.exec(pathname);
  if (overview) {
    // `from` is only the assignment-list page to return to (SD-03); it never authorizes.
    if (!routeId.test(overview[1]) || !only(['from'])) return null;
    const from = params.get('from');
    if (!validCursor(from)) return null;
    return { kind: 'overview', versionId: overview[1], from };
  }
  return null;
}

export const studentPaths = {
  courses: (after = '') =>
    '/student' + (after ? '?after=' + encodeURIComponent(after) : ''),
  assignments: (courseId: string, cursor?: string | null) =>
    '/student/courses/' +
    encodeURIComponent(courseId) +
    '/assignments' +
    (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''),
  overview: (versionId: string, from?: string | null) =>
    '/student/assignments/' +
    encodeURIComponent(versionId) +
    (from ? '?from=' + encodeURIComponent(from) : ''),
};

/** UTC is the explicit display timezone; no course timezone is invented. */
export function formatDeadline(isoValue: string): string {
  const d = new Date(isoValue);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const pad = (n: number) => String(n).padStart(2, '0');
  // Locale-independent so every browser shows the same deadline text.
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export type Failure = 'session' | 'unavailable' | 'invalid' | 'network';
export class StudentRequestError extends Error {
  constructor(readonly failure: Failure) {
    super('Student request failed.');
  }
}
export function failureOf(status: number): Failure {
  return status === 401
    ? 'session'
    : status === 403 || status === 404
      ? 'unavailable'
      : status === 400
        ? 'invalid'
        : 'network';
}
export const failureMessage: Record<Failure, string> = {
  session: 'Your session has ended. Sign in again to continue.',
  unavailable: 'This is not available to you.',
  invalid:
    'This page link is no longer valid. Start again from the first page.',
  network: 'This could not be loaded. Check your connection and try again.',
};

type Fetcher = typeof fetch;
async function getJson(fetcher: Fetcher, path: string, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetcher(path, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new StudentRequestError('network');
  }
  if (!response.ok) throw new StudentRequestError(failureOf(response.status));
  return response.json() as Promise<unknown>;
}
/** Closed parsing; a payload that fails validation is treated as unavailable, never rendered. */
function parsed<T>(decode: () => T): T {
  try {
    return decode();
  } catch {
    throw new StudentRequestError('unavailable');
  }
}

export function studentApi(fetcher: Fetcher = (...a) => fetch(...a)) {
  return {
    async courses(after: string, signal: AbortSignal) {
      const body = await getJson(
        fetcher,
        '/api/courses/contexts' +
          (after ? '?studentAfter=' + encodeURIComponent(after) : ''),
        signal,
      );
      const contexts = parsed(() => workspaceContextsSchema.parse(body));
      const student = contexts.workspaces.find(
        (item) => item.role === 'student',
      );
      if (!student) throw new StudentRequestError('unavailable');
      // A non-progressing cursor would loop; fail safely instead.
      if (after && student.nextCursor === after)
        throw new StudentRequestError('invalid');
      return {
        courses: student.courses,
        nextCursor: student.nextCursor,
        roles: contexts.workspaces.map((item) => item.role),
      };
    },
    async assignments(
      courseId: string,
      cursor: string | null,
      signal: AbortSignal,
    ): Promise<StudentAssignmentPage> {
      const body = await getJson(
        fetcher,
        '/api/student/courses/' +
          encodeURIComponent(courseId) +
          '/assignments' +
          (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''),
        signal,
      );
      const page = parsed(() => studentAssignmentPageSchema.parse(body));
      // Bind the response to the requested destination.
      if (page.course.id !== courseId)
        throw new StudentRequestError('unavailable');
      if (cursor && page.nextCursor === cursor)
        throw new StudentRequestError('invalid');
      return page;
    },
    async overview(
      versionId: string,
      signal: AbortSignal,
    ): Promise<Publication> {
      const body = await getJson(
        fetcher,
        '/api/student/publications/' + encodeURIComponent(versionId),
        signal,
      );
      const publication = parsed(() => publicationSchema.parse(body));
      // Exact version only: a different version is never substituted.
      if (publication.assignmentVersionId !== versionId)
        throw new StudentRequestError('unavailable');
      return publication;
    },
  };
}

/**
 * Destination-scoped request generations. Starting a request aborts the previous
 * one; results from superseded or cancelled generations are ignored.
 */
export class RequestGenerations {
  private generation = 0;
  private controller: AbortController | null = null;
  start() {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const generation = ++this.generation;
    return {
      signal: controller.signal,
      current: () =>
        generation === this.generation && !controller.signal.aborted,
    };
  }
  cancel() {
    this.generation++;
    this.controller?.abort();
    this.controller = null;
  }
}

/**
 * `/workspace` entry choice against the current trusted contexts. A requested role is
 * honoured only while the account still holds it, so a stale `?role=` link falls back
 * instead of opening a workspace the account lost. Otherwise the existing
 * Instructor-first fallback is preserved, including an eligible first-admin Instructor
 * with zero courses; a Student-only account opens the Student workspace. Role
 * preferences never grant access: each workspace re-checks trusted contexts itself.
 */
export function chooseWorkspace(
  requested: string | null,
  roles: readonly ('student' | 'instructor')[],
): 'student' | 'instructor' {
  if (
    (requested === 'student' || requested === 'instructor') &&
    roles.includes(requested)
  )
    return requested;
  return !roles.includes('instructor') && roles.includes('student')
    ? 'student'
    : 'instructor';
}
