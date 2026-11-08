import type { DeploymentEnvironment } from '../shared/contracts';

export interface Environment {
  APP_ENV: DeploymentEnvironment;
  APP_VERSION: string;
  DB: D1Database;
  ASSETS: Fetcher;
  AUTH_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_API_KEY?: string;
  FIREBASE_SERVICE_ACCOUNT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  GMAIL_SENDER_EMAIL?: string;
  GMAIL_APP_PASSWORD?: string;
  AUTH_MAIL_ENABLED?: string;
  BOOTSTRAP_OWNER_EMAIL?: string;
  BOOTSTRAP_OWNER_PASSWORD?: string;
  // Server-only; no AI routes or live provider activation are enabled yet.
  SOCLAAS_INSTRUCTOR_API_KEY?: string;
  SOCLAAS_STUDENT_API_KEY?: string;
}
