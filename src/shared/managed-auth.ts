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
  const o = object(v, ['invitation']);
  return { invitation: invitation(o.invitation, '$.invitation') };
});
export const okSchema = schema((v) => {
  const o = object(v, ['ok']);
  assert(o.ok === true, '$.ok');
  return { ok: true as const };
});
export type ManagedInvitation = Infer<
  typeof managedInvitationListSchema
>['items'][number];
