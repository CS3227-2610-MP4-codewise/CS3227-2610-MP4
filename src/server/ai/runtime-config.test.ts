import { describe, expect, it } from 'vitest';
import type { Environment } from '../environment';
import { instructorAIConfig } from './runtime-config';

const config = {
  model: 'fixture-model',
  promptVersion: 'v1',
  outputTokenLimit: 1024,
  inputTokenReservation: 1000,
  maxInputBytes: 5000,
  deadlineMs: 30000,
  cacheMs: 0,
  userRequestLimit: 2,
  providerRequestLimit: 4,
  userTokenLimit: 3000,
  providerTokenLimit: 6000,
  concurrencyLimit: 1,
  windowMs: 60000,
};
const env = (overrides: Record<string, unknown> = {}) =>
  ({
    SOCLAAS_INSTRUCTOR_ENABLED: 'true',
    SOCLAAS_INSTRUCTOR_API_KEY: 'synthetic-key',
    SOCLAAS_INSTRUCTOR_CONFIG: JSON.stringify(config),
    ...overrides,
  }) as unknown as Environment;
describe('instructor AI server configuration', () => {
  it('fails closed unless explicitly enabled and fully configured', () => {
    for (const overrides of [
      { SOCLAAS_INSTRUCTOR_ENABLED: undefined },
      { SOCLAAS_INSTRUCTOR_ENABLED: 'TRUE' },
      { SOCLAAS_INSTRUCTOR_API_KEY: '' },
      { SOCLAAS_INSTRUCTOR_CONFIG: '{' },
      { SOCLAAS_INSTRUCTOR_CONFIG: JSON.stringify({ ...config, windowMs: 0 }) },
      {
        SOCLAAS_INSTRUCTOR_CONFIG: JSON.stringify({
          ...config,
          outputTokenLimit: 1023,
        }),
      },
      {
        SOCLAAS_INSTRUCTOR_CONFIG: JSON.stringify({ ...config, unknown: true }),
      },
    ])
      expect(instructorAIConfig(env(overrides))).toBeUndefined();
  });
  it('uses only the explicitly configured model and policy', () => {
    const result = instructorAIConfig(env());
    expect(result?.profile).toMatchObject({
      verified: true,
      model: 'fixture-model',
      allowedModels: ['fixture-model'],
      promptVersion: 'v1',
    });
    expect(result?.limits).toMatchObject({
      providerRequestLimit: 4,
      windowMs: 60000,
    });
  });
});
