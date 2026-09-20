// @vitest-environment node
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import type { ICodexEvaluationCommandPolicyEvidence } from '../../execution/host/index.ts';

import type { ISemanticCase } from '../cases/index.ts';
import {
  createSemanticActiveTrial,
  getSemanticCheckpointPath,
  readSemanticCheckpoint,
  writeSemanticCheckpoint,
  type ISemanticCandidateCheckpoint,
  type ISemanticRecordedTrial,
} from '../recording/index.ts';

import { executeSemanticCases, type ISemanticRunnerTrialExecutionOptions } from './runner.ts';

const SHA256 = 'a'.repeat(64);
const EMPTY_COMMAND_POLICY: ICodexEvaluationCommandPolicyEvidence = {
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

const createCase = (id: string): ISemanticCase => ({
  coverageClaimIds: [`${id}-claim`],
  expected: [{ criterion: 'Expected behavior.', label: 'expected' }],
  forbidden: [{ criterion: 'Forbidden behavior.', label: 'forbidden' }],
  id,
  input: {
    developerDirection: `Evaluate ${id}.`,
    repositoryEvidence: [],
  },
  operation: 'evaluate',
  resourceBudget: {
    activation: 'direct',
    maximumMoldeaCommands: 1,
    maximumMoldeaOutputBytes: 1_024,
    minimumMoldeaCommands: 0,
  },
  scenario: `Scenario for ${id}.`,
});

const createRecordedTrial = (options: {
  caseDefinition: ISemanticCase;
  confirmationIndex: 1 | 2 | 3 | null;
  passed: boolean;
}): ISemanticRecordedTrial => ({
  actorExecutionEvidence: [],
  actorResponse: 'Synthetic actor response.',
  developerDirection: options.caseDefinition.input.developerDirection,
  operationalRetries: {
    actorFailureCount: 0,
    judgeFailureCount: 0,
    lastFailure: null,
  },
  stageIdentities: { actorSha256: SHA256, judgeSha256: 'b'.repeat(64) },
  trial: {
    actorCommandPolicyEvidence: EMPTY_COMMAND_POLICY,
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
    actorUsage: { cachedInputTokens: 0, inputTokens: 1, outputTokens: 1 },
    confirmationEligible: options.confirmationIndex === null && !options.passed,
    confirmationIndex: options.confirmationIndex,
    dimensions: {
      commandPolicy: true,
      mountIntegrity: true,
      operational: true,
      repositoryControl: true,
      resource: true,
      semantic: options.passed,
    },
    evaluatedAt: '2026-09-20T00:00:00.000Z',
    executionOrigin: 'executed',
    failureClassifications: options.passed ? [] : ['semantic'],
    forbidden: [],
    judgeCommandPolicyEvidence: EMPTY_COMMAND_POLICY,
    judgeHost: {
      developerInstructionsSha256: SHA256,
      model: 'synthetic-model',
      name: 'synthetic-host',
      reasoningEffort: 'high',
      role: 'judge',
      version: '1.0.0',
    },
    judgeUsage: { cachedInputTokens: 0, inputTokens: 1, outputTokens: 1 },
    kind: options.confirmationIndex === null ? 'initial' : 'confirmation',
    observed: options.passed ? ['expected'] : [],
    passed: options.passed,
    rationale: options.passed ? 'Passed.' : 'Failed.',
    stageReuse: null,
  },
  workspaceChanges: { created: [], deleted: [], modified: [] },
});

const createCandidateCheckpoint = (cases: ISemanticCase[]): ISemanticCandidateCheckpoint => ({
  actorHost: {
    developerInstructionsSha256: SHA256,
    model: 'synthetic-model',
    name: 'synthetic-host',
    reasoningEffort: 'high',
    role: 'actor',
    version: '1.0.0',
  },
  artifactDigest: SHA256,
  attemptId: 'semantic-attempt',
  caseCheckpoints: {},
  cases: [],
  caseSuiteDigest: SHA256,
  cli: {
    integrity: 'sha512-synthetic',
    jsonSchemaVersion: 4,
    name: '@moldea.ai/cli',
    packageLockSha256: SHA256,
    version: '8.0.0',
  },
  coverageDigest: SHA256,
  createdAt: '2026-09-20T00:00:00.000Z',
  judgeHost: {
    developerInstructionsSha256: SHA256,
    model: 'synthetic-model',
    name: 'synthetic-host',
    reasoningEffort: 'high',
    role: 'judge',
    version: '1.0.0',
  },
  mode: 'official',
  schemaVersion: 2,
  selectedCaseIds: cases.map(({ id }) => id),
  updatedAt: '2026-09-20T00:00:00.000Z',
});

const createDeferred = (): { promise: Promise<void>; resolve: () => void } => {
  let resolve = (): void => {};
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('semantic runner case orchestration', () => {
  test('round trips interrupted confirmation progress and resumes without replay', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-runner-'));
    temporaryRoots.push(repositoryRoot);
    const cases = [createCase('case-one'), createCase('case-two')];
    const checkpoint = createCandidateCheckpoint(cases);
    const executionLog: string[] = [];
    let shouldInterrupt = true;
    await writeSemanticCheckpoint(repositoryRoot, checkpoint);

    const executeTrial = async (
      options: ISemanticRunnerTrialExecutionOptions,
    ): Promise<ISemanticRecordedTrial> => {
      const trialId = `${options.caseDefinition.id}:${String(options.confirmationIndex)}`;
      executionLog.push(trialId);
      const activeTrial =
        options.activeTrial ??
        createSemanticActiveTrial(options.confirmationIndex, '2026-09-20T00:01:00.000Z');
      await options.persistActiveTrial(activeTrial);
      if (
        shouldInterrupt &&
        options.caseDefinition.id === 'case-two' &&
        options.confirmationIndex === 2
      ) {
        throw new Error('Synthetic interruption.');
      }
      return createRecordedTrial({
        caseDefinition: options.caseDefinition,
        confirmationIndex: options.confirmationIndex,
        passed: options.confirmationIndex !== null,
      });
    };

    await expect(
      executeSemanticCases({
        cases,
        checkpoint,
        executeTrial,
        repositoryRoot,
        workerCount: 1,
      }),
    ).rejects.toThrow('Synthetic interruption.');

    const interruptedCheckpoint = await readSemanticCheckpoint(repositoryRoot);
    expect(interruptedCheckpoint.cases.map(({ id }) => id)).toStrictEqual(['case-one']);
    expect(interruptedCheckpoint.caseCheckpoints['case-two']?.trials).toHaveLength(2);
    expect(
      interruptedCheckpoint.caseCheckpoints['case-two']?.trials.map(
        ({ trial }) => trial.confirmationIndex,
      ),
    ).toStrictEqual([null, 1]);
    expect(interruptedCheckpoint.caseCheckpoints['case-two']?.activeTrial?.confirmationIndex).toBe(
      2,
    );
    expect(interruptedCheckpoint.cases[0]?.trials[0]?.trial.confirmationIndex).toBeNull();
    expect(
      interruptedCheckpoint.caseCheckpoints['case-two']?.trials[0]?.trial.confirmationIndex,
    ).toBeNull();

    executionLog.length = 0;
    shouldInterrupt = false;
    const resumedCheckpoint = await readSemanticCheckpoint(repositoryRoot);
    const results = await executeSemanticCases({
      cases: cases.slice(resumedCheckpoint.cases.length),
      checkpoint: resumedCheckpoint,
      executeTrial,
      repositoryRoot,
      workerCount: 1,
    });

    expect(executionLog).toStrictEqual(['case-two:2']);
    expect(results.map(({ id, status }) => ({ id, status }))).toStrictEqual([
      { id: 'case-one', status: 'recovered' },
      { id: 'case-two', status: 'recovered' },
    ]);
    const completedCheckpoint = await readSemanticCheckpoint(repositoryRoot);
    expect(completedCheckpoint.caseCheckpoints).toStrictEqual({});
    expect(completedCheckpoint.cases.map(({ id }) => id)).toStrictEqual(['case-one', 'case-two']);
  });

  test('runs targeted cases without creating checkpoint state', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-runner-'));
    temporaryRoots.push(repositoryRoot);
    const caseDefinition = createCase('case-one');

    const results = await executeSemanticCases({
      cases: [caseDefinition],
      checkpoint: null,
      executeTrial: async ({ confirmationIndex }) =>
        createRecordedTrial({ caseDefinition, confirmationIndex, passed: true }),
      repositoryRoot,
      workerCount: 1,
    });

    expect(results).toMatchObject([
      { confirmationStatus: 'not-required', id: 'case-one', status: 'passed' },
    ]);
    expect(existsSync(getSemanticCheckpointPath(repositoryRoot))).toBe(false);
  });

  test('commits concurrently resolved cases in selected order', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-runner-'));
    temporaryRoots.push(repositoryRoot);
    const cases = [createCase('case-one'), createCase('case-two')];
    const checkpoint = createCandidateCheckpoint(cases);
    const firstCaseConfirmation = createDeferred();
    const executionLog: string[] = [];
    await writeSemanticCheckpoint(repositoryRoot, checkpoint);

    const execution = executeSemanticCases({
      cases,
      checkpoint,
      executeTrial: async ({ caseDefinition, confirmationIndex }) => {
        const trialId = `${caseDefinition.id}:${String(confirmationIndex)}`;
        executionLog.push(trialId);
        if (caseDefinition.id === 'case-one' && confirmationIndex === 1) {
          await firstCaseConfirmation.promise;
        }
        return createRecordedTrial({
          caseDefinition,
          confirmationIndex,
          passed: confirmationIndex !== null,
        });
      },
      repositoryRoot,
      workerCount: 2,
    });

    await expect.poll(() => executionLog.includes('case-two:2')).toBe(true);
    expect(executionLog).not.toContain('case-one:2');
    firstCaseConfirmation.resolve();

    await expect(execution).resolves.toMatchObject([
      { id: 'case-one', status: 'recovered' },
      { id: 'case-two', status: 'recovered' },
    ]);
    const completedCheckpoint = await readSemanticCheckpoint(repositoryRoot);
    expect(completedCheckpoint.cases.map(({ id }) => id)).toStrictEqual(['case-one', 'case-two']);
  });
});
