/** Shared transport contracts. Changes require review by both feature owners. */
export type UserRole = 'student' | 'instructor';
export type DeploymentEnvironment = 'development' | 'staging' | 'production';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: 'codewise';
  environment: DeploymentEnvironment;
  version: string;
  database: 'ok' | 'unavailable';
}

export interface ApiError {
  error: { code: string; message: string; requestId: string };
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** This public DTO deliberately excludes private reference solutions. */
export interface PublishedQuestion {
  id: string;
  assignmentVersionId: string;
  title: string;
  instructions: string;
  language: 'python';
  starterCode: string;
}

export interface DraftAnswer {
  questionVersionId: string;
  code: string;
  revision: number;
  savedAt: string;
}

export interface SubmitAssignmentRequest {
  idempotencyKey: string;
  answers: { questionVersionId: string; expectedRevision: number }[];
}

export interface ReleasedCriterionFeedback {
  criterionId: string;
  comparisonKey: string;
  score: number;
  maximumScore: number;
  explanation: string;
}

/** Draft assessment objects must not be substituted for this student-visible DTO. */
export interface ReleasedAssessment {
  id: string;
  submissionAttemptId: string;
  releaseVersion: number;
  releasedAt: string;
  criteria: ReleasedCriterionFeedback[];
}
