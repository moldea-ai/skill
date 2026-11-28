import {
  runOrderedEvaluationBatch,
  type IEvaluationBatchWorkerCount,
} from '../../execution/batch/index.ts';
import { getEvaluationConfirmationResolution } from '../../execution/confirmation/index.ts';

import { createSemanticCaseDefinitionDigest, type ISemanticCase } from '../cases/index.ts';
import type {
  ISemanticActiveTrialCheckpoint,
  ISemanticCaseCheckpoint,
  ISemanticRecordedCase,
  ISemanticRecordedTrial,
} from '../recording/index.ts';

// inputs provided to one model-backed or synthetic semantic trial
export type ISemanticCaseTrialExecutionOptions = {
  activeTrial: ISemanticActiveTrialCheckpoint | null;
  caseDefinition: ISemanticCase;
  confirmationIndex: 1 | 2 | 3 | null;
  persistActiveTrial: (activeTrial: ISemanticActiveTrialCheckpoint) => Promise<void>;
};

// semantic trial boundary injected by the command-line runner
export type ISemanticCaseTrialExecutor = (
  options: ISemanticCaseTrialExecutionOptions,
) => Promise<ISemanticRecordedTrial>;

type ISemanticCaseExecutionOptions = {
  signal?: AbortSignal | undefined;
  cases: ISemanticCase[];
  commitCase: (recordedCase: ISemanticRecordedCase) => Promise<void>;
  executeTrial: ISemanticCaseTrialExecutor;
  getCaseCheckpoint: (caseId: string) => ISemanticCaseCheckpoint | null;
  persistCaseCheckpoint: (checkpoint: ISemanticCaseCheckpoint) => Promise<void>;
  workerCount: IEvaluationBatchWorkerCount;
};

const validateCaseCheckpoint = (
  caseDefinition: ISemanticCase,
  checkpoint: ISemanticCaseCheckpoint,
): void => {
  const caseDefinitionDigest = createSemanticCaseDefinitionDigest(caseDefinition);
  if (
    checkpoint.caseId !== caseDefinition.id ||
    checkpoint.caseDefinitionDigest !== caseDefinitionDigest
  ) {
    throw new Error('Semantic private case checkpoint does not match its case definition.');
  }
};

const initializeCaseCheckpoint = async (
  options: ISemanticCaseExecutionOptions,
  caseDefinition: ISemanticCase,
): Promise<ISemanticCaseCheckpoint> => {
  options.signal?.throwIfAborted();
  const existingCheckpoint = options.getCaseCheckpoint(caseDefinition.id);
  if (existingCheckpoint !== null) {
    validateCaseCheckpoint(caseDefinition, existingCheckpoint);
    return existingCheckpoint;
  }

  const checkpoint = {
    activeTrial: null,
    caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
    caseId: caseDefinition.id,
    completedCase: null,
    trials: [],
  } satisfies ISemanticCaseCheckpoint;
  await options.persistCaseCheckpoint(checkpoint);
  return checkpoint;
};

/** Resolves a terminal case as soon as its evidence is ready, before ordered commit. */
const resolveTrialPrefix = (
  id: string,
  trials: ISemanticRecordedTrial[],
): ISemanticRecordedCase | null => {
  const initialTrial = trials[0]?.trial;
  if (initialTrial === undefined) return null;
  if (initialTrial.passed) {
    return { confirmationStatus: 'not-required', id, status: 'passed', trials };
  }
  if (!initialTrial.confirmationEligible) {
    return { confirmationStatus: 'not-applicable', id, status: 'failed', trials };
  }
  const resolution = getEvaluationConfirmationResolution(
    trials.slice(1).map(({ trial }) => trial.passed),
  );
  if (resolution === 'recovered') {
    return { confirmationStatus: 'passed', id, status: 'recovered', trials };
  }
  if (resolution === 'confirmed-failure') {
    return { confirmationStatus: 'rejected', id, status: 'failed', trials };
  }
  return null;
};

/** Finds a terminal verdict even when the last trial has not entered the case's ordered prefix. */
export const getTerminalSemanticCase = (
  checkpoint: ISemanticCaseCheckpoint,
): ISemanticRecordedCase | null => {
  if (checkpoint.completedCase !== null) return checkpoint.completedCase;
  const active = checkpoint.activeTrial;
  const finalTrial = active?.phase === 'trial-complete' ? active.recordedTrial : null;
  const trials = finalTrial === null ? checkpoint.trials : [...checkpoint.trials, finalTrial];
  return resolveTrialPrefix(checkpoint.caseId, trials);
};

const completeCaseTrial = (
  checkpoint: ISemanticCaseCheckpoint,
  recordedTrial: ISemanticRecordedTrial,
): ISemanticCaseCheckpoint => {
  const trials = [...checkpoint.trials, recordedTrial];
  return {
    ...checkpoint,
    activeTrial: null,
    completedCase: resolveTrialPrefix(checkpoint.caseId, trials),
    trials,
  };
};

const executeInitialTrial = async (
  options: ISemanticCaseExecutionOptions,
  caseDefinition: ISemanticCase,
): Promise<void> => {
  let checkpoint = await initializeCaseCheckpoint(options, caseDefinition);
  if (checkpoint.completedCase !== null || checkpoint.trials.length > 0) return;

  const recordedTrial = await options.executeTrial({
    activeTrial: checkpoint.activeTrial,
    caseDefinition,
    confirmationIndex: null,
    persistActiveTrial: async (activeTrial) => {
      checkpoint = { ...checkpoint, activeTrial };
      await options.persistCaseCheckpoint(checkpoint);
    },
  });
  await options.persistCaseCheckpoint(completeCaseTrial(checkpoint, recordedTrial));
};

const resolveSemanticCase = async (
  options: ISemanticCaseExecutionOptions,
  caseDefinition: ISemanticCase,
): Promise<ISemanticRecordedCase> => {
  options.signal?.throwIfAborted();
  const initialCheckpoint = options.getCaseCheckpoint(caseDefinition.id);
  if (initialCheckpoint === null) {
    throw new Error('Semantic case resolution requires an initial trial checkpoint.');
  }
  let checkpoint = initialCheckpoint;
  validateCaseCheckpoint(caseDefinition, checkpoint);

  while (checkpoint.completedCase === null) {
    options.signal?.throwIfAborted();
    if (checkpoint.trials.length === 0) {
      throw new Error('Semantic case resolution requires an initial trial checkpoint.');
    }
    const terminalCase = resolveTrialPrefix(caseDefinition.id, checkpoint.trials);
    if (terminalCase !== null) {
      await options.persistCaseCheckpoint({
        ...checkpoint,
        activeTrial: null,
        completedCase: terminalCase,
      });
      return terminalCase;
    }
    if (checkpoint.trials.length >= 4) {
      throw new Error(`Semantic confirmation policy did not resolve ${caseDefinition.id}.`);
    }

    const confirmationIndex = checkpoint.trials.length as 1 | 2 | 3;
    const recordedTrial = await options.executeTrial({
      activeTrial: checkpoint.activeTrial,
      caseDefinition,
      confirmationIndex,
      persistActiveTrial: async (activeTrial) => {
        checkpoint = { ...checkpoint, activeTrial };
        await options.persistCaseCheckpoint(checkpoint);
      },
    });
    checkpoint = completeCaseTrial(checkpoint, recordedTrial);
    await options.persistCaseCheckpoint(checkpoint);
  }
  return checkpoint.completedCase;
};

/**
 * Runs all semantic initials before resolving cases with bounded per-case concurrency.
 * @param options Case definitions and runner-owned execution and persistence boundaries.
 * @returns A promise resolving to terminal cases in selected-case order.
 * @throws
 * - Semantic private case checkpoint does not match its case definition.
 * - Semantic case resolution requires an initial trial checkpoint.
 * - Semantic confirmation policy did not resolve the selected case.
 * - Evaluation worker count must be 1, 2, or 4.
 * - Execution is cancelled before another case or confirmation.
 */
export const runSemanticCaseExecution = async (
  options: ISemanticCaseExecutionOptions,
): Promise<ISemanticRecordedCase[]> => {
  await runOrderedEvaluationBatch<ISemanticCase, void>({
    commitItem: async () => {},
    executeItem: async ({ item }) => executeInitialTrial(options, item),
    items: options.cases,
    workerCount: options.workerCount,
  });

  return runOrderedEvaluationBatch<ISemanticCase, ISemanticRecordedCase>({
    commitItem: async ({ value }) => options.commitCase(value),
    executeItem: async ({ item }) => resolveSemanticCase(options, item),
    items: options.cases,
    workerCount: options.workerCount,
  });
};
