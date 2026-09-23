// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { createSemanticCaseDefinitionDigest, type ISemanticCase } from '../cases/index.ts';
import {
  createSemanticActiveTrial,
  type ISemanticCaseCheckpoint,
  type ISemanticRecordedCase,
  type ISemanticRecordedTrial,
} from '../recording/index.ts';

import { runSemanticCaseExecution } from './case-execution.ts';

const SHA256 = 'a'.repeat(64);
const EMPTY_COMMAND_POLICY: ISemanticRecordedTrial['trial']['actorCommandPolicyEvidence'] = {
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
  confirmationEligible: boolean;
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
    confirmationEligible: options.confirmationEligible,
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

const createCaseCheckpoint = (
  caseDefinition: ISemanticCase,
  trials: ISemanticRecordedTrial[],
  completedCase: ISemanticRecordedCase | null = null,
): ISemanticCaseCheckpoint => ({
  activeTrial: null,
  caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
  caseId: caseDefinition.id,
  completedCase,
  trials,
});

const createDeferred = (): { promise: Promise<void>; resolve: () => void } => {
  let resolve = (): void => {};
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const createCheckpointStore = (initialCheckpoints: ISemanticCaseCheckpoint[] = []) => {
  const checkpoints = new Map(
    initialCheckpoints.map((checkpoint) => [checkpoint.caseId, structuredClone(checkpoint)]),
  );
  return {
    checkpoints,
    getCaseCheckpoint: (caseId: string) => checkpoints.get(caseId) ?? null,
    persistCaseCheckpoint: async (checkpoint: ISemanticCaseCheckpoint) => {
      checkpoints.set(checkpoint.caseId, structuredClone(checkpoint));
    },
  };
};

describe('semantic case execution', () => {
  test('completes every concurrent initial before starting confirmations', async () => {
    const cases = ['case-one', 'case-two', 'case-three', 'case-four'].map(createCase);
    const initialGates = new Map(cases.map(({ id }) => [id, createDeferred()]));
    const initialStarts: string[] = [];
    const confirmationStarts: string[] = [];
    const store = createCheckpointStore();

    const execution = runSemanticCaseExecution({
      cases,
      commitCase: async () => {},
      executeTrial: async ({ caseDefinition, confirmationIndex }) => {
        if (confirmationIndex === null) {
          initialStarts.push(caseDefinition.id);
          await initialGates.get(caseDefinition.id)?.promise;
          return createRecordedTrial({
            caseDefinition,
            confirmationEligible: true,
            confirmationIndex,
            passed: false,
          });
        }
        confirmationStarts.push(`${caseDefinition.id}:${confirmationIndex}`);
        return createRecordedTrial({
          caseDefinition,
          confirmationEligible: true,
          confirmationIndex,
          passed: true,
        });
      },
      getCaseCheckpoint: store.getCaseCheckpoint,
      persistCaseCheckpoint: store.persistCaseCheckpoint,
      workerCount: 4,
    });

    await expect.poll(() => initialStarts.length).toBe(4);
    initialGates.get('case-one')?.resolve();
    initialGates.get('case-two')?.resolve();
    initialGates.get('case-three')?.resolve();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(confirmationStarts).toStrictEqual([]);

    initialGates.get('case-four')?.resolve();
    const results = await execution;

    expect(results.map(({ id, status }) => ({ id, status }))).toStrictEqual(
      cases.map(({ id }) => ({ id, status: 'recovered' })),
    );
    expect(confirmationStarts).toHaveLength(8);
  });

  test('bounds concurrent work in both phases', async () => {
    const cases = ['case-one', 'case-two', 'case-three', 'case-four'].map(createCase);
    const store = createCheckpointStore();
    const activeCounts = { confirmation: 0, initial: 0 };
    const maximumActiveCounts = { confirmation: 0, initial: 0 };
    const activeConfirmationCases = new Set<string>();

    await runSemanticCaseExecution({
      cases,
      commitCase: async () => {},
      executeTrial: async ({ caseDefinition, confirmationIndex }) => {
        const phase = confirmationIndex === null ? 'initial' : 'confirmation';
        if (phase === 'confirmation') {
          expect(activeConfirmationCases.has(caseDefinition.id)).toBe(false);
          activeConfirmationCases.add(caseDefinition.id);
        }
        activeCounts[phase] += 1;
        maximumActiveCounts[phase] = Math.max(maximumActiveCounts[phase], activeCounts[phase]);
        await new Promise<void>((resolve) => setImmediate(resolve));
        activeCounts[phase] -= 1;
        activeConfirmationCases.delete(caseDefinition.id);
        return createRecordedTrial({
          caseDefinition,
          confirmationEligible: confirmationIndex === null,
          confirmationIndex,
          passed: confirmationIndex !== null,
        });
      },
      getCaseCheckpoint: store.getCaseCheckpoint,
      persistCaseCheckpoint: store.persistCaseCheckpoint,
      workerCount: 2,
    });

    expect(maximumActiveCounts).toStrictEqual({ confirmation: 2, initial: 2 });
  });

  test('resolves each case without a global confirmation-round barrier', async () => {
    const cases = [createCase('case-one'), createCase('case-two')];
    const firstCaseTwoConfirmation = createDeferred();
    const confirmationStarts: string[] = [];
    const store = createCheckpointStore();

    const execution = runSemanticCaseExecution({
      cases,
      commitCase: async () => {},
      executeTrial: async ({ caseDefinition, confirmationIndex }) => {
        if (confirmationIndex === null) {
          return createRecordedTrial({
            caseDefinition,
            confirmationEligible: true,
            confirmationIndex,
            passed: false,
          });
        }
        confirmationStarts.push(`${caseDefinition.id}:${confirmationIndex}`);
        if (caseDefinition.id === 'case-two' && confirmationIndex === 1) {
          await firstCaseTwoConfirmation.promise;
        }
        return createRecordedTrial({
          caseDefinition,
          confirmationEligible: true,
          confirmationIndex,
          passed: true,
        });
      },
      getCaseCheckpoint: store.getCaseCheckpoint,
      persistCaseCheckpoint: store.persistCaseCheckpoint,
      workerCount: 2,
    });

    await expect.poll(() => confirmationStarts.includes('case-one:2')).toBe(true);
    expect(confirmationStarts).toContain('case-two:1');
    firstCaseTwoConfirmation.resolve();

    await expect(execution).resolves.toHaveLength(2);
  });

  test.each([1, 2, 4] as const)('accepts %s workers', async (workerCount) => {
    const caseDefinition = createCase('case-one');
    const store = createCheckpointStore();
    await expect(
      runSemanticCaseExecution({
        cases: [caseDefinition],
        commitCase: async () => {},
        executeTrial: async ({ confirmationIndex }) =>
          createRecordedTrial({
            caseDefinition,
            confirmationEligible: false,
            confirmationIndex,
            passed: true,
          }),
        getCaseCheckpoint: store.getCaseCheckpoint,
        persistCaseCheckpoint: store.persistCaseCheckpoint,
        workerCount,
      }),
    ).resolves.toHaveLength(1);
  });

  test.each([
    {
      confirmationEligible: false,
      confirmationVerdicts: [] as boolean[],
      expectedConfirmationStatus: 'not-required' as const,
      expectedStatus: 'passed' as const,
      initialVerdict: true,
    },
    {
      confirmationEligible: false,
      confirmationVerdicts: [] as boolean[],
      expectedConfirmationStatus: 'not-applicable' as const,
      expectedStatus: 'failed' as const,
      initialVerdict: false,
    },
    {
      confirmationEligible: true,
      confirmationVerdicts: [true, true],
      expectedConfirmationStatus: 'passed' as const,
      expectedStatus: 'recovered' as const,
      initialVerdict: false,
    },
    {
      confirmationEligible: true,
      confirmationVerdicts: [false, false],
      expectedConfirmationStatus: 'rejected' as const,
      expectedStatus: 'failed' as const,
      initialVerdict: false,
    },
    {
      confirmationEligible: true,
      confirmationVerdicts: [true, false, true],
      expectedConfirmationStatus: 'passed' as const,
      expectedStatus: 'recovered' as const,
      initialVerdict: false,
    },
  ])(
    'resolves $expectedStatus after $confirmationVerdicts',
    async ({
      confirmationEligible,
      confirmationVerdicts,
      expectedConfirmationStatus,
      expectedStatus,
      initialVerdict,
    }) => {
      const caseDefinition = createCase('case-one');
      const store = createCheckpointStore();

      const [result] = await runSemanticCaseExecution({
        cases: [caseDefinition],
        commitCase: async () => {},
        executeTrial: async ({ confirmationIndex }) =>
          createRecordedTrial({
            caseDefinition,
            confirmationEligible,
            confirmationIndex,
            passed:
              confirmationIndex === null
                ? initialVerdict
                : (confirmationVerdicts[confirmationIndex - 1] ?? false),
          }),
        getCaseCheckpoint: store.getCaseCheckpoint,
        persistCaseCheckpoint: store.persistCaseCheckpoint,
        workerCount: 1,
      });

      expect(result).toMatchObject({
        confirmationStatus: expectedConfirmationStatus,
        status: expectedStatus,
      });
      expect(result?.trials).toHaveLength(1 + confirmationVerdicts.length);
    },
  );

  test('resumes the recorded confirmation prefix without replaying trials', async () => {
    const caseDefinition = createCase('case-one');
    const initialTrial = createRecordedTrial({
      caseDefinition,
      confirmationEligible: true,
      confirmationIndex: null,
      passed: false,
    });
    const firstConfirmation = createRecordedTrial({
      caseDefinition,
      confirmationEligible: true,
      confirmationIndex: 1,
      passed: true,
    });
    const checkpoint = createCaseCheckpoint(caseDefinition, [initialTrial, firstConfirmation]);
    checkpoint.activeTrial = createSemanticActiveTrial(2, '2026-09-20T00:01:00.000Z');
    const store = createCheckpointStore([checkpoint]);
    const executedIndices: Array<1 | 2 | 3 | null> = [];

    const [result] = await runSemanticCaseExecution({
      cases: [caseDefinition],
      commitCase: async () => {},
      executeTrial: async ({ activeTrial, confirmationIndex, persistActiveTrial }) => {
        executedIndices.push(confirmationIndex);
        expect(activeTrial?.confirmationIndex).toBe(2);
        if (activeTrial !== null) await persistActiveTrial(activeTrial);
        return createRecordedTrial({
          caseDefinition,
          confirmationEligible: true,
          confirmationIndex,
          passed: true,
        });
      },
      getCaseCheckpoint: store.getCaseCheckpoint,
      persistCaseCheckpoint: store.persistCaseCheckpoint,
      workerCount: 1,
    });

    expect(executedIndices).toStrictEqual([2]);
    expect(result).toMatchObject({ confirmationStatus: 'passed', status: 'recovered' });
    expect(result?.trials).toHaveLength(3);
  });

  test('resumes an active initial trial before entering resolution', async () => {
    const caseDefinition = createCase('case-one');
    const checkpoint = createCaseCheckpoint(caseDefinition, []);
    checkpoint.activeTrial = createSemanticActiveTrial(null, '2026-09-20T00:01:00.000Z');
    const store = createCheckpointStore([checkpoint]);
    const executedIndices: Array<1 | 2 | 3 | null> = [];

    const [result] = await runSemanticCaseExecution({
      cases: [caseDefinition],
      commitCase: async () => {},
      executeTrial: async ({ activeTrial, confirmationIndex }) => {
        executedIndices.push(confirmationIndex);
        expect(activeTrial?.confirmationIndex).toBeNull();
        return createRecordedTrial({
          caseDefinition,
          confirmationEligible: false,
          confirmationIndex,
          passed: true,
        });
      },
      getCaseCheckpoint: store.getCaseCheckpoint,
      persistCaseCheckpoint: store.persistCaseCheckpoint,
      workerCount: 1,
    });

    expect(executedIndices).toStrictEqual([null]);
    expect(result).toMatchObject({ confirmationStatus: 'not-required', status: 'passed' });
  });

  test('returns a completed private case without replaying it', async () => {
    const caseDefinition = createCase('case-one');
    const initialTrial = createRecordedTrial({
      caseDefinition,
      confirmationEligible: false,
      confirmationIndex: null,
      passed: true,
    });
    const completedCase = {
      confirmationStatus: 'not-required',
      id: caseDefinition.id,
      status: 'passed',
      trials: [initialTrial],
    } satisfies ISemanticRecordedCase;
    const store = createCheckpointStore([
      createCaseCheckpoint(caseDefinition, [initialTrial], completedCase),
    ]);

    const results = await runSemanticCaseExecution({
      cases: [caseDefinition],
      commitCase: async () => {},
      executeTrial: async () => {
        throw new Error('Completed case was replayed.');
      },
      getCaseCheckpoint: store.getCaseCheckpoint,
      persistCaseCheckpoint: store.persistCaseCheckpoint,
      workerCount: 1,
    });

    expect(results).toStrictEqual([completedCase]);
  });

  test('does not start resolution after an initial execution failure', async () => {
    const cases = [createCase('case-one'), createCase('case-two')];
    const store = createCheckpointStore();
    const confirmationStarts: string[] = [];

    await expect(
      runSemanticCaseExecution({
        cases,
        commitCase: async () => {},
        executeTrial: async ({ caseDefinition, confirmationIndex }) => {
          if (caseDefinition.id === 'case-two' && confirmationIndex === null) {
            throw new Error('Initial execution stopped.');
          }
          if (confirmationIndex !== null) confirmationStarts.push(caseDefinition.id);
          return createRecordedTrial({
            caseDefinition,
            confirmationEligible: true,
            confirmationIndex,
            passed: false,
          });
        },
        getCaseCheckpoint: store.getCaseCheckpoint,
        persistCaseCheckpoint: store.persistCaseCheckpoint,
        workerCount: 1,
      }),
    ).rejects.toThrow('Initial execution stopped.');
    expect(confirmationStarts).toStrictEqual([]);
  });
});
