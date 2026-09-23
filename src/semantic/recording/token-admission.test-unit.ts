// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';
import {
  createSemanticTokenAdmissionController,
  getSemanticCandidatePaidTokenCount,
  SEMANTIC_CANDIDATE_TOKEN_LIMIT,
} from './token-admission.ts';
import type { ISemanticCaseCheckpoint, ISemanticRecordedCase } from './types.ts';

const createChargedCase = (executionOrigin: 'executed' | 'reused'): ISemanticRecordedCase =>
  ({
    trials: [
      {
        operationalRetries: {
          actorFailureCount: 1,
          judgeFailureCount: 0,
          lastFailure: null,
        },
        trial: {
          actorUsage: { cachedInputTokens: 50, inputTokens: 100, outputTokens: 25 },
          executionOrigin,
          judgeUsage: { cachedInputTokens: 25, inputTokens: 80, outputTokens: 20 },
        },
      },
    ],
  }) as ISemanticRecordedCase;

describe('semantic token admission', () => {
  test('charges direct usage and failed calls while reused trials remain free', () => {
    expect(
      getSemanticCandidatePaidTokenCount(
        [createChargedCase('executed'), createChargedCase('reused')],
        {},
      ),
    ).toBe(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount + 225);
  });

  test('counts durable actor work retained at a judge boundary', () => {
    const checkpoint = {
      activeTrial: {
        actorEvidence: {
          actorExecutionEvidence: [],
          actorResourceEvidence: {
            commandCount: 0,
            maximumInvocationByteCount: 0,
            modelVisibleToolOutputByteCount: 0,
            operations: [],
            stdoutByteCount: 0,
          },
          actorStageIdentitySha256: 'a'.repeat(64),
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
          usage: { cachedInputTokens: 20, inputTokens: 100, outputTokens: 25 },
          workspaceChanges: { created: [], deleted: [], modified: [] },
        },
        confirmationIndex: null,
        operationalRetries: {
          actorFailureCount: 1,
          judgeFailureCount: 0,
          lastFailure: null,
        },
        phase: 'judge-pending',
        recordedTrial: null,
        startedAt: '2026-09-20T12:00:00.000Z',
        updatedAt: '2026-09-20T12:00:01.000Z',
      },
      caseDefinitionDigest: 'b'.repeat(64),
      caseId: 'case',
      completedCase: null,
      trials: [],
    } satisfies ISemanticCaseCheckpoint;

    expect(getSemanticCandidatePaidTokenCount([], { case: checkpoint })).toBe(
      MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount + 125,
    );
  });

  test('prevents concurrent reservations from exceeding the candidate stop-loss', async () => {
    const stageMaximum = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount;
    const controller = createSemanticTokenAdmissionController({
      getConsumedTokenCount: () => SEMANTIC_CANDIDATE_TOKEN_LIMIT - stageMaximum * 2,
    });

    await controller.reserve('case-one');
    await controller.reserve('case-two');
    await expect(controller.reserve('case-three')).rejects.toThrow(/stopped before a paid stage/u);
    await controller.release('case-one');
    await expect(controller.reserve('case-three')).resolves.toBeUndefined();
  });
});
