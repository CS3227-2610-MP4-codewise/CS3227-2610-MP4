const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
const identifier = (s) =>
  typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s);
const hasControl = (s) =>
  Array.from(s).some((ch) => {
    const code = ch.codePointAt(0);
    return code < 32 || (code >= 127 && code <= 159);
  });
/** Trusted local operator must identify the existing account by immutable issuer and subject. */
export function coursePlan(args) {
  const [action, course, name, account, issuer, subject] = args;
  if (action !== 'grant-instructor' && action !== 'revoke-instructor')
    throw new Error('Unknown action');
  if (
    args.length !== 6 ||
    !identifier(course) ||
    !identifier(account) ||
    !name ||
    name.length > 120 ||
    hasControl(name) ||
    !issuer ||
    issuer.length > 255 ||
    !subject ||
    subject.length > 255 ||
    hasControl(issuer + subject)
  )
    throw new Error('Invalid arguments');
  const selected = `SELECT id FROM auth_accounts WHERE id=${quote(account)} AND issuer=${quote(issuer)} AND subject=${quote(subject)} AND active=1`;
  const insert = `INSERT INTO courses(id,name) SELECT ${quote(course)},${quote(name)} WHERE EXISTS(${selected}) ON CONFLICT(id) DO NOTHING;`;
  const change =
    action === 'grant-instructor'
      ? `INSERT INTO course_memberships(course_id,user_id,role,active) SELECT ${quote(course)},id,'instructor',1 FROM auth_accounts WHERE id IN (${selected}) AND EXISTS(SELECT 1 FROM courses WHERE id=${quote(course)} AND active=1) ON CONFLICT(course_id,user_id,role) DO UPDATE SET active=1;`
      : `UPDATE course_memberships SET active=0 WHERE course_id=${quote(course)} AND user_id IN (${selected}) AND role='instructor';`;
  return {
    sql:
      (action === 'grant-instructor' ? insert : '') +
      change +
      ` SELECT changes() AS affected_rows;`,
  };
}
