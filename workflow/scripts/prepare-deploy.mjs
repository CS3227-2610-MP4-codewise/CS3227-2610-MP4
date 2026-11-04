import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const zero = '00000000-0000-0000-0000-000000000000';

export function prepareConfig(base, inputs) {
  const {
    DEPLOY_ENV: target,
    STAGING_D1_DATABASE_ID: staging,
    PRODUCTION_D1_DATABASE_ID: production,
    APP_VERSION: version,
  } = inputs;
  if (!['staging', 'production'].includes(target))
    throw new Error('DEPLOY_ENV must be staging or production.');
  if (
    ![staging, production].every((id) => uuid.test(id ?? '') && id !== zero)
  ) {
    throw new Error('Configure valid staging and production D1 database IDs.');
  }
  if (staging.toLowerCase() === production.toLowerCase())
    throw new Error('Staging and production must use different databases.');
  if (!/^[0-9a-f]{40}$/.test(version ?? ''))
    throw new Error('APP_VERSION must be the tested Git commit SHA.');
  const config = structuredClone(base);
  const environment = config.env[target];
  environment.d1_databases[0].database_id =
    target === 'staging' ? staging : production;
  environment.vars.APP_VERSION = version;
  config.env = { [target]: environment };
  return config;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const base = JSON.parse(readFileSync('wrangler.json', 'utf8'));
  const config = prepareConfig(base, process.env);
  writeFileSync('wrangler.deploy.json', `${JSON.stringify(config, null, 2)}\n`);
  console.log(`Prepared isolated ${process.env.DEPLOY_ENV} configuration.`);
}
