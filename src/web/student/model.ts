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
import {
  assignmentStatusPageSchema,
  attemptHistorySchema,
  type AssignmentStatus,
} from '../../shared/student-work';

/** SD-04/05: browser state is presentation only; every value here is re-authorized per request. */
export type StudentRoute =
  | { kind: 'courses'; after: string }
  | { kind: 'assignments'; courseId: string; cursor: string | null }
  | { kind: 'overview'; versionId: string; from: string | null }
  /** student-progress SP-09: one course's progress page. */
  | { kind: 'progress'; courseId: string }
  | {
      kind: 'work';
      versionId: string;
      position: number;
      /** SQ-05: a historical answer view; absent means Working copy. */
      view?: HistoricalView;
      /** SQ-05: the attempt shown in `view`; absent means the latest. Re-authorized by the server. */
      attempt?: string;
    };

export type HistoricalView = 'submitted' | 'feedback';

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
  const progress = /^\/student\/courses\/([^/]+)\/progress$/.exec(pathname);
  if (progress) {
    if (!routeId.test(progress[1]) || keys.length) return null;
    return { kind: 'progress', courseId: progress[1] };
  }
  // SW-04, UI-04/05: workbook; `position` is the 1-based question number.
  const work = /^\/student\/assignments\/([^/]+)\/work\/([1-9][0-9]?)$/.exec(
    pathname,
  );
  if (work) {
    const position = Number(work[2]);
    if (!routeId.test(work[1]) || position > 20) return null;
    const base = { kind: 'work', versionId: work[1], position } as const;
    // SQ-05: a closed query. Any extra or repeated key, unknown view, malformed attempt, or an
    // attempt without a view opens the Working copy of the same question with the values dropped.
    if (!keys.length || !only(['view', 'attempt'])) return base;
    const view = params.get('view');
    const attempt = params.get('attempt');
    if (view !== 'submitted' && view !== 'feedback') return base;
    if (attempt === null) return { ...base, view };
    if (!routeId.test(attempt)) return base;
    return { ...base, view, attempt };
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
  progress: (courseId: string) =>
    '/student/courses/' + encodeURIComponent(courseId) + '/progress',
  overview: (versionId: string, from?: string | null) =>
    '/student/assignments/' +
    encodeURIComponent(versionId) +
    (from ? '?from=' + encodeURIComponent(from) : ''),
  work: (
    versionId: string,
    position = 1,
    ctx?: { view: HistoricalView; attempt?: string | null },
  ) =>
    '/student/assignments/' +
    encodeURIComponent(versionId) +
    '/work/' +
    position +
    (ctx
      ? '?view=' +
        ctx.view +
        (ctx.attempt ? '&attempt=' + encodeURIComponent(ctx.attempt) : '')
      : ''),
};

// DR-01: built from parts, so ICU punctuation, spacing and AM/PM casing never change the text.
const singaporeTime = new Intl.DateTimeFormat('en-SG', {
  timeZone: 'Asia/Singapore',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

/**
 * DR-01: every student time is the server instant in Singapore time, `DD/MM/YYYY, h:mm:ss am/pm`,
 * with no zone label, whatever the viewer's locale or time zone. `datetime` attributes keep ISO.
 */
export function formatDeadline(isoValue: string): string {
  const part: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const { type, value } of singaporeTime.formatToParts(new Date(isoValue)))
    part[type] = value;
  const hour = String(Number(part.hour) || 12);
  return `${part.day}/${part.month}/${part.year}, ${hour}:${part.minute}:${part.second} ${(part.dayPeriod ?? '').toLowerCase()}`;
}

/** DR-02: rubric guidance shows only the attainable maximum, in brackets. */
export function formatPoints(maximum: number): string {
  return `(${String(maximum)} ${maximum === 1 ? 'point' : 'points'})`;
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
    /**
     * AS-01/03: one status per listed assignment, keyed by assignment ID. Only IDs that were asked
     * for are kept; an empty page sends no request.
     */
    async status(
      courseId: string,
      assignmentIds: readonly string[],
      signal: AbortSignal,
    ): Promise<ReadonlyMap<string, AssignmentStatus>> {
      if (!assignmentIds.length) return new Map();
      const body = await getJson(
        fetcher,
        '/api/student/courses/' +
          encodeURIComponent(courseId) +
          '/assignment-status?' +
          assignmentIds.map((id) => 'id=' + encodeURIComponent(id)).join('&'),
        signal,
      );
      const page = parsed(() => assignmentStatusPageSchema.parse(body));
      const asked = new Set(assignmentIds);
      return new Map(
        page.items
          .filter((item) => asked.has(item.assignmentId))
          .map((item) => [item.assignmentId, item.status]),
      );
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
    /**
     * SQ-07: the student's latest attempt for the assignment (first history page, newest first),
     * or null with none. Server-authorized own-attempt read; nothing is cached.
     */
    async latestAttempt(
      versionId: string,
      signal: AbortSignal,
    ): Promise<{ attemptId: string; feedbackReleased: boolean } | null> {
      const body = await getJson(
        fetcher,
        '/api/student/publications/' +
          encodeURIComponent(versionId) +
          '/attempts',
        signal,
      );
      const page = parsed(() => attemptHistorySchema.parse(body));
      const latest = page.items[0];
      return latest
        ? {
            attemptId: latest.attemptId,
            feedbackReleased: latest.feedbackReleased,
          }
        : null;
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
