import type { DeploymentEnvironment } from '../shared/contracts';

export interface Environment {
  APP_ENV: DeploymentEnvironment;
  APP_VERSION: string;
  DB: D1Database;
  ASSETS: Fetcher;
  // Future AI integration reads this only on the server. No AI routes exist yet.
  SOCLAAS_API_KEY?: string;
}
