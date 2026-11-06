import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
/** Explicit isolated local D1 test/preview. Never a second deployed identity store. */
export async function authDatabase(persist?: string) {
  const mf = new Miniflare({
    ...convertV4MiniflareOptions({
      modules: true,
      script:
        'export default { fetch(){return new Response("auth-test-only")} }',
      compatibilityDate: '2026-11-04',
      d1Databases: { DB: 'auth-isolated-test' },
    }),
    ...(persist ? { resourcePersistencePath: persist } : {}),
  });
  const db = (await mf.getD1Database('DB')) as unknown as D1Database;
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS _auth_test_migrations(name TEXT PRIMARY KEY)',
    )
    .run();
  for (const name of [
    '0003_authentication.sql',
    '0004_firebase_invitations.sql',
    '0005_firebase_native_email.sql',
    '0006_owner_bootstrap.sql',
  ]) {
    if (
      !(await db
        .prepare('SELECT name FROM _auth_test_migrations WHERE name=?')
        .bind(name)
        .first())
    ) {
      const sql = await readFile('src/server/db/migrations/' + name, 'utf8');
      await db.batch([
        ...sql
          .split(/^-- statement\s*$/m)
          .map((s) => s.trim())
          .filter((s) => s.replace(/^--.*$/gm, '').trim())
          .map((s) => db.prepare(s)),
        db.prepare('INSERT INTO _auth_test_migrations VALUES(?)').bind(name),
      ]);
    }
  }
  return { db, close: () => mf.dispose() };
}
