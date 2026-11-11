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
  if (action !== 'seed' && action !== 'remove' && action !== 'seed-work')
    throw new Error('Unknown action');
  const n = Number(count);
  if (
    (args.length !== 5 && !(action === 'seed-work' && args.length <= 6)) ||
    !/^[0-9]{1,3}$/.test(count ?? '') ||
    !Number.isInteger(n) ||
    n < 1 ||
    n > MAX_SEED ||
    !identifier(account) ||
    !issuer ||
    issuer.length > 255 ||
    !subject ||
    subject.length > 255 ||
    hasControl(issuer + subject) ||
    (args.length === 6 && action !== 'seed-work')
  )
    throw new Error('Invalid arguments');
  const selected = `SELECT id FROM auth_accounts WHERE id=${quote(account)} AND issuer=${quote(issuer)} AND subject=${quote(subject)} AND active=1`;
  const ids = Array.from(
    { length: n },
    (_, i) => SYNTHETIC_PREFIX + String(i + 1).padStart(3, '0'),
  );
  if (action === 'seed-work') return workPlan(ids, selected, args[5]);
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

export const WORK_ASSIGNMENT = 'synthetic-work-assignment';
export const WORK_PUBLICATION = 'synthetic-work-publication';

/**
 * Local-only student-drafts helper: one published assignment with two synthetic questions and a
 * deadline 30 days ahead, in the FIRST synthetic course, so the workbook can be exercised locally.
 * Requires a prior `seed` for the same account. Idempotent. Publications are immutable, so the deadline stays at 30 days after the first run.
 * Rows are kept (foreign keys forbid deletion); `remove` deactivates the course as before.
 */
function workPlan(ids, selected, now = new Date().toISOString()) {
  const course = quote(ids[0]);
  const deadline = quote(
    new Date(new Date(now).getTime() + 30 * 864e5).toISOString(),
  );
  const at = quote(now);
  const member = `EXISTS(SELECT 1 FROM course_memberships m WHERE m.course_id=${course} AND m.role='student' AND m.active=1 AND m.user_id IN (${selected}))`;
  const questions = [0, 1].flatMap((i) => {
    const qv = quote(`synthetic-work-qv-${i}`);
    const rv = quote(`synthetic-work-rv-${i}`);
    return [
      `INSERT INTO instructor_question_versions(id,question_id,publication_id,position,title,instructions,language,starter_code,private_reference) SELECT ${qv},${quote('sq' + i)},${quote(WORK_PUBLICATION)},${i},${quote('Synthetic question ' + (i + 1))},${quote('Write a function that returns ' + (i + 1) + '.')},'python',${quote('def answer():\n    pass\n')},'synthetic-reference' WHERE ${member} ON CONFLICT(id) DO NOTHING;`,
      `INSERT INTO instructor_rubric_versions(id,rubric_id,question_version_id) SELECT ${rv},${quote('sr' + i)},${qv} WHERE ${member} ON CONFLICT(id) DO NOTHING;`,
      `INSERT INTO instructor_criterion_versions(rubric_version_id,criterion_id,position,comparison_key,descriptor,minimum_units,maximum_units) SELECT ${rv},'c1',0,'k1','Correct output',0,500 WHERE ${member} AND NOT EXISTS(SELECT 1 FROM instructor_criterion_versions WHERE rubric_version_id=${rv});`,
    ];
  });
  return {
    ids: [ids[0]],
    sql: [
      `INSERT INTO instructor_assignment_drafts(id,course_id,revision,payload,created_by,create_key,created_at,updated_at) SELECT ${quote(WORK_ASSIGNMENT)},${course},1,'{"synthetic":true}','synthetic-instructor','synthetic-work-key',${at},${at} WHERE ${member} ON CONFLICT(id) DO NOTHING;`,
      `INSERT INTO instructor_assignment_publications(id,assignment_id,course_id,publication_number,source_revision,published_by,published_at,request_key,fingerprint,title,deadline_at) SELECT ${quote(WORK_PUBLICATION)},${quote(WORK_ASSIGNMENT)},${course},1,1,'synthetic-instructor',${at},'synthetic-work-request','synthetic-fingerprint','Synthetic workbook assignment',${deadline} WHERE ${member} ON CONFLICT(id) DO NOTHING;`,
      ...questions,
      `SELECT COUNT(*) AS synthetic_work_questions FROM instructor_question_versions WHERE publication_id=${quote(WORK_PUBLICATION)};`,
    ].join('\n'),
  };
}
