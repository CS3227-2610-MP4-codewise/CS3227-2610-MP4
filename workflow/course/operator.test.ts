import { describe, expect, it } from 'vitest';
// @ts-expect-error Local operator is a standalone Node module.
import { coursePlan } from './operator-plan.mjs';
describe('local course operator', () => {
  it('pins provisioning to an active account and escapes operator input', () => {
    const plan = coursePlan([
      'grant-instructor',
      'course-one',
      "Darryl's course",
      'account-one',
      'https://identity.example',
      'subject-one',
    ]);
    expect(plan.sql).toContain("Darryl''s course");
    expect(plan.sql).toContain('active=1');
    expect(plan.sql).toContain("subject='subject-one'");
    expect(plan.sql).toContain("'instructor'");
  });
  it('rejects malformed actions and identifiers', () => {
    expect(() =>
      coursePlan([
        'grant-instructor',
        'course;DROP',
        'name',
        'a',
        'issuer',
        'subject',
      ]),
    ).toThrow();
    expect(() =>
      coursePlan(['remote', 'course', 'name', 'a', 'issuer', 'subject']),
    ).toThrow();
  });
});
