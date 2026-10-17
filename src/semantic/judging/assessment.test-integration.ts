// @vitest-environment node
import { expect, test } from 'vitest';

import { runCodexEvaluationOperationalStage } from '../../execution/host/index.ts';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';
import { defineSemanticCase, createSemanticCaseDefinitionDigest } from '../cases/index.ts';
import {
  appendSemanticOperationalRetry,
  createSemanticActiveTrial,
  createSemanticTokenAdmissionController,
  getSemanticCandidatePaidTokenCount,
  stopSemanticOperationalStage,
  type ISemanticCaseCheckpoint,
} from '../recording/index.ts';

import { assessSemanticJudgeOutput } from './assessment.ts';

const definition = defineSemanticCase({
  id: 'malformed-judge-accounting',
  coverageClaimIds: ['synthetic'],
  expected: [{ label: 'grounded', criterion: 'Grounded answer.' }],
  forbidden: [{ label: 'invented', criterion: 'Invented facts.' }],
  operation: 'explain',
  scenario: 'Judge output retry accounting.',
  input: { developerDirection: 'Explain.', repositoryEvidence: [] },
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
});

test.each([false, true])(
  'malformed judge responses are charged before retry; exhaustion=%s',
  async (exhausted) => {
    const checkpoint: ISemanticCaseCheckpoint = {
      activeTrial: {
        ...createSemanticActiveTrial(null, '2026-10-15T00:00:00Z'),
        phase: 'judge-pending',
      },
      caseDefinitionDigest: createSemanticCaseDefinitionDigest(definition),
      caseId: definition.id,
      completedCase: null,
      trials: [],
    };
    const consumed = () => getSemanticCandidatePaidTokenCount([], { [definition.id]: checkpoint });
    const admission = createSemanticTokenAdmissionController({ getConsumedTokenCount: consumed });
    let calls = 0;
    const charges: number[] = [];
    const execution = runCodexEvaluationOperationalStage({
      maximumRetryCount: 1,
      wait: async () => {},
      onRetry: async (retry) => {
        checkpoint.activeTrial = appendSemanticOperationalRetry(
          checkpoint.activeTrial!,
          'judge',
          retry,
        );
        charges.push(consumed());
        await admission.release(definition.id);
      },
      onExhausted: async (failure) => {
        checkpoint.activeTrial = stopSemanticOperationalStage(
          checkpoint.activeTrial!,
          'judge',
          failure,
          false,
        );
        charges.push(consumed());
        await admission.release(definition.id);
      },
      operation: async () => {
        await admission.reserve(definition.id);
        calls += 1;
        return assessSemanticJudgeOutput(
          definition,
          exhausted || calls === 1
            ? '{"expected":{}}'
            : '{"expected":{"grounded":true},"forbidden":{"invented":false},"rationale":"Grounded."}',
        );
      },
    });
    if (exhausted) {
      await expect(execution).rejects.toThrow('exhausted 1 operational retry');
      expect(checkpoint.activeTrial?.operationalRetries.lastFailure?.isExhausted).toBe(true);
      expect(charges).toStrictEqual(
        [1, 2].map((count) => count * MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount),
      );
    } else {
      await expect(execution).resolves.toMatchObject({ isPassed: true });
      await admission.release(definition.id);
      expect(charges).toStrictEqual([MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount]);
    }
    expect(calls).toBe(2);
    expect(checkpoint.trials).toStrictEqual([]);
    expect(checkpoint.completedCase).toBeNull();
  },
);
