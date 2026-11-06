import { createHash, randomBytes, randomUUID } from 'node:crypto';
const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
export function operatorPlan(args, now = Date.now()) {
  const [action, ...values] = args;
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
    'Use: invite <email> | accounts | grant-admin/revoke-admin/disable/revoke-sessions <account-id> <verified-subject>. Local development only.',
  );
}
