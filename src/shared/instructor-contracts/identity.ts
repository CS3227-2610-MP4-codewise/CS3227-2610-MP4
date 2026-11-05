import {
  schema,
  object,
  literal,
  id,
  timestamp,
  title,
  oneOf,
  errorCodes,
  array,
  text,
} from './schema';
export const sessionViewSchema = schema((v) => {
  const o = object(v, ['schemaVersion', 'userId', 'expiresAt']);
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    userId: id(o.userId, '$.userId'),
    expiresAt: timestamp(o.expiresAt, '$.expiresAt'),
  };
});
export const courseMembershipSchema = schema((v) => {
  const o = object(v, ['schemaVersion', 'courseId', 'title', 'role']);
  return {
    schemaVersion: literal(o.schemaVersion, 1, '$.schemaVersion'),
    courseId: id(o.courseId, '$.courseId'),
    title: title(o.title, '$.title'),
    role: oneOf(o.role, ['instructor', 'student'] as const, '$.role'),
  };
});
export const safeErrorSchema = schema((v) => {
  const o = object(v, ['error']);
  const e = object(o.error, ['code', 'message', 'requestId'], '$.error', [
    'issues',
  ]);
  return {
    error: {
      code: oneOf(e.code, errorCodes, '$.error.code'),
      message: text(e.message, '$.error.message', 256),
      requestId: id(e.requestId, '$.error.requestId'),
      ...(e.issues === undefined
        ? {}
        : {
            issues: array(
              e.issues,
              (v, p) => {
                const i = object(v, ['path', 'code'], p);
                return {
                  path: text(i.path, p + '.path', 256),
                  code: id(i.code, p + '.code'),
                };
              },
              '$.error.issues',
              0,
              50,
            ),
          }),
    },
  };
});
