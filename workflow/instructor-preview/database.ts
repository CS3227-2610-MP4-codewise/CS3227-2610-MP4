import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
/** Local D1 only. No remote binding/account or deployment credential is used. */
export async function localDatabase(persist?: string) {
  const mf = new Miniflare({
    ...convertV4MiniflareOptions({
      modules: true,
      script:
        'export default { fetch() { return new Response("local-test-only"); } }',
      compatibilityDate: '2026-11-04',
      d1Databases: { DB: 'instructor-authoring-local' },
    }),
    ...(persist ? { resourcePersistencePath: persist } : {}),
  });
  const raw = await mf.getD1Database('DB');
  // Stable forwarding functions also permit transparent query instrumentation in tests.
  const db = {
    prepare: raw.prepare.bind(raw),
    batch: raw.batch.bind(raw),
    exec: raw.exec.bind(raw),
  } as unknown as D1Database;
  await db
    .prepare(
      'CREATE TABLE IF NOT EXISTS _instructor_preview_migrations (name TEXT PRIMARY KEY)',
    )
    .run();
  for (const name of [
    '0001_platform_metadata.sql',
    '0002_instructor_assignments.sql',
  ]) {
    if (
      await db
        .prepare('SELECT name FROM _instructor_preview_migrations WHERE name=?')
        .bind(name)
        .first()
    )
      continue;
    const sql = await readFile(
      resolve('src/server/db/migrations', name),
      'utf8',
    );
    const statements = sql
      .split(name === '0001_platform_metadata.sql' ? ';' : /^-- statement\s*$/m)
      .map((s) => s.trim())
      .filter((s) => s.replace(/^--.*$/gm, '').trim());
    await db.batch([
      ...statements.map((s) => db.prepare(s)),
      db
        .prepare('INSERT INTO _instructor_preview_migrations(name) VALUES(?)')
        .bind(name),
    ]);
  }
  return { db, close: () => mf.dispose() };
}
