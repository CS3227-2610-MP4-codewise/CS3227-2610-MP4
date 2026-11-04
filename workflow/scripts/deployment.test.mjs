import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareConfig } from './prepare-deploy.mjs';
import { assertStagingRun } from './release-gate.mjs';

const base = JSON.parse(
  readFileSync(new URL('../../wrangler.json', import.meta.url), 'utf8'),
);
const inputs = {
  DEPLOY_ENV: 'staging',
  STAGING_D1_DATABASE_ID: '11111111-1111-4111-8111-111111111111',
  PRODUCTION_D1_DATABASE_ID: '22222222-2222-4222-8222-222222222222',
  APP_VERSION: 'a'.repeat(40),
};

test('OPS-01: generated config contains only the selected environment and database', () => {
  const config = prepareConfig(base, inputs);
  assert.deepEqual(Object.keys(config.env), ['staging']);
  assert.equal(
    config.env.staging.d1_databases[0].database_id,
    inputs.STAGING_D1_DATABASE_ID,
  );
  assert.equal(config.env.staging.vars.APP_VERSION, inputs.APP_VERSION);
  assert.equal(base.env.staging.vars.APP_VERSION, 'unreleased');
  const production = prepareConfig(base, {
    ...inputs,
    DEPLOY_ENV: 'production',
  });
  assert.deepEqual(Object.keys(production.env), ['production']);
  assert.equal(
    production.env.production.d1_databases[0].database_id,
    inputs.PRODUCTION_D1_DATABASE_ID,
  );
});

test('OPS-01: missing, shared, or placeholder databases fail closed', () => {
  for (const id of [
    undefined,
    '',
    inputs.STAGING_D1_DATABASE_ID,
    '00000000-0000-0000-0000-000000000000',
  ]) {
    assert.throws(() =>
      prepareConfig(base, { ...inputs, PRODUCTION_D1_DATABASE_ID: id }),
    );
  }
  assert.throws(() =>
    prepareConfig(base, { ...inputs, DEPLOY_ENV: 'development' }),
  );
  assert.throws(() => prepareConfig(base, { ...inputs, APP_VERSION: 'main' }));
});

const run = {
  repository: { id: 123 },
  head_repository: { id: 123 },
  path: '.github/workflows/deploy-staging.yml',
  event: 'push',
  head_branch: 'main',
  status: 'completed',
  conclusion: 'success',
  head_sha: 'a'.repeat(40),
};

test('OPS-02: production accepts only a successful trusted staging run', () => {
  assert.equal(assertStagingRun(run, 123), run.head_sha);
  for (const patch of [
    { conclusion: 'failure' },
    { status: 'in_progress' },
    { event: 'pull_request' },
    { head_branch: 'feature' },
    { path: '.github/workflows/ci.yml' },
    { head_repository: { id: 999 } },
    { head_sha: 'main' },
  ])
    assert.throws(() => assertStagingRun({ ...run, ...patch }, 123));
  assert.throws(() => assertStagingRun(run, 999));
});
