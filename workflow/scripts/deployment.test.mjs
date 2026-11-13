import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { prepareConfig } from './prepare-deploy.mjs';
import YAML from 'yaml';
import { assertReleaseArtifact } from './release-gate.mjs';

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
  assert.equal(config.keep_vars, true);
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
  assert.equal(production.keep_vars, true);
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

const expected = {
  sha: 'a'.repeat(40),
  runId: '12345',
  latestMainSha: 'a'.repeat(40),
};
const manifest = { sha: expected.sha, runId: expected.runId };

test('OPS-02: release rejects mismatched artifacts, another run and stale main', () => {
  assert.equal(assertReleaseArtifact(manifest, expected), expected.sha);
  for (const invalid of [
    null,
    {},
    { ...manifest, sha: 'b'.repeat(40) },
    { ...manifest, runId: '99999' },
  ]) {
    assert.throws(() => assertReleaseArtifact(invalid, expected));
  }
  for (const patch of [
    { sha: 'main' },
    { runId: 'not-a-run' },
    { latestMainSha: 'b'.repeat(40) },
  ]) {
    assert.throws(() =>
      assertReleaseArtifact(manifest, { ...expected, ...patch }),
    );
  }
});

test('OPS-02: production is a dependent approval-gated job, never a PR deployment', () => {
  const workflow = YAML.parse(
    readFileSync(
      new URL('../../.github/workflows/deploy-staging.yml', import.meta.url),
      'utf8',
    ),
  );
  assert.deepEqual(workflow.on.push.branches, ['master']);
  assert.equal(workflow.on.pull_request, undefined);
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.jobs.deploy.needs, 'ci');
  assert.equal(workflow.jobs.production.needs, 'deploy');
  assert.equal(workflow.jobs.production.environment.name, 'production');
  assert.match(workflow.jobs.production.if, /github\.event_name == 'push'/);
  assert.match(
    workflow.jobs.production.if,
    /github\.ref == 'refs\/heads\/master'/,
  );
  const steps = workflow.jobs.production.steps;
  const artifact = steps.find((step) =>
    step.uses?.startsWith('actions/download-artifact@'),
  );
  assert.equal(artifact.with.name, 'staging-release-${{ github.sha }}');
  assert.equal(artifact.with['run-id'], undefined);
  const verify = steps.findIndex(
    (step) =>
      step.name === 'Verify exact staging artifact and current master revision',
  );
  const migrate = steps.findIndex(
    (step) => step.name === 'Apply reviewed production migrations',
  );
  assert.ok(verify >= 0 && migrate > verify);
  assert.equal(
    steps.find((step) => step.uses?.startsWith('actions/checkout@')).with.ref,
    '${{ github.sha }}',
  );
});
