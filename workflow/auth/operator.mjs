import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { operatorPlan } from './operator-plan.mjs';
// Local target is deliberately fixed: no remote or production mutation path.
const plan = operatorPlan(process.argv.slice(2));
const wrangler = join(
  dirname(createRequire(import.meta.url).resolve('wrangler/package.json')),
  'bin',
  'wrangler.js',
);
const directory = await mkdtemp(join(tmpdir(), 'codewise-auth-operator-')),
  file = join(directory, 'operation.sql');
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
      'Local account operation failed. Apply local migrations and check the selected development database.',
    );
    process.exitCode = 1;
  } else {
    console.log(
      'Target: LOCAL codewise-development. No course permissions changed.',
    );
    console.log(result.stdout);
    if (plan.token)
      console.log(
        'Invitation capability (shown once). Append to the configured local app origin: /sign-in#invite=' +
          plan.token,
      );
  }
} finally {
  await unlink(file);
  await rmdir(directory);
}
