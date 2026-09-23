// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { createEvidenceBundle, storeCompletedEvidenceRun } from '../../evidence/index.ts';
import type { ICodexEvaluationCommandPolicyEvidence } from '../../execution/host/index.ts';
import { loadSemanticReusableTrials, selectSemanticReusableTrial } from './reuse.ts';
import type { ISemanticRecordedTrial } from './types.ts';

const SHA256 = 'a'.repeat(64);
const emptyCommandPolicy: ICodexEvaluationCommandPolicyEvidence = {
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
};
const temporaryRoots: string[] = [];

const createRecordedTrial = (passed: boolean): ISemanticRecordedTrial => ({
  actorExecutionEvidence: [],
  actorResponse: 'Recorded actor response.',
  developerDirection: 'Inspect the recorded repository.',
  operationalRetries: {
    actorFailureCount: 0,
    judgeFailureCount: 0,
    lastFailure: null,
  },
  stageIdentities: { actorSha256: SHA256, judgeSha256: 'b'.repeat(64) },
  trial: {
    actorCommandPolicyEvidence: emptyCommandPolicy,
    actorResourceEvidence: {
      commandCount: 0,
      maximumInvocationByteCount: 0,
      modelVisibleToolOutputByteCount: 0,
      operations: [],
      stdoutByteCount: 0,
    },
    actorHost: {
      developerInstructionsSha256: SHA256,
      model: 'synthetic-model',
      name: 'synthetic-host',
      reasoningEffort: 'high',
      role: 'actor',
      version: '1.0.0',
    },
    actorUsage: { cachedInputTokens: 0, inputTokens: 100, outputTokens: 20 },
    confirmationEligible: false,
    confirmationIndex: null,
    dimensions: {
      commandPolicy: true,
      mountIntegrity: true,
      operational: true,
      repositoryControl: true,
      resource: true,
      semantic: passed,
    },
    evaluatedAt: '2026-09-20T00:00:00.000Z',
    executionOrigin: 'executed',
    failureClassifications: passed ? [] : ['semantic'],
    forbidden: [],
    judgeCommandPolicyEvidence: emptyCommandPolicy,
    judgeHost: {
      developerInstructionsSha256: SHA256,
      model: 'synthetic-model',
      name: 'synthetic-host',
      reasoningEffort: 'high',
      role: 'judge',
      version: '1.0.0',
    },
    judgeUsage: { cachedInputTokens: 0, inputTokens: 80, outputTokens: 10 },
    kind: 'initial',
    observed: passed ? ['expected'] : [],
    passed,
    rationale: passed ? 'Passed.' : 'Failed.',
    stageReuse: null,
  },
  workspaceChanges: { created: [], deleted: [], modified: [] },
});

const storeRun = async (
  repositoryRoot: string,
  attemptId: string,
  trials: ISemanticRecordedTrial[],
): Promise<void> => {
  const evidenceRecord = {
    cases: [
      {
        confirmationStatus: trials.every(({ trial }) => trial.passed)
          ? ('not-required' as const)
          : ('not-applicable' as const),
        id: 'case-one',
        status: trials.every(({ trial }) => trial.passed)
          ? ('passed' as const)
          : ('failed' as const),
        trials,
      },
    ],
    schemaVersion: 11,
  };
  const evidenceSha256 = createHash('sha256')
    .update(`${JSON.stringify(evidenceRecord)}\n`)
    .digest('hex');
  await storeCompletedEvidenceRun(
    repositoryRoot,
    createEvidenceBundle({
      artifacts: [
        {
          content: Buffer.from(`${JSON.stringify(evidenceRecord, null, 2)}\n`),
          mediaType: 'application/json',
          path: `.evidence/semantic/results/attempts/${attemptId}/evidence.json`,
        },
      ],
      classification: 'official',
      kind: 'semantic',
      payload: {
        websiteModel: {
          cli: { jsonSchemaVersion: 3, version: '6.0.0' },
          attempts: [{ result: { attemptId, evidence: { sha256: evidenceSha256 } } }],
        },
      },
      run: {
        attemptId,
        evaluatedAt: '2026-09-20T00:00:00.000Z',
        provenance: {},
        status: trials.every(({ trial }) => trial.passed) ? 'passed' : 'failed',
        version: '1.0.0',
      },
    }),
  );
};

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('semantic local stage reuse', () => {
  test('loads only passing trials and selects an exact actor/judge pair', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-reuse-'));
    temporaryRoots.push(repositoryRoot);
    await storeRun(repositoryRoot, 'sem-20260920-a', [createRecordedTrial(false)]);
    await storeRun(repositoryRoot, 'sem-20260920-b', [createRecordedTrial(true)]);

    const candidates = await loadSemanticReusableTrials(repositoryRoot);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.sourceAttemptId).toBe('sem-20260920-b');
    expect(
      selectSemanticReusableTrial({
        actorIdentitySha256: SHA256,
        candidates,
        caseId: 'case-one',
        confirmationIndex: null,
        judgeIdentitySha256: () => 'b'.repeat(64),
      })?.sourceAttemptId,
    ).toBe('sem-20260920-b');
    expect(
      selectSemanticReusableTrial({
        actorIdentitySha256: SHA256,
        candidates,
        caseId: 'case-one',
        confirmationIndex: null,
        judgeIdentitySha256: () => 'c'.repeat(64),
      }),
    ).toBeNull();
  });

  test('returns no candidates before any local semantic run exists', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-reuse-'));
    temporaryRoots.push(repositoryRoot);

    await expect(loadSemanticReusableTrials(repositoryRoot)).resolves.toStrictEqual([]);
  });
});
