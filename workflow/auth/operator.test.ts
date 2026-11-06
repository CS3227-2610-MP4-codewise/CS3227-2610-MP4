import { describe, it, expect } from 'vitest';
// @ts-expect-error Operator is a standalone Node CLI module.
import { operatorPlan } from './operator-plan.mjs';
describe('trusted local operator boundary', () => {
  it('bootstraps only an explicitly supplied Firebase UID and maps legacy IDs without matching email', () => {
    const plan = operatorPlan([
      'bootstrap-firebase',
      'synthetic-project',
      'verified-uid',
      'Operator@u.nus.edu',
    ]);
    expect(plan.sql).toContain(
      'https://securetoken.google.com/synthetic-project',
    );
    expect(plan.sql).not.toContain('auth_administrators');
    expect(() =>
      operatorPlan([
        'bootstrap-firebase',
        'synthetic-project',
        'verified-uid',
        'x@attacker.test',
      ]),
    ).toThrow();
    const mapping = operatorPlan([
      'map-firebase',
      'synthetic-project',
      'verified-uid',
      'account-id',
      "old'subject",
    ]);
    expect(mapping.sql).toContain("subject='old''subject'");
    expect(mapping.sql).not.toContain('WHERE email=');
    expect(mapping.sql).toContain('revoked_at=');
  });
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
