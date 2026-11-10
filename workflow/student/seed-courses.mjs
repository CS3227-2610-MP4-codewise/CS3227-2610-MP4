import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { seedPlan } from './seed-courses-plan.mjs';

// Fixed to the LOCAL development D1. There is no remote flag and none is accepted.
let plan;
try {
  plan = seedPlan(process.argv.slice(2));
} catch {
  console.error(
    'Usage: node workflow/student/seed-courses.mjs seed|remove <count 1-300> <account-id> <issuer> <subject>\n' +
      'Find the account with: npm run auth:local -- accounts',
  );
  process.exit(1);
}
const wrangler = join(
  dirname(createRequire(import.meta.url).resolve('wrangler/package.json')),
  'bin',
  'wrangler.js',
);
const directory = await mkdtemp(join(tmpdir(), 'codewise-seed-'));
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
      'Local seed failed; check local migrations (npm run db:local) and the account identifiers.',
    );
    process.exitCode = 1;
  } else {
    console.log(
      `Target: LOCAL codewise-development. Courses ${plan.ids[0]}..${plan.ids.at(-1)}. ` +
        'A count of 0 means no matching active account.',
    );
    const rows = JSON.parse(result.stdout).at(-1)?.results ?? [];
    console.log(JSON.stringify(rows));
  }
} finally {
  await unlink(file);
  await rmdir(directory);
}
