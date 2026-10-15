// @vitest-environment node
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { createEvidenceBundle, storeCompletedEvidenceRun } from '../../evidence/index.ts';
import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from '../../release/index.ts';
import type { ICodexEvaluationCommandPolicyEvidence } from '../../execution/host/index.ts';
import { createSemanticActiveTrial } from './active-trial.ts';
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
  status: 'failed' | 'passed' | 'recovered' = trials.every(({ trial }) => trial.passed)
    ? 'passed'
    : 'failed',
  evaluationProtocolVersion = SEMANTIC_EVALUATION_PROTOCOL_VERSION,
): Promise<void> => {
  const evidenceRecord = {
    cases: [
      {
        confirmationStatus:
          status === 'recovered'
            ? ('passed' as const)
            : status === 'passed'
              ? ('not-required' as const)
              : ('not-applicable' as const),
        id: 'case-one',
        status,
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
          attempts: [
            {
              result: {
                attemptId,
                evidence: { evaluationProtocolVersion, sha256: evidenceSha256 },
              },
            },
          ],
        },
      },
      run: {
        attemptId,
        evaluatedAt: '2026-09-20T00:00:00.000Z',
        provenance: {},
        status: status === 'recovered' ? 'passed' : status,
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
  test('loads resolved case trials and selects the newest exact actor/judge pair', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-reuse-'));
    temporaryRoots.push(repositoryRoot);
    await storeRun(repositoryRoot, 'sem-20260920-a', [createRecordedTrial(false)]);
    await storeRun(repositoryRoot, 'sem-20260920-b', [createRecordedTrial(true)]);

    const candidates = await loadSemanticReusableTrials(repositoryRoot);

    expect(candidates).toHaveLength(2);
    expect(candidates[0]?.sourceAttemptId).toBe('sem-20260920-b');
    expect(
      selectSemanticReusableTrial({
        activeTrial: null,
        actorIdentitySha256: SHA256,
        candidates,
        caseId: 'case-one',
        confirmationIndex: null,
        judgeIdentitySha256: () => 'b'.repeat(64),
      })?.sourceAttemptId,
    ).toBe('sem-20260920-b');
    expect(
      selectSemanticReusableTrial({
        activeTrial: null,
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

test('reuses a recovered case including its failed initial and exact passing confirmations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-recovered-reuse-'));
  temporaryRoots.push(root);
  const initial = createRecordedTrial(false);
  initial.trial.confirmationEligible = true;
  const confirmations = [1, 2].map((index) => {
    const trial = createRecordedTrial(true);
    trial.trial.confirmationIndex = index as 1 | 2;
    trial.trial.kind = 'confirmation';
    return trial;
  });
  await storeRun(root, 'sem-20260921-recovered', [initial, ...confirmations], 'recovered');
  const candidates = await loadSemanticReusableTrials(root);
  expect(candidates).toHaveLength(3);
  for (const confirmationIndex of [null, 1, 2] as const) {
    const selected = selectSemanticReusableTrial({
      activeTrial: null,
      actorIdentitySha256: SHA256,
      candidates,
      caseId: 'case-one',
      confirmationIndex,
      judgeIdentitySha256: () => 'b'.repeat(64),
    });
    expect(selected?.sourceCaseStatus).toBe('recovered');
    expect(selected?.recordedTrial.trial.passed).toBe(confirmationIndex !== null);
  }
});

test('refuses an unchanged failed case even when an older passing trial exists', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-failed-reuse-'));
  temporaryRoots.push(root);
  await storeRun(root, 'sem-20260920-pass', [createRecordedTrial(true)]);
  await storeRun(root, 'sem-20260921-fail', [createRecordedTrial(false)]);
  const candidates = await loadSemanticReusableTrials(root);
  expect(() =>
    selectSemanticReusableTrial({
      activeTrial: null,
      actorIdentitySha256: SHA256,
      candidates,
      caseId: 'case-one',
      confirmationIndex: null,
      judgeIdentitySha256: () => 'b'.repeat(64),
    }),
  ).toThrow('An unchanged failed semantic case cannot be rerun');
  expect(
    selectSemanticReusableTrial({
      activeTrial: null,
      actorIdentitySha256: 'c'.repeat(64),
      candidates,
      caseId: 'case-one',
      confirmationIndex: null,
      judgeIdentitySha256: () => 'd'.repeat(64),
    }),
  ).toBeNull();
});

test('a reviewed passing initial remains reusable with retained historical confirmations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-reviewed-reuse-'));
  temporaryRoots.push(root);
  const confirmations = [1, 2].map((index) => {
    const trial = createRecordedTrial(false);
    trial.trial.kind = 'confirmation';
    trial.trial.confirmationIndex = index as 1 | 2;
    return trial;
  });
  await storeRun(
    root,
    'sem-20260922-reviewed',
    [createRecordedTrial(true), ...confirmations],
    'passed',
  );
  const candidates = await loadSemanticReusableTrials(root);
  expect(candidates).toHaveLength(1);
  expect(candidates[0]?.recordedTrial.trial.passed).toBe(true);
  expect(candidates[0]?.recordedTrial.trial.confirmationIndex).toBeNull();
});

test('incompatible grading contracts are not reuse inputs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-protocol-reuse-'));
  temporaryRoots.push(root);
  await storeRun(
    root,
    'sem-20260923-incompatible',
    [createRecordedTrial(true)],
    'passed',
    SEMANTIC_EVALUATION_PROTOCOL_VERSION + 1,
  );
  expect(await loadSemanticReusableTrials(root)).toStrictEqual([]);
});

test.each([false, true])(
  'pending resume preserves unchanged-failure stop and does not substitute a cached pass: %s',
  async (passed) => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-resume-reuse-'));
    temporaryRoots.push(root);
    await storeRun(root, 'sem-20260924-resume', [createRecordedTrial(passed)]);
    const options = {
      activeTrial: createSemanticActiveTrial(null, '2026-10-15T00:00:00Z'),
      actorIdentitySha256: SHA256,
      candidates: await loadSemanticReusableTrials(root),
      caseId: 'case-one',
      confirmationIndex: null,
      judgeIdentitySha256: () => 'b'.repeat(64),
    };
    if (passed) expect(selectSemanticReusableTrial(options)).toBeNull();
    else
      expect(() => selectSemanticReusableTrial(options)).toThrow(
        'An unchanged failed semantic case cannot be rerun',
      );
  },
);
