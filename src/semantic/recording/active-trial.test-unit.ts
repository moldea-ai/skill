// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  appendSemanticOperationalRetry,
  attachSemanticActorEvidence,
  completeSemanticActiveTrial,
  createSemanticActiveTrial,
  isSemanticActiveTrialStopped,
  stopSemanticOperationalStage,
} from './active-trial.ts';
import type { ISemanticActiveTrialActorEvidence, ISemanticRecordedTrial } from './types.ts';

const SHA256 = 'a'.repeat(64);
const CREATED_AT = '2026-09-20T12:00:00.000Z';
const RETRIED_AT = '2026-09-20T12:00:01.000Z';
const STOPPED_AT = '2026-09-20T12:00:02.000Z';

describe('semantic active-trial recovery', () => {
  test('persists retry exhaustion and counts one explicit resumed attempt', () => {
    const initial = createSemanticActiveTrial(null, CREATED_AT);
    const retried = appendSemanticOperationalRetry(initial, 'actor', {
      category: 'timed-out',
      failedAt: RETRIED_AT,
      failureCount: 1,
      retryDelayMs: 4_000,
    });
    const stopped = stopSemanticOperationalStage(
      retried,
      'actor',
      {
        category: 'timed-out',
        failedAt: STOPPED_AT,
        failureCount: 2,
        maximumRetryCount: 1,
      },
      false,
    );

    expect(isSemanticActiveTrialStopped(stopped)).toBe(true);
    expect(stopped.operationalRetries.actorFailureCount).toBe(2);

    const resumedStop = stopSemanticOperationalStage(
      stopped,
      'actor',
      {
        category: 'timed-out',
        failedAt: '2026-09-20T12:00:03.000Z',
        failureCount: 2,
        maximumRetryCount: 1,
      },
      true,
    );
    expect(resumedStop.operationalRetries.actorFailureCount).toBe(3);
  });

  test('advances actor and judge boundaries without discarding completed evidence', () => {
    const actorEvidence = {
      actorExecutionEvidence: [],
      actorResourceEvidence: {
        commandCount: 0,
        maximumInvocationByteCount: 0,
        modelVisibleToolOutputByteCount: 0,
        operations: [],
        stdoutByteCount: 0,
      },
      actorStageIdentitySha256: SHA256,
      commandPolicyEvidence: {
        completedCommandCount: 0,
        credentialExposure: { observedCount: 0, reasons: [], status: 'not-observed' },
        maximumCommandOutputByteCount: 0,
        modelVisibleToolOutputByteCount: 0,
        moldeaCommandCount: 0,
        moldeaOutputByteCount: 0,
        networkAccess: {
          indeterminateCount: 0,
          observedCount: 0,
          reasons: [],
          status: 'not-observed',
        },
        sensitiveAccess: {
          indeterminateCount: 0,
          observedCount: 0,
          reasons: [],
          status: 'not-observed',
        },
      },
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      response: 'synthetic actor response',
      usage: null,
      workspaceChanges: { created: [], deleted: [], modified: [] },
    } satisfies ISemanticActiveTrialActorEvidence;
    const judgePending = attachSemanticActorEvidence(
      createSemanticActiveTrial(null, CREATED_AT),
      actorEvidence,
      RETRIED_AT,
    );
    const recordedTrial = {
      actorExecutionEvidence: [],
      actorResponse: actorEvidence.response,
      developerDirection: 'Synthetic direction.',
      operationalRetries: judgePending.operationalRetries,
      stageIdentities: { actorSha256: SHA256, judgeSha256: SHA256 },
      trial: {} as ISemanticRecordedTrial['trial'],
      workspaceChanges: actorEvidence.workspaceChanges,
    } satisfies ISemanticRecordedTrial;
    const complete = completeSemanticActiveTrial(judgePending, recordedTrial, STOPPED_AT);

    expect(complete.phase).toBe('trial-complete');
    expect(complete.actorEvidence).toStrictEqual(actorEvidence);
    expect(complete.recordedTrial).toStrictEqual(recordedTrial);
  });
});
