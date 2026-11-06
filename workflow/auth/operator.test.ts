import { describe, it, expect } from 'vitest';
// @ts-expect-error Operator is a standalone Node CLI module.
import { operatorPlan } from './operator-plan.mjs';
describe('trusted local operator boundary', () => {
  it('requires existing account id + verified Google subject, never email self-promotion', () => {
    expect(() => operatorPlan(['grant-admin', 'x@example.test'])).toThrow();
    expect(operatorPlan(['grant-admin', 'id', 'subject']).sql).toContain(
      "issuer='https://accounts.google.com' AND active=1",
    );
    expect(
      operatorPlan(['grant-admin', 'id', "subject' OR 1=1--"]).sql,
    ).toContain("subject'' OR 1=1--");
  });
  it('stores only the hash of the first invitation and expires in 24h', () => {
    const result = operatorPlan(['invite', 'Member@example.test'], 1000);
    expect(result.sql).not.toContain(result.token);
    expect(result.sql).toContain('86401000');
    expect(result.sql).toContain('member@example.test');
  });
});
