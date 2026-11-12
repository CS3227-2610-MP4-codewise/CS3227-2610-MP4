import {
  BoundaryError,
  ContractError,
} from '../../shared/instructor-contracts/schema';
import {
  assertCurrentRelease,
  currentnessSchema,
  currentnessToken,
  type Currentness,
  type Release,
  type Withdrawn,
} from '../../shared/instructor-contracts/release';
import {
  feedbackSummarySchema,
  feedbackVersionSchema,
  versionState,
  type FeedbackSummary,
} from '../../shared/student-feedback';
import type {
  ReleaseReadPort,
  TrustedPrincipal,
} from '../instructor/ports/contracts';
import { StudentWorkError, type StudentWork } from './work';

/** SF-01/02/05/07: the producer methods the student consumer uses (design D3). */
export type StudentReleasePort = Pick<
  ReleaseReadPort,
  'attemptReleases' | 'getAuthorized' | 'currentness'
>;

type Entry = {
  assessmentId: string;
  currentness: Currentness;
  releaseVersions: number[];
};

/**
 * Maps producer failures onto the student error set without revealing why: denial and absence
 * share the uniform 404, a currentness change is STALE_FEEDBACK (409) and any other failure,
 * including a producer contract breach, is 503. Producer issue details never reach the response.
 */
async function producer<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof StudentWorkError) throw error;
    if (error instanceof BoundaryError && !(error instanceof ContractError)) {
      if (error.code === 'FORBIDDEN' || error.code === 'NOT_FOUND')
        throw new BoundaryError('NOT_FOUND');
      if (error.code === 'STALE_EVIDENCE')
        throw new StudentWorkError('STALE_FEEDBACK');
      if (error.code === 'UNAUTHENTICATED') throw error;
    }
    throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  }
}

/** Checks one producer entry belongs to `attemptId` and is internally consistent. */
function checkEntry(attemptId: string, raw: unknown): Entry | null {
  if (raw === null) return null;
  if (raw === undefined || typeof raw !== 'object')
    throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  const e = raw as Entry;
  const currentness = currentnessSchema.parse(e.currentness);
  const versions = e.releaseVersions;
  if (
    !Array.isArray(versions) ||
    versions.length < 1 ||
    !versions.every(
      (v, i) =>
        Number.isSafeInteger(v) && v >= 1 && (i === 0 || versions[i - 1] < v),
    ) ||
    currentness.withdrawnReleaseVersions.some((w) => !versions.includes(w)) ||
    (currentness.currentReleaseVersion !== null &&
      !versions.includes(currentness.currentReleaseVersion))
  )
    throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  // SF-02: an entry for another assessment or attempt is never treated as this attempt's state.
  if (
    currentness.submissionAttemptId !== attemptId ||
    currentness.assessmentId !== e.assessmentId
  )
    throw new StudentWorkError('STALE_FEEDBACK');
  return {
    assessmentId: e.assessmentId,
    currentness,
    releaseVersions: [...versions],
  };
}

/**
 * SF-01, SF-02, SF-05, SF-07: Keith's consumer of the C-REL producer. Every call checks the
 * caller's own attempt and current Student membership first (the existing guarded attempt read),
 * so a foreign, unknown or revoked request gets the uniform 404 before any producer call. It keeps
 * no cache and stores nothing.
 */
export class StudentFeedback {
  constructor(readonly work: StudentWork) {}

  private async lookup(
    principal: TrustedPrincipal,
    attemptId: string,
    port: StudentReleasePort | undefined,
  ): Promise<{ port: StudentReleasePort; entry: Entry | null }> {
    await this.work.attempt(principal, attemptId);
    if (!port) throw new BoundaryError('UPSTREAM_UNAVAILABLE');
    const found = await producer(() =>
      port.attemptReleases(principal, [attemptId]),
    );
    return { port, entry: checkEntry(attemptId, found.get(attemptId)) };
  }

  /** Re-reads currentness after the content read; any change is a stale result (SF-02). */
  private async recheck(
    port: StudentReleasePort,
    principal: TrustedPrincipal,
    entry: Entry,
  ): Promise<Currentness> {
    const again = currentnessSchema.parse(
      await producer(() => port.currentness(principal, entry.assessmentId)),
    );
    if (currentnessToken(again) !== currentnessToken(entry.currentness))
      throw new StudentWorkError('STALE_FEEDBACK');
    return again;
  }

  async summary(
    principal: TrustedPrincipal,
    attemptId: string,
    port: StudentReleasePort | undefined,
  ): Promise<FeedbackSummary> {
    const { port: p, entry } = await this.lookup(principal, attemptId, port);
    if (!entry) return { schemaVersion: 1, state: 'none' };
    const versions = [...entry.releaseVersions].reverse().map((v) => ({
      releaseVersion: v,
      state: versionState(entry.currentness, v),
    }));
    const current = entry.currentness.currentReleaseVersion;
    if (current === null) {
      const currentness = await this.recheck(p, principal, entry);
      return feedbackSummarySchema.parse({
        schemaVersion: 1,
        state: 'withdrawn',
        currentness,
        versions,
      });
    }
    const token = currentnessToken(entry.currentness);
    const raw = await producer(() =>
      p.getAuthorized(principal, entry.assessmentId, current),
    );
    let release: Release;
    try {
      release = assertCurrentRelease(raw, entry.currentness, token);
    } catch {
      throw new StudentWorkError('STALE_FEEDBACK');
    }
    const currentness = await this.recheck(p, principal, entry);
    try {
      return feedbackSummarySchema.parse({
        schemaVersion: 1,
        state: 'released',
        currentness,
        versions,
        release,
      });
    } catch {
      throw new StudentWorkError('STALE_FEEDBACK');
    }
  }

  async version(
    principal: TrustedPrincipal,
    attemptId: string,
    releaseVersion: number,
    port: StudentReleasePort | undefined,
  ): Promise<Release | Withdrawn> {
    const { port: p, entry } = await this.lookup(principal, attemptId, port);
    if (!entry || !entry.releaseVersions.includes(releaseVersion))
      throw new BoundaryError('NOT_FOUND');
    const raw = await producer(() =>
      p.getAuthorized(principal, entry.assessmentId, releaseVersion),
    );
    const value = producerValue(raw);
    const currentness = await this.recheck(p, principal, entry);
    if (
      value.id !== entry.assessmentId ||
      value.submissionAttemptId !== attemptId ||
      value.releaseVersion !== releaseVersion ||
      value.state !== versionState(currentness, releaseVersion)
    )
      throw new StudentWorkError('STALE_FEEDBACK');
    return value;
  }

  /**
   * SF-07: the attempt IDs on one history page whose current release exists at load time, with
   * one batched producer call. The marker is a hint, so an absent or failing producer gives no
   * markers and never fails the history list.
   */
  async released(
    principal: TrustedPrincipal,
    attemptIds: readonly string[],
    port: StudentReleasePort | undefined,
  ): Promise<ReadonlySet<string>> {
    const out = new Set<string>();
    if (!port || attemptIds.length === 0) return out;
    let found: Map<string, unknown>;
    try {
      found = await port.attemptReleases(principal, attemptIds);
    } catch {
      return out;
    }
    for (const id of attemptIds) {
      try {
        const entry = checkEntry(id, found.get(id));
        if (entry && entry.currentness.currentReleaseVersion !== null)
          out.add(id);
      } catch {
        // A stale or inconsistent row shows no marker; the attempt view refetches the truth.
      }
    }
    return out;
  }
}

function producerValue(raw: unknown): Release | Withdrawn {
  try {
    return feedbackVersionSchema.parse(raw);
  } catch {
    throw new BoundaryError('UPSTREAM_UNAVAILABLE');
  }
}
