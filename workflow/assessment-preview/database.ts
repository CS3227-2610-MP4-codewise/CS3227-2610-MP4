import { readFile } from 'node:fs/promises';
import { localDatabase } from '../instructor-preview/database';
export async function assessmentDatabase(persist?: string) {
  const database = await localDatabase(persist);
  await database.db
    .prepare(
      'CREATE TABLE IF NOT EXISTS _assessment_migrations(name TEXT PRIMARY KEY)',
    )
    .run();
  const name = '0008_instructor_assessments.sql';
  // Local preview only: the pre-rebase 0007 assessment migration has identical SQL.
  // Preserve fixture grading across the filename renumber; this never touches remote migration metadata.
  await database.db
    .prepare(
      "INSERT OR IGNORE INTO _assessment_migrations(name) SELECT ? WHERE EXISTS(SELECT 1 FROM _assessment_migrations WHERE name='0007_instructor_assessments.sql')",
    )
    .bind(name)
    .run();
  if (
    !(await database.db
      .prepare('SELECT name FROM _assessment_migrations WHERE name=?')
      .bind(name)
      .first())
  ) {
    const sql = await readFile('src/server/db/migrations/' + name, 'utf8');
    await database.db.batch([
      ...sql
        .split(/^-- statement\s*$/m)
        .map((s) => s.trim())
        .filter((s) => s.replace(/^--.*$/gm, '').trim())
        .map((s) => database.db.prepare(s)),
      database.db
        .prepare('INSERT INTO _assessment_migrations VALUES(?)')
        .bind(name),
    ]);
  }
  return database;
}
