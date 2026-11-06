import { describe, it, expect, vi } from 'vitest';
import { BoundaryError } from '../../src/shared/instructor-contracts/schema';
import {
  withAuthorizedObject,
  type IdentityCoursePort,
  type TrustedPrincipal,
} from '../../src/server/instructor/ports/contracts';
/** Reuse with a reviewed deployed producer later. Factory creates an isolated real session. */
export function trustedSessionChecks(
  name: string,
  factory: () => Promise<{
    request: Request;
    requireSession(request: Request): Promise<TrustedPrincipal>;
    revoke(): Promise<void>;
  }>,
) {
  describe(
    name + ' C-ID trusted session composition (course checks synthetic)',
    () => {
      it('allows private reader only after real session and Keith-shaped object/course checks', async () => {
        const f = await factory(),
          principal = await f.requireSession(f.request),
          events: string[] = [];
        const identity: IdentityCoursePort = {
          requireSession: f.requireSession,
          async requireObject(p) {
            expect(p).toEqual(principal);
            events.push('object');
            return { courseId: 'synthetic-course' };
          },
          async requireCourse(p) {
            expect(p).toEqual(principal);
            events.push('course');
          },
          async requireMutationOrigin() {
            throw new BoundaryError('FORBIDDEN');
          },
        };
        const read = vi.fn(async () => {
          events.push('private-read');
          return 'synthetic-private';
        });
        expect(
          await withAuthorizedObject(
            identity,
            f.request,
            { kind: 'assignment', id: 'synthetic-assignment' },
            'instructor-read',
            read,
          ),
        ).toBe('synthetic-private');
        expect(events).toEqual(['object', 'course', 'private-read']);
        identity.requireObject = async () => {
          throw new BoundaryError('NOT_FOUND');
        };
        read.mockClear();
        await expect(
          withAuthorizedObject(
            identity,
            f.request,
            { kind: 'assignment', id: 'other' },
            'instructor-read',
            read,
          ),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });
        expect(read).not.toHaveBeenCalled();
        identity.requireObject = async () => ({ courseId: 'synthetic-course' });
        identity.requireCourse = async () => {
          throw new BoundaryError('FORBIDDEN');
        };
        await expect(
          withAuthorizedObject(
            identity,
            f.request,
            { kind: 'assignment', id: 'synthetic-assignment' },
            'instructor-read',
            read,
          ),
        ).rejects.toMatchObject({ code: 'FORBIDDEN' });
        expect(read).not.toHaveBeenCalled();
        await f.revoke();
        await expect(f.requireSession(f.request)).rejects.toMatchObject({
          code: 'UNAUTHENTICATED',
        });
        await expect(
          withAuthorizedObject(
            identity,
            f.request,
            { kind: 'assignment', id: 'synthetic-assignment' },
            'instructor-read',
            read,
          ),
        ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
        expect(read).not.toHaveBeenCalled();
        await expect(
          f.requireSession(
            new Request(f.request.url, {
              headers: {
                'x-role': 'instructor',
                'x-user-id': principal.userId,
              },
            }),
          ),
        ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
      });
    },
  );
}
