/** Reusable contract suites: substitute real reviewed factories later; label evidence. */
import { describe, it, expect, vi } from 'vitest';
import type {
  IdentityCoursePort,
  GatewayTestPorts,
} from '../../src/server/instructor/ports/contracts';
import { withAuthorizedObject } from '../../src/server/instructor/ports/contracts';
import {
  publicationSchema,
  type Publication,
} from '../../src/shared/instructor-contracts/publication';
import {
  validateAttempt,
  type Attempt,
} from '../../src/shared/instructor-contracts/submission';
import {
  releaseSchema,
  withdrawnSchema,
  currentnessSchema,
  assertCurrentRelease,
  currentnessToken,
  type Release,
  type Currentness,
} from '../../src/shared/instructor-contracts/release';
import {
  driveGateway,
  type IdentityScenario,
} from '../fixtures/instructor-contracts/adapters';
import {
  aiRequestSchema,
  validateAssessmentDraft,
} from '../../src/shared/instructor-contracts/ai';
export function identityContractSuite(
  name: string,
  factory: (scenario: IdentityScenario) => {
    identity: IdentityCoursePort;
    revoke: () => void;
  },
) {
  describe(
    name + ' C-ID adapter conformance (real authentication pending)',
    () => {
      for (const scenario of ['missing', 'foreign-course', 'revoked'] as const)
        it(
          'denies ' +
            scenario +
            ' before private reads, ignoring forged browser roles',
          async () => {
            const read = vi.fn();
            const { identity } = factory(scenario);
            const request = new Request('https://fixture.invalid/api', {
              headers: {
                'x-role': 'instructor',
                'x-user-id': 'instructor_demo',
              },
            });
            await expect(
              withAuthorizedObject(
                identity,
                request,
                { kind: 'submission', id: 'attempt_demo' },
                'instructor-read',
                read,
              ),
            ).rejects.toMatchObject({
              code: scenario === 'missing' ? 'UNAUTHENTICATED' : 'NOT_FOUND',
            });
            expect(read).not.toHaveBeenCalled();
          },
        );
      it('denies missing adapter and forged principal', async () => {
        const read = vi.fn(),
          request = new Request('https://fixture.invalid');
        await expect(
          withAuthorizedObject(
            undefined,
            request,
            { kind: 'assignment', id: 'assignment_demo' },
            'instructor-read',
            read,
          ),
        ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
        const { identity } = factory('authorized');
        await expect(
          identity.requireCourse(
            { userId: 'instructor_demo', sessionHandle: 'forged' } as never,
            'course_demo',
            'instructor-write',
          ),
        ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
        expect(read).not.toHaveBeenCalled();
      });
      it('rechecks revocation and mutation origin', async () => {
        const f = factory('authorized'),
          read = vi.fn(async () => ({ ok: true }));
        const request = new Request('https://fixture.invalid', {
          method: 'POST',
          headers: { origin: 'https://fixture.invalid' },
        });
        await withAuthorizedObject(
          f.identity,
          request,
          { kind: 'assignment', id: 'assignment_demo' },
          'instructor-write',
          read,
        );
        expect(read).toHaveBeenCalledTimes(1);
        f.revoke();
        await expect(
          withAuthorizedObject(
            f.identity,
            request,
            { kind: 'assignment', id: 'assignment_demo' },
            'instructor-read',
            read,
          ),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });
        const bad = factory('bad-origin');
        read.mockClear();
        await expect(
          withAuthorizedObject(
            bad.identity,
            request,
            { kind: 'assignment', id: 'assignment_demo' },
            'instructor-write',
            read,
          ),
        ).rejects.toMatchObject({ code: 'FORBIDDEN' });
        expect(read).not.toHaveBeenCalled();
      });
    },
  );
}
export interface PublicationFactory {
  privateRecord(): unknown;
  project(value: unknown): Publication;
  expected: Publication;
}
export function publicationContractSuite(
  name: string,
  make: () => PublicationFactory,
) {
  describe(name + ' C-PUB producer/consumer conformance', () => {
    it('projects exact public keys from richer private record', () => {
      const f = make(),
        input = f.privateRecord(),
        output = f.project(input);
      expect(output).toEqual(f.expected);
      const json = JSON.stringify(output);
      expect(json).not.toContain('PRIVATE_SYNTHETIC_SENTINEL');
      expect(json).not.toContain('privateReference');
      expect(json).not.toContain('auditSecret');
      expect(publicationSchema.parse(JSON.parse(json))).toEqual(f.expected);
    });
    it('consumer rejects private/unknown fields at nested boundaries', () => {
      const f = make(),
        bad = structuredClone(f.expected) as Publication & {
          privateReference: string;
        };
      bad.privateReference = 'PRIVATE_SYNTHETIC_SENTINEL';
      expect(publicationSchema.safeParse(bad).success).toBe(false);
      const nested = structuredClone(f.expected);
      Object.assign(nested.questions[0].criteria[0], {
        privateReference: 'sentinel',
      });
      expect(publicationSchema.safeParse(nested).success).toBe(false);
    });
  });
}
export function submissionContractSuite(
  name: string,
  make: () => { publication: Publication; attempt: Attempt },
) {
  describe(
    name + ' C-SUB consumer conformance (producer persistence pending)',
    () => {
      it('accepts independently pinned evidence and returns detached data', async () => {
        const f = make(),
          checked = await validateAttempt(f.attempt, f.publication);
        expect(checked.answers[0].source).toBe('print(1)\n');
        checked.answers[0].source = 'changed';
        expect(f.attempt.answers[0].source).toBe('print(1)\n');
      });
      for (const mutation of [
        'rubric',
        'hash',
        'missing',
        'duplicate',
        'foreign',
      ] as const)
        it('rejects ' + mutation, async () => {
          const f = make(),
            a = structuredClone(f.attempt);
          if (mutation === 'rubric')
            a.answers[0].rubricVersionId = 'foreign_rubric';
          if (mutation === 'hash') a.answers[0].source = 'print(2)\n';
          if (mutation === 'missing') a.answers = [];
          if (mutation === 'duplicate') a.answers.push({ ...a.answers[0] });
          if (mutation === 'foreign')
            a.answers[0].questionVersionId = 'foreign_question';
          await expect(validateAttempt(a, f.publication)).rejects.toMatchObject(
            { code: 'INVALID_CONTRACT' },
          );
        });
    },
  );
}
export function releaseContractSuite(
  name: string,
  make: () => {
    release: Release;
    current: Currentness;
    withdrawn: unknown;
    project: (v: unknown) => unknown;
  },
) {
  describe(name + ' C-REL projection/currentness conformance', () => {
    it('projects private metadata away and withdrawal to content-free tombstone', () => {
      const f = make();
      expect(
        f.project({
          ...f.release,
          privateReference: 'PRIVATE_SYNTHETIC_SENTINEL',
          auditSecret: 'hidden',
        }),
      ).toEqual(f.release);
      const tombstone = f.project({
        ...(f.withdrawn as object),
        criteria: f.release.criteria,
        privateReason: 'hidden',
      });
      expect(withdrawnSchema.parse(tombstone)).toEqual(f.withdrawn);
      expect(JSON.stringify(tombstone)).not.toContain('criteria');
      expect(
        withdrawnSchema.safeParse({ ...(f.withdrawn as object), criteria: [] })
          .success,
      ).toBe(false);
    });
    it('rejects revoked currentness and historical withdrawal never clears a newer current release', () => {
      const f = make(),
        token = currentnessToken(f.current);
      const corrected = { ...f.release, releaseVersion: 2 };
      const newer = currentnessSchema.parse({
        ...f.current,
        availabilityRevision: 2,
        currentReleaseVersion: 2,
      });
      expect(assertCurrentRelease(corrected, newer).releaseVersion).toBe(2);
      const historical = currentnessSchema.parse({
        ...newer,
        availabilityRevision: 3,
        withdrawnReleaseVersions: [1],
      });
      expect(assertCurrentRelease(corrected, historical).releaseVersion).toBe(
        2,
      );
      expect(() =>
        assertCurrentRelease(f.release, historical, token),
      ).toThrow();
      const withdrawn = currentnessSchema.parse({
        ...historical,
        availabilityRevision: 4,
        currentReleaseVersion: null,
        withdrawnReleaseVersions: [1, 2],
      });
      expect(() => assertCurrentRelease(corrected, withdrawn)).toThrow();
      expect(
        currentnessSchema.safeParse({ ...newer, withdrawnReleaseVersions: [2] })
          .success,
      ).toBe(false);
      expect(() =>
        assertCurrentRelease(
          f.release,
          { ...f.current, availabilityRevision: 2 },
          token,
        ),
      ).toThrow();
    });
    it('rejects superseded or cross-attempt content even with matching version number', () => {
      const f = make();
      expect(() =>
        assertCurrentRelease({ ...f.release, state: 'superseded' }, f.current),
      ).toThrow();
      expect(() =>
        assertCurrentRelease(
          { ...f.release, submissionAttemptId: 'foreign' },
          f.current,
        ),
      ).toThrow();
      expect(
        releaseSchema.safeParse({ ...f.release, state: 'draft' }).success,
      ).toBe(false);
    });
  });
}
export function gatewayContractSuite(
  name: string,
  make: () => {
    request: unknown;
    payload: unknown;
    publication: Publication;
    attempt: Attempt;
  },
) {
  describe(
    name + ' C-AI injected seam conformance (no provider/network)',
    () => {
      function setup() {
        const f = make(),
          transport = vi.fn(async () => f.payload),
          authorize = vi.fn(async () => {}),
          admission = vi.fn(async () => {});
        const ports: GatewayTestPorts<
          'assessment-draft',
          Awaited<ReturnType<typeof validateAssessmentDraft>>
        > = {
          authorize,
          config: { verified: true, maxOutputTokens: 512 },
          validate: (v) => validateAssessmentDraft(v, f.publication, f.attempt),
          admission,
          resolveEvidence: async () => 'synthetic_evidence_v1',
          requestRecords: { begin: async () => 'synthetic_request' },
          clock: () => 100,
          deadlineMs: 1000,
          transport,
        };
        return { f, ports, transport, authorize, admission };
      }
      it('validates successful output and marks omitted usage unavailable', async () => {
        const s = setup(),
          result = await driveGateway('assessment-draft', s.f.request, s.ports);
        expect(result.status).toBe('succeeded');
        if (result.status === 'succeeded') {
          expect(result.usage).toEqual({ status: 'unavailable' });
          expect(result.payload.codeExecuted).toBe(false);
        }
        expect(s.transport).toHaveBeenCalledTimes(1);
      });
      for (const gate of [
        'auth',
        'config',
        'validator',
        'cap',
        'admission',
        'deadline',
      ] as const)
        it('blocks ' + gate + ' before transport', async () => {
          const s = setup();
          if (gate === 'auth')
            s.ports.authorize = async () => {
              throw new Error('denied');
            };
          if (gate === 'config') s.ports.config = undefined;
          if (gate === 'validator') s.ports.validate = undefined;
          if (gate === 'cap')
            s.ports.config = { verified: true, maxOutputTokens: 1 };
          if (gate === 'admission')
            s.ports.admission = async () => {
              throw new Error('denied');
            };
          if (gate === 'deadline') s.ports.deadlineMs = 0;
          await expect(
            driveGateway('assessment-draft', s.f.request, s.ports),
          ).rejects.toThrow();
          expect(s.transport).not.toHaveBeenCalled();
        });
      it('rejects domain-invalid output, changed evidence and action mismatch', async () => {
        const a = setup();
        a.ports.transport = async () => ({
          ...(a.f.payload as object),
          criteria: [],
        });
        await expect(
          driveGateway('assessment-draft', a.f.request, a.ports),
        ).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
        const b = setup();
        let reads = 0;
        b.ports.resolveEvidence = async () => (++reads === 1 ? 'old' : 'new');
        await expect(
          driveGateway('assessment-draft', b.f.request, b.ports),
        ).rejects.toMatchObject({ code: 'STALE_EVIDENCE' });
        const c = setup(),
          wrong = aiRequestSchema.parse({
            schemaVersion: 1,
            courseId: 'course_demo',
            idempotencyKey: 'progress',
            action: 'progress-explanation',
            evidenceRefs: [
              {
                kind: 'release',
                assessmentId: 'assessment_demo',
                releaseVersion: 1,
              },
            ],
            outputTokenLimit: 1,
          });
        await expect(
          driveGateway('assessment-draft', wrong, c.ports),
        ).rejects.toThrow();
        expect(c.transport).not.toHaveBeenCalled();
      });
    },
  );
}

export function releaseProtocolContractSuite(
  name: string,
  make: () => import('../../src/server/instructor/ports/contracts').ReleaseProtocolPort,
) {
  describe(
    name +
      ' C-REL protocol conformance (synthetic lifecycle, database atomicity pending)',
    () => {
      it('preserves scoped committed release retry and rejects changed/stale commands', async () => {
        const p = make(),
          command = {
            schemaVersion: 1 as const,
            assessmentId: 'assessment_demo',
            assessmentRevisionId: 'reviewed_revision_2',
            expectedAvailabilityRevision: 1,
            idempotencyKey: 'release_2',
          };
        const published = await p.release(command);
        expect(published.releaseVersion).toBe(2);
        expect(await p.release(command)).toEqual(published);
        expect((await p.currentness()).availabilityRevision).toBe(2);
        await expect(
          p.release({ ...command, assessmentRevisionId: 'changed' }),
        ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
        await expect(
          p.release({ ...command, idempotencyKey: 'stale' }),
        ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
      });
      it('historical withdrawal preserves v2, current withdrawal clears it, retries do not repeat the transition', async () => {
        const p = make();
        await p.release({
          schemaVersion: 1,
          assessmentId: 'assessment_demo',
          assessmentRevisionId: 'reviewed_revision_2',
          expectedAvailabilityRevision: 1,
          idempotencyKey: 'r2',
        });
        const historical = {
          schemaVersion: 1 as const,
          assessmentId: 'assessment_demo',
          releaseVersion: 1,
          expectedAvailabilityRevision: 2,
          idempotencyKey: 'withdraw_1',
          reason: 'Synthetic correction',
        };
        const tombstone = await p.withdraw(historical);
        expect(await p.withdraw(historical)).toEqual(tombstone);
        expect(await p.currentness()).toMatchObject({
          currentReleaseVersion: 2,
          availabilityRevision: 3,
          withdrawnReleaseVersions: [1],
        });
        await expect(
          p.withdraw({ ...historical, reason: 'changed' }),
        ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
        await p.withdraw({
          ...historical,
          releaseVersion: 2,
          expectedAvailabilityRevision: 3,
          idempotencyKey: 'withdraw_2',
        });
        expect(await p.currentness()).toMatchObject({
          currentReleaseVersion: null,
          availabilityRevision: 4,
          withdrawnReleaseVersions: [1, 2],
        });
      });
    },
  );
}
