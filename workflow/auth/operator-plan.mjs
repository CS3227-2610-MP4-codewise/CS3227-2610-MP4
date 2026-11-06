import { createHash, randomBytes, randomUUID } from 'node:crypto';
const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
export function operatorPlan(args, now = Date.now()) {
  const [action, ...values] = args;
  if (
    ['disable-firebase', 'revoke-firebase-sessions'].includes(action) &&
    values.length === 3 &&
    /^[a-z][a-z0-9-]{4,62}$/.test(values[0]) &&
    values.slice(1).every((value) => value.length > 0 && value.length <= 128)
  ) {
    const [project, uid, accountId] = values,
      selector = `SELECT id FROM auth_accounts WHERE id=${quote(accountId)} AND subject=${quote(uid)} AND issuer=${quote('https://securetoken.google.com/' + project)}`;
    return {
      sql:
        (action === 'disable-firebase'
          ? `UPDATE auth_accounts SET active=0 WHERE id IN (${selector}); `
          : '') +
        `UPDATE auth_sessions SET revoked_at=${now} WHERE user_id IN (${selector}); SELECT id,active FROM auth_accounts WHERE id IN (${selector});`,
    };
  }
  if (
    action === 'bootstrap-firebase' &&
    values.length === 3 &&
    /^[a-z][a-z0-9-]{4,62}$/.test(values[0]) &&
    /^[A-Za-z0-9_-]{1,128}$/.test(values[1]) &&
    /^[^\s@]+@(u\.nus\.edu|u\.duke\.nus\.edu|u\.yale-nus\.edu\.sg)$/.test(
      values[2].toLowerCase(),
    )
  ) {
    const [project, uid, address] = values,
      email = address.toLowerCase(),
      accountId = randomUUID(),
      tx = randomUUID(),
      inviteId = randomUUID(),
      issuer = 'https://securetoken.google.com/' + project;
    const capability = createHash('sha256')
      .update(randomBytes(32))
      .digest('hex');
    return {
      sql: `INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(${quote(inviteId)},${quote(capability)},${quote(email)},${now},${now + 86400000});
INSERT INTO auth_transactions(id,state_hash,browser_hash,nonce,verifier,invite_hash,return_path,created_at,expires_at,used_at,claim_id) VALUES(${quote(tx)},${quote(randomUUID())},${quote(randomUUID())},${quote(randomUUID())},${quote(randomUUID())},${quote(capability)},'/workspace',${now},${now + 600000},${now},${quote(randomUUID())});
INSERT INTO auth_accounts(id,issuer,subject,email,created_at,signup_tx) VALUES(${quote(accountId)},${quote(issuer)},${quote(uid)},${quote(email)},${now},${quote(tx)});
UPDATE auth_invites SET accepted_by=${quote(accountId)},accepted_at=${now} WHERE id=${quote(inviteId)};
UPDATE auth_transactions SET completed_at=${now} WHERE id=${quote(tx)};
SELECT id,issuer,subject,email FROM auth_accounts WHERE id=${quote(accountId)};`,
    };
  }
  if (
    action === 'map-firebase' &&
    values.length === 4 &&
    /^[a-z][a-z0-9-]{4,62}$/.test(values[0]) &&
    /^[A-Za-z0-9_-]{1,128}$/.test(values[1]) &&
    values.slice(2).every((v) => v.length > 0 && v.length <= 255)
  ) {
    const [project, uid, accountId, oldSubject] = values;
    return {
      sql: `UPDATE auth_accounts SET issuer=${quote('https://securetoken.google.com/' + project)},subject=${quote(uid)} WHERE id=${quote(accountId)} AND issuer='https://accounts.google.com' AND subject=${quote(oldSubject)} AND active=1;
UPDATE auth_sessions SET revoked_at=${now} WHERE user_id=${quote(accountId)};
SELECT id,issuer,subject,email FROM auth_accounts WHERE id=${quote(accountId)};`,
    };
  }
  if (
    action === 'invite' &&
    values.length === 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values[0]) &&
    values[0].length <= 254
  ) {
    const token = randomBytes(32).toString('hex'),
      digest = createHash('sha256').update(token).digest('hex');
    return {
      sql: `INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(${quote(randomUUID())},${quote(digest)},${quote(values[0].toLowerCase())},${now},${now + 24 * 60 * 60_000});`,
      token,
    };
  }
  if (action === 'accounts' && values.length === 0)
    return {
      sql: 'SELECT id,issuer,subject,email,active FROM auth_accounts ORDER BY created_at DESC LIMIT 50;',
    };
  if (
    ['grant-admin', 'revoke-admin', 'disable', 'revoke-sessions'].includes(
      action,
    ) &&
    values.length === 2 &&
    values.every((s) => s.length > 0 && s.length <= 255)
  ) {
    const [id, subject] = values,
      account = `SELECT id FROM auth_accounts WHERE id=${quote(id)} AND subject=${quote(subject)} AND issuer='https://accounts.google.com'`;
    const sql =
      action === 'grant-admin'
        ? `INSERT INTO auth_administrators(user_id) SELECT id FROM auth_accounts WHERE id=${quote(id)} AND subject=${quote(subject)} AND issuer='https://accounts.google.com' AND active=1 ON CONFLICT DO NOTHING;`
        : action === 'revoke-admin'
          ? `DELETE FROM auth_administrators WHERE user_id IN (${account});`
          : action === 'disable'
            ? `UPDATE auth_accounts SET active=0 WHERE id IN (${account}); UPDATE auth_sessions SET revoked_at=${now} WHERE user_id IN (${account});`
            : `UPDATE auth_sessions SET revoked_at=${now} WHERE user_id IN (${account});`;
    return { sql: sql + ' SELECT changes() AS affected_rows;' };
  }
  throw new Error(
    'Use: bootstrap-firebase <project> <verified-uid> <NUS-email> | map-firebase <project> <verified-uid> <account-id> <old-Google-subject> | accounts | legacy invite/grant-admin/revoke-admin/disable/revoke-sessions. Local development only; no course roles are granted.',
  );
}
