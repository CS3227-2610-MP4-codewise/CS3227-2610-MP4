import {
  schema,
  object,
  array,
  id,
  text,
  timestamp,
  literal,
  assert,
  type Infer,
} from './instructor-contracts/schema';
import { sessionViewSchema } from './instructor-contracts/identity';
const bool = (v: unknown, p: string) => {
  assert(typeof v === 'boolean', p, 'boolean');
  return v;
};
export const bootstrapSchema = schema((v) => {
  const o = object(v, ['configured', 'csrfToken']);
  return {
    configured: bool(o.configured, '$.configured'),
    csrfToken: text(o.csrfToken, '$.csrfToken', 128, true),
  };
});
export const authViewSchema = schema((v) => {
  const o = object(v, ['session', 'email', 'administrator', 'csrfToken']);
  return {
    session: sessionViewSchema.parse(o.session),
    email: text(o.email, '$.email', 254),
    administrator: bool(o.administrator, '$.administrator'),
    csrfToken: text(o.csrfToken, '$.csrfToken', 128),
  };
});
function invitation(v: unknown, p: string) {
  const o = object(v, ['id', 'email', 'createdAt', 'expiresAt', 'status'], p);
  assert(
    ['pending', 'accepted', 'revoked', 'expired'].includes(o.status as string),
    p + '.status',
    'status',
  );
  return {
    id: id(o.id, p + '.id'),
    email: text(o.email, p + '.email', 254),
    createdAt: timestamp(o.createdAt, p + '.createdAt'),
    expiresAt: timestamp(o.expiresAt, p + '.expiresAt'),
    status: o.status as 'pending' | 'accepted' | 'revoked' | 'expired',
  };
}
export const invitationListSchema = schema((v) => {
  const o = object(v, ['items', 'nextCursor']);
  return {
    items: array(o.items, invitation, '$.items', 0, 50),
    nextCursor: o.nextCursor === null ? null : id(o.nextCursor, '$.nextCursor'),
  };
});
export const createdInvitationSchema = schema((v) => {
  const o = object(v, ['invitation', 'url']);
  return {
    invitation: invitation(o.invitation, '$.invitation'),
    url: text(o.url, '$.url', 2048),
  };
});
export const workspaceSchema = schema((v) => {
  const o = object(v, ['state', 'destination']);
  if (o.state === 'unavailable') {
    assert(o.destination === null, '$.destination');
    return { state: 'unavailable' as const, destination: null };
  }
  return {
    state: literal(o.state, 'authorized', '$.state'),
    destination: text(o.destination, '$.destination', 256),
  };
});
export type AuthView = Infer<typeof authViewSchema>;
export type Invitation = Infer<typeof invitationListSchema>['items'][number];
