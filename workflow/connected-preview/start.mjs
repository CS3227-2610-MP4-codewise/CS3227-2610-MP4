import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coursePlan } from '../course/operator-plan.mjs';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const common = execFileSync(
  'git',
  ['rev-parse', '--path-format=absolute', '--git-common-dir'],
  { cwd: project, encoding: 'utf8' },
).trim();
const authoritativeRoot = dirname(common),
  persist = join(authoritativeRoot, '.wrangler', 'state'),
  vars = join(authoritativeRoot, '.dev.vars'),
  config = join(project, 'workflow/connected-preview/wrangler.json'),
  wrangler = join(project, 'node_modules/wrangler/bin/wrangler.js');
const setup = process.argv.slice(2);
if (setup.some((a) => a !== '--setup-owner-course')) {
  console.error('Usage: npm run dev:workflow -- [--setup-owner-course]');
  process.exit(1);
}
await access(vars).catch(() => {
  throw Error(
    'Local credentials are missing. Configure the original checkout .dev.vars first.',
  );
});
const content = await readFile(vars, 'utf8');
const configuredOrigin = content
  .match(/^AUTH_ORIGIN\s*=\s*["']?([^\r\n"']+)/m)?.[1]
  .trim();
if (configuredOrigin !== 'http://127.0.0.1:8787')
  throw Error(
    'Local AUTH_ORIGIN must be http://127.0.0.1:8787 for this workflow.',
  );
function run(args, label) {
  const r = spawnSync(process.execPath, args, {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0)
    throw Error(label + ' failed. No remote operation was attempted.');
  return r.stdout;
}
console.log('Building the connected instructor application…');
run(
  [
    process.env.npm_execpath ??
      join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    'run',
    'build',
  ],
  'Application build',
);
console.log(
  'Applying local development migrations; existing data is retained…',
);
const dbArgs = ['--config', config, '--persist-to', persist, '--local'];
run(
  [wrangler, 'd1', 'migrations', 'apply', 'codewise-development', ...dbArgs],
  'Local migrations',
);
if (setup.includes('--setup-owner-course')) {
  const raw = run(
    [
      wrangler,
      'd1',
      'execute',
      'codewise-development',
      ...dbArgs,
      '--command',
      'SELECT a.id,a.issuer,a.subject FROM auth_owner_bootstrap o JOIN auth_accounts a ON a.id=o.account_id AND a.issuer=o.issuer AND a.subject=o.subject WHERE o.singleton=1 AND o.completed_at IS NOT NULL AND a.active=1',
      '--json',
    ],
    'Local owner lookup',
  );
  const rows = JSON.parse(raw).flatMap((r) => r.results ?? []);
  if (rows.length !== 1)
    throw Error(
      'No completed active local owner found. Bootstrap the local owner through sign-in before local course setup.',
    );
  const a = rows[0],
    plan = coursePlan([
      'grant-instructor',
      'course_local_workflow',
      'Local workflow test',
      a.id,
      a.issuer,
      a.subject,
    ]);
  run(
    [
      wrangler,
      'd1',
      'execute',
      'codewise-development',
      ...dbArgs,
      '--command',
      plan.sql,
      '--json',
    ],
    'Explicit local course grant',
  );
  console.log(
    'Existing local owner assigned to Local workflow test. No learner or remote membership created.',
  );
}
console.log(
  'Starting native local Worker. Sign in: http://127.0.0.1:8787/sign-in',
);
const child = spawn(
  process.execPath,
  [
    wrangler,
    'dev',
    '--config',
    config,
    '--env-file',
    vars,
    '--persist-to',
    persist,
    '--ip',
    '127.0.0.1',
    '--port',
    '8787',
  ],
  {
    cwd: project,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    stdio: ['inherit', 'pipe', 'pipe'],
  },
);
// Do not print Wrangler's credential-binding inventory. Only local readiness/request status is shown.
let buffer = '';
child.stdout.on('data', (chunk) => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, end);
    buffer = buffer.slice(end + 1);
    if (/Ready on http:\/\/127\.0\.0\.1:8787/.test(line))
      console.log('Connected workflow ready: http://127.0.0.1:8787/sign-in');
    const match = /\b(GET|POST|PUT|DELETE)\s+(\/[^\s?]*)[^\n]*\s(\d{3})\b/.exec(
      line,
    );
    if (match) console.log(match[1] + ' ' + match[2] + ' ' + match[3]);
  }
});
child.stderr.on('data', (chunk) => {
  if (String(chunk).includes('ERROR'))
    console.error(
      'Local Worker reported an error. Check configuration/build; no credential values are printed here.',
    );
});
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
child.on('exit', (code) => {
  process.exitCode = code ?? 0;
});
