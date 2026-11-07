import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { coursePlan } from './operator-plan.mjs';
let plan;
try {
  plan = coursePlan(process.argv.slice(2));
} catch {
  console.error(
    'Usage: npm run course:local -- grant-instructor|revoke-instructor <course-id> <course-name> <account-id> <issuer> <subject>',
  );
  process.exit(1);
}
const wrangler = join(
  dirname(createRequire(import.meta.url).resolve('wrangler/package.json')),
  'bin',
  'wrangler.js',
);
const directory = await mkdtemp(join(tmpdir(), 'codewise-course-'));
const file = join(directory, 'operation.sql');
try {
  await writeFile(file, plan.sql, { mode: 0o600 });
  const result = spawnSync(
    process.execPath,
    [
      wrangler,
      'd1',
      'execute',
      'codewise-development',
      '--env',
      'development',
      '--local',
      '--file',
      file,
      '--json',
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    },
  );
  if (result.status !== 0) {
    console.error(
      'Local course operation failed; check the local migration and selected account.',
    );
    process.exitCode = 1;
  } else {
    console.log(
      'Target: LOCAL codewise-development. Check affected_rows; zero means no matching active account or course.',
    );
    console.log(result.stdout);
  }
} finally {
  await unlink(file);
  await rmdir(directory);
}
