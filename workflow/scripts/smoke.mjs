const base = process.env.APP_URL;
const expectedEnvironment = process.env.DEPLOY_ENV;
const expectedVersion = process.env.APP_VERSION;
if (!base || !expectedEnvironment || !expectedVersion)
  throw new Error('APP_URL, DEPLOY_ENV and APP_VERSION are required.');
const parsed = new URL(base);
if (
  parsed.protocol !== 'https:' &&
  !['localhost', '127.0.0.1'].includes(parsed.hostname)
) {
  throw new Error('Remote smoke checks require HTTPS.');
}

async function verify() {
  const options = {
    signal: AbortSignal.timeout(10000),
    redirect: 'error',
    cache: 'no-store',
  };
  const response = await fetch(new URL('/api/health', base), options);
  if (!response.ok) throw new Error(`Health returned ${response.status}.`);
  const body = await response.json();
  if (
    body.status !== 'ok' ||
    body.database !== 'ok' ||
    body.environment !== expectedEnvironment ||
    body.version !== expectedVersion
  ) {
    throw new Error(
      'Health does not match the expected environment, database readiness and revision.',
    );
  }
  const missing = await fetch(
    new URL('/api/unknown-smoke-check', base),
    options,
  );
  if (
    missing.status !== 404 ||
    !missing.headers.get('content-type')?.includes('application/json')
  ) {
    throw new Error('Unknown API path must return JSON 404, not app HTML.');
  }
  const shell = await fetch(new URL('/', base), options);
  if (!shell.ok || !(await shell.text()).includes('<title>Codewise</title>'))
    throw new Error('Application shell unavailable.');
}

for (let attempt = 1; attempt <= 5; attempt += 1) {
  try {
    await verify();
    console.log(
      `Smoke checks passed for ${expectedEnvironment} at revision ${expectedVersion}.`,
    );
    break;
  } catch (error) {
    if (attempt === 5) throw error;
    await new Promise((done) => setTimeout(done, 2000));
  }
}
