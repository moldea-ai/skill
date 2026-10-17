// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import type { ICodexEvaluationCommandPolicyEvidence } from '../../execution/host/index.ts';
import { ensureDirectory } from '../../filesystem/index.ts';

import { loadSemanticCases, type ISemanticCase } from '../cases/index.ts';
import {
  createSemanticActiveTrial,
  getSemanticCheckpointPath,
  loadSemanticReusableTrials,
  readSemanticCheckpoint,
  writeSemanticCheckpoint,
  type ISemanticCandidateCheckpoint,
  type ISemanticRecordedTrial,
} from '../recording/index.ts';

import {
  completeSemanticDiagnostic,
  executeSemanticCases,
  type ISemanticRunnerTrialExecutionOptions,
} from './runner.ts';

const SHA256 = 'a'.repeat(64);
const EMPTY_COMMAND_POLICY: ICodexEvaluationCommandPolicyEvidence = {
  completedCommandCount: 0,
  credentialExposure: { observedCount: 0, reasons: [], status: 'not-observed' },
  maximumCommandOutputByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  moldeaCommandCount: 0,
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
  gitInvocationEvidence: {
    invocationCount: 0,
    hostInvocationCount: 0,
    repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
  },
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
    jsonSchemaVersion: 5,
    name: '@moldea.ai/cli',
    packageLockSha256: SHA256,
    version: '9.0.0',
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
  test.each(['passed', 'recovered', 'failed'] as const)(
    'archives a completed %s diagnostic with all usage and confirmations before cleanup',
    async (outcome) => {
      const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-runner-'));
      temporaryRoots.push(repositoryRoot);
      const cases = [createCase('case-one')];
      const checkpoint = createCandidateCheckpoint(cases);
      checkpoint.attemptId = `sem-${outcome}`;
      checkpoint.mode = 'diagnostic';
      await writeSemanticCheckpoint(repositoryRoot, checkpoint);
      const results = await executeSemanticCases({
        cases,
        checkpoint,
        executeTrial: async ({ caseDefinition, confirmationIndex }) =>
          createRecordedTrial({
            caseDefinition,
            confirmationIndex,
            passed: outcome === 'passed' || (outcome === 'recovered' && confirmationIndex !== null),
          }),
        repositoryRoot,
        workerCount: 1,
      });
      expect(results[0]?.status).toBe(outcome);
      expect(results[0]?.trials).toHaveLength(outcome === 'passed' ? 1 : 3);
      const archivePath = await completeSemanticDiagnostic(repositoryRoot, checkpoint);
      expect(JSON.parse(await readFile(archivePath, 'utf8'))).toStrictEqual(checkpoint);
      expect(checkpoint.cases).toStrictEqual(results);
      expect(existsSync(getSemanticCheckpointPath(repositoryRoot))).toBe(false);
      expect(await loadSemanticReusableTrials(repositoryRoot)).toStrictEqual([]);

      // a cleanup interruption can be finalized again without replaying any paid stage
      await writeSemanticCheckpoint(repositoryRoot, checkpoint);
      const resumed = await executeSemanticCases({
        cases: [],
        checkpoint,
        executeTrial: async () => {
          throw new Error('A completed diagnostic must never call the model.');
        },
        repositoryRoot,
        workerCount: 1,
      });
      expect(resumed).toStrictEqual(results);
      expect(await completeSemanticDiagnostic(repositoryRoot, checkpoint)).toBe(archivePath);
      expect(JSON.parse(await readFile(archivePath, 'utf8'))).toStrictEqual(checkpoint);
    },
  );

  test('preserves the completed active checkpoint when diagnostic archival fails', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-runner-'));
    temporaryRoots.push(repositoryRoot);
    const caseDefinition = createCase('case-one');
    const checkpoint = createCandidateCheckpoint([caseDefinition]);
    checkpoint.attemptId = 'sem-write-failure';
    checkpoint.mode = 'diagnostic';
    checkpoint.cases = [
      {
        confirmationStatus: 'not-required',
        id: caseDefinition.id,
        status: 'passed',
        trials: [createRecordedTrial({ caseDefinition, confirmationIndex: null, passed: true })],
      },
    ];
    await writeSemanticCheckpoint(repositoryRoot, checkpoint);
    const blockedDirectory = path.join(repositoryRoot, '.evidence', 'semantic', 'diagnostics');
    await writeFile(blockedDirectory, 'existing non-directory');

    await expect(completeSemanticDiagnostic(repositoryRoot, checkpoint)).rejects.toThrow();
    expect(await readSemanticCheckpoint(repositoryRoot)).toStrictEqual(checkpoint);
    await rm(blockedDirectory);
    await ensureDirectory(blockedDirectory);
    const archivePath = await completeSemanticDiagnostic(repositoryRoot, checkpoint);
    expect(JSON.parse(await readFile(archivePath, 'utf8'))).toStrictEqual(checkpoint);
    expect(existsSync(getSemanticCheckpointPath(repositoryRoot))).toBe(false);
  });

  test('preflight constructs prompts for every discovered case before model execution', async () => {
    const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
    const cases = await loadSemanticCases(path.join(repositoryRoot, 'src', 'semantic', 'cases'));
    const output = execFileSync(
      process.execPath,
      [path.join(repositoryRoot, 'src', 'semantic', 'command-line', 'runner.ts'), '--preflight'],
      { cwd: repositoryRoot, encoding: 'utf8' },
    );

    expect(JSON.parse(output)).toMatchObject({ caseCount: cases.length });
  });

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
