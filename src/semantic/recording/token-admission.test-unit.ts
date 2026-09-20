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
        actorEvidence: { usage: { cachedInputTokens: 20, inputTokens: 100, outputTokens: 25 } },
        operationalRetries: {
          actorFailureCount: 1,
          judgeFailureCount: 0,
        },
        phase: 'judge-pending',
      },
      trials: [],
    } as ISemanticCaseCheckpoint;

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
