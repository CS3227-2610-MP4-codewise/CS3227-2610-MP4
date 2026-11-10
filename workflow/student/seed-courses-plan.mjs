const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
const identifier = (s) =>
  typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s);
const hasControl = (s) =>
  Array.from(s).some((ch) => {
    const code = ch.codePointAt(0);
    return code < 32 || (code >= 127 && code <= 159);
  });
export const SYNTHETIC_PREFIX = 'synthetic-student-';
export const MAX_SEED = 300;

/**
 * Local-only SD-01/COU-06 acceptance helper: gives one existing, active, operator-identified
 * account Student membership in N synthetic courses so >100-course paging can be exercised
 * in the real app. Courses are named and prefixed as synthetic. `remove` deactivates the
 * synthetic memberships and courses again (rows are kept; foreign keys forbid deletion).
 */
export function seedPlan(args) {
  const [action, count, account, issuer, subject] = args;
  if (action !== 'seed' && action !== 'remove')
    throw new Error('Unknown action');
  const n = Number(count);
  if (
    args.length !== 5 ||
    !/^[0-9]{1,3}$/.test(count ?? '') ||
    !Number.isInteger(n) ||
    n < 1 ||
    n > MAX_SEED ||
    !identifier(account) ||
    !issuer ||
    issuer.length > 255 ||
    !subject ||
    subject.length > 255 ||
    hasControl(issuer + subject)
  )
    throw new Error('Invalid arguments');
  const selected = `SELECT id FROM auth_accounts WHERE id=${quote(account)} AND issuer=${quote(issuer)} AND subject=${quote(subject)} AND active=1`;
  const ids = Array.from(
    { length: n },
    (_, i) => SYNTHETIC_PREFIX + String(i + 1).padStart(3, '0'),
  );
  if (action === 'remove') {
    const list = ids.map(quote).join(',');
    return {
      ids,
      sql:
        `UPDATE course_memberships SET active=0 WHERE course_id IN (${list}) AND role='student' AND user_id IN (${selected});` +
        ` UPDATE courses SET active=0 WHERE id IN (${list}) AND NOT EXISTS (SELECT 1 FROM course_memberships m WHERE m.course_id=courses.id AND m.active=1);` +
        ` SELECT changes() AS affected_rows;`,
    };
  }
  const statements = ids.flatMap((id, i) => [
    `INSERT INTO courses(id,name) SELECT ${quote(id)},${quote('Synthetic course ' + String(i + 1).padStart(3, '0'))} WHERE EXISTS(${selected}) ON CONFLICT(id) DO UPDATE SET active=1;`,
    `INSERT INTO course_memberships(course_id,user_id,role,active) SELECT ${quote(id)},id,'student',1 FROM auth_accounts WHERE id IN (${selected}) AND EXISTS(SELECT 1 FROM courses WHERE id=${quote(id)} AND active=1) ON CONFLICT(course_id,user_id,role) DO UPDATE SET active=1;`,
  ]);
  return {
    ids,
    sql:
      statements.join('\n') +
      `\nSELECT COUNT(*) AS synthetic_student_memberships FROM course_memberships WHERE role='student' AND active=1 AND course_id LIKE '${SYNTHETIC_PREFIX}%' AND user_id IN (${selected});`,
  };
}
