import type { Issue } from '../../../shared/instructor-contracts/schema';
/** Instructor-facing field names, never raw schema paths or internal identifiers. */
export function describeIssue(issue: Issue): string {
  const q = issue.path.match(/questions\[(\d+)\]/),
    c = issue.path.match(/criteria\[(\d+)\]/);
  const where = q
    ? ` for question ${Number(q[1]) + 1}${c ? `, criterion ${Number(c[1]) + 1}` : ''}`
    : '';
  if (issue.path.endsWith('deadlineAt'))
    return 'Set a future due date before publishing.';
  if (issue.path.endsWith('.title'))
    return q
      ? `Add a title for question ${Number(q[1]) + 1}.`
      : 'Add an assignment title.';
  if (issue.path.endsWith('instructions'))
    return `Add student instructions${where}.`;
  if (issue.path.endsWith('descriptor'))
    return `Describe what you will assess${where}.`;
  if (issue.path.endsWith('comparisonKey'))
    return `Add a criterion name${where}.`;
  if (issue.code === 'bounds')
    return `Maximum points must be greater than minimum points${where}.`;
  if (issue.code === 'score')
    return `Enter points from 0 to 1000, using at most two decimal places${where}.`;
  if (issue.code === 'duplicate')
    return `Give each criterion a different name within its question${q ? ` (question ${Number(q[1]) + 1})` : ''}.`;
  if (issue.path.endsWith('.criteria') && issue.code === 'array')
    return `Add at least one rubric criterion${where}.`;
  if (issue.path === '$.questions' && issue.code === 'array')
    return 'Add at least one question before publishing.';
  if (/source|starterCode|privateReference/.test(issue.path))
    return 'Check the code fields. Each must be valid text of no more than 32 KB.';
  return `Check the assignment fields${where}. Your changes are still in this page.`;
}
