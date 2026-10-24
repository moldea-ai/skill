// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';
import {
  createSemanticTokenAdmissionController,
  getSemanticCandidatePaidTokenCount,
  SEMANTIC_CANDIDATE_TOKEN_LIMIT,
} from './token-admission.ts';
import type { ISemanticCaseCheckpoint, ISemanticRecordedCase } from './types.ts';

const createChargedCase = (
  executionOrigin: 'carried' | 'executed' | 'reused',
): ISemanticRecordedCase =>
  ({
    trials: [
      {
        paidInvocations: [
          { stage: 'actor', usage: null },
          { stage: 'actor', usage: { cachedInputTokens: 50, inputTokens: 100, outputTokens: 25 } },
          { stage: 'judge', usage: { cachedInputTokens: 25, inputTokens: 80, outputTokens: 20 } },
        ],
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
  test('enforces a lowered ceiling across concurrent reservations and retained charges', () => {
    const allowance = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount;
    let consumed = 100;
    const controller = createSemanticTokenAdmissionController({
      getConsumedTokenCount: () => consumed,
      tokenLimit: allowance * 2 + 100,
    });
    controller.reserve('one');
    controller.reserve('two');
    expect(() => controller.reserve('three')).toThrow(`${allowance * 2 + 100} maximum.`);
    consumed += allowance;
    controller.release('one');
    expect(() => controller.reserve('three')).toThrow(/stopped before a paid stage/u);
    controller.release('two');
    controller.reserve('three');
    controller.release('three');
  });

  test.each([
    0,
    -1,
    1.5,
    Infinity,
    NaN,
    Number.MAX_SAFE_INTEGER + 1,
    SEMANTIC_CANDIDATE_TOKEN_LIMIT + 1,
  ])('rejects an invalid or raised token limit %s', (tokenLimit) => {
    expect(() =>
      createSemanticTokenAdmissionController({ getConsumedTokenCount: () => 0, tokenLimit }),
    ).toThrow(/token limit/u);
  });

  test('documents the current candidate admission ceiling', () => {
    const documentation = readFileSync(
      new URL('../../../docs/semantic-evaluation.md', import.meta.url),
      'utf8',
    );

    expect(documentation).toContain(
      `the ${SEMANTIC_CANDIDATE_TOKEN_LIMIT.toLocaleString('en-US')}-token admission ceiling`,
    );
  });

  test('charges direct usage and failed calls while reused and carried trials remain free', () => {
    expect(
      getSemanticCandidatePaidTokenCount(
        [createChargedCase('executed'), createChargedCase('reused'), createChargedCase('carried')],
        {},
      ),
    ).toBe(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount + 225);
  });

  test('counts durable actor work retained at a judge boundary', () => {
    const checkpoint = {
      activeTrial: {
        actorCycles: [],
        paidInvocations: [
          { stage: 'actor', usage: null },
          { stage: 'actor', usage: { cachedInputTokens: 20, inputTokens: 100, outputTokens: 25 } },
        ],
        actorEvidence: {
          cycles: [],
          gitInvocationEvidence: {
            invocationCount: 0,
            hostInvocationCount: 0,
            repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
          },
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
            commandOwnership: {
              canonical: { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
              cli: { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
              helper: { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
              project: { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
              source: { commandCount: 0, maximumOutputByteCount: 0, outputByteCount: 0 },
            },
            completedCommandCount: 0,
            credentialExposure: { observedCount: 0, reasons: [], status: 'not-observed' },
            maximumCommandOutputByteCount: 0,
            modelVisibleToolOutputByteCount: 0,
            moldeaCommandCount: 0,
            moldeaEvents: [],
            moldeaLauncherMissReasons: [],
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

  test('prevents concurrent reservations from exceeding the candidate stop-loss', () => {
    const stageMaximum = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount;
    const controller = createSemanticTokenAdmissionController({
      getConsumedTokenCount: () => SEMANTIC_CANDIDATE_TOKEN_LIMIT - stageMaximum * 2,
    });

    controller.reserve('case-one');
    controller.reserve('case-two');
    expect(() => controller.reserve('case-three')).toThrow(/stopped before a paid stage/u);
    controller.release('case-one');
    expect(() => controller.reserve('case-three')).not.toThrow();
  });

  test('admits a stage after the former 32-million-token ceiling', () => {
    const controller = createSemanticTokenAdmissionController({
      getConsumedTokenCount: () => 32_000_000,
    });

    expect(() => controller.reserve('continued-case')).not.toThrow();
    controller.release('continued-case');
  });

  test('resumes the stopped recording while retaining its consumed tokens', () => {
    const controller = createSemanticTokenAdmissionController({
      getConsumedTokenCount: () => 62_785_381,
    });

    expect(() => controller.reserve('pending-judge')).not.toThrow();
    controller.release('pending-judge');
  });
});
