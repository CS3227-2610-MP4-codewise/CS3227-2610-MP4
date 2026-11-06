import type {
  IdentityCoursePort,
  TrustedPrincipal,
} from '../../src/server/instructor/ports/contracts';
import type { AssignmentRepository } from '../../src/server/instructor/assignments/repository';
import { BoundaryError } from '../../src/shared/instructor-contracts/schema';
export const previewOrigin = 'http://127.0.0.1:5175';
export const previewCourse = 'course_synthetic';
export const cookieName = 'cw_instructor_fixture';
/** Fixed server-owned fixture. Never a production authentication provider. */
export function syntheticIdentity(
  repository: AssignmentRepository,
  token: string,
  options: { courseId?: string; role?: 'student' | 'instructor' } = {},
): IdentityCoursePort {
  const course = options.courseId ?? previewCourse;
  const principal = {
    userId: 'instructor_synthetic',
    sessionHandle: token,
  } as TrustedPrincipal;
  return {
    async requireSession(request) {
      const cookies = request.headers.get('cookie') ?? '';
      if (
        !cookies.split(';').some((c) => c.trim() === `${cookieName}=${token}`)
      )
        throw new BoundaryError('UNAUTHENTICATED');
      return principal;
    },
    async requireCourse(p, c, action) {
      if (
        p !== principal ||
        c !== course ||
        (options.role === 'student' && action !== 'student-read')
      )
        throw new BoundaryError('FORBIDDEN');
    },
    async requireObject(p, target) {
      if (p !== principal || target.kind !== 'assignment')
        throw new BoundaryError('NOT_FOUND');
      const scope = await repository.scope(target.id);
      if (!scope || scope.courseId !== course)
        throw new BoundaryError('NOT_FOUND');
      return scope;
    },
    async requireMutationOrigin(request) {
      if (request.headers.get('origin') !== previewOrigin)
        throw new BoundaryError('FORBIDDEN');
    },
  };
}
export function allowedTransport(headers: Headers) {
  return (
    headers.get('host') === '127.0.0.1:5175' &&
    ![...headers.keys()].some(
      (k) =>
        k === 'forwarded' ||
        k.startsWith('x-forwarded-') ||
        ['x-user-id', 'x-role', 'x-course-id', 'authorization'].includes(k),
    ) &&
    (!headers.has('origin') || headers.get('origin') === previewOrigin)
  );
}
