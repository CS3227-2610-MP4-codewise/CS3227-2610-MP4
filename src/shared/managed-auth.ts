import {
  array,
  assert,
  id,
  object,
  schema,
  text,
  timestamp,
  type Infer,
} from './instructor-contracts/schema';
function invitation(v: unknown, p: string) {
  const o = object(
    v,
    ['id', 'email', 'courseId', 'createdAt', 'status', 'sendState', 'sentAt'],
    p,
    ['targetRole', 'targetRoles'],
  );
  assert(
    o.targetRole === undefined ||
      o.targetRole === null ||
      o.targetRole === 'student' ||
      o.targetRole === 'instructor',
    p + '.targetRole',
  );
  assert(
    ['pending', 'accepted', 'revoked'].includes(o.status as string),
    p + '.status',
  );
  assert(
    ['queued', 'failed', 'unknown'].includes(o.sendState as string),
    p + '.sendState',
  );
  return {
    id: id(o.id, p + '.id'),
    email: text(o.email, p + '.email', 254),
    courseId: id(o.courseId, p + '.courseId'),
    targetRole: (o.targetRole ?? null) as 'student' | 'instructor' | null,
    targetRoles:
      o.targetRoles === undefined
        ? o.targetRole
          ? [o.targetRole as 'student' | 'instructor']
          : []
        : array(
            o.targetRoles,
            (value, path) => {
              assert(value === 'student' || value === 'instructor', path);
              return value;
            },
            p + '.targetRoles',
            0,
            2,
          ),
    createdAt: timestamp(o.createdAt, p + '.createdAt'),
    status: o.status as 'pending' | 'accepted' | 'revoked',
    sendState: o.sendState as 'queued' | 'failed' | 'unknown',
    sentAt: o.sentAt === null ? null : timestamp(o.sentAt, p + '.sentAt'),
  };
}
export const managedInvitationListSchema = schema((v) => {
  const o = object(v, ['items', 'nextCursor']);
  return {
    items: array(o.items, invitation, '$.items', 0, 50),
    nextCursor: o.nextCursor === null ? null : id(o.nextCursor, '$.nextCursor'),
  };
});
export const managedCreatedSchema = schema((v) => {
  const o = object(v, ['invitation'], '$', ['reused']);
  assert(o.reused === undefined || typeof o.reused === 'boolean', '$.reused');
  return {
    invitation: invitation(o.invitation, '$.invitation'),
    reused: o.reused === true,
  };
});
export const okSchema = schema((v) => {
  const o = object(v, ['ok']);
  assert(o.ok === true, '$.ok');
  return { ok: true as const };
});
export type ManagedInvitation = Infer<
  typeof managedInvitationListSchema
>['items'][number];
