import type { IdentityCoursePort } from '../instructor/ports/contracts';
import type { AuthRoutes } from './routes';
/** No default course implementation. Keith must supply his reviewed authoritative producer. */
export function composeIdentityCourse(
  auth: AuthRoutes,
  keith: Pick<IdentityCoursePort, 'requireCourse' | 'requireObject'>,
): IdentityCoursePort {
  return {
    requireSession: async (request) =>
      (await auth.requireSession(request)).principal,
    requireMutationOrigin: (request) => auth.requireMutationOrigin(request),
    requireCourse: (...args) => keith.requireCourse(...args),
    requireObject: (...args) => keith.requireObject(...args),
  };
}
