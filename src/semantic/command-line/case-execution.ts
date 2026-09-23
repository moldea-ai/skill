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
  checkpoint = {
    ...checkpoint,
    activeTrial: null,
    trials: [...checkpoint.trials, recordedTrial],
  };
  await options.persistCaseCheckpoint(checkpoint);
};

const resolveSemanticCase = async (
  options: ISemanticCaseExecutionOptions,
  caseDefinition: ISemanticCase,
): Promise<ISemanticRecordedCase> => {
  const initialCheckpoint = options.getCaseCheckpoint(caseDefinition.id);
  if (initialCheckpoint === null) {
    throw new Error('Semantic case resolution requires an initial trial checkpoint.');
  }
  let checkpoint = initialCheckpoint;
  validateCaseCheckpoint(caseDefinition, checkpoint);
  if (checkpoint.completedCase !== null) return checkpoint.completedCase;

  const finishCase = async (completedCase: ISemanticRecordedCase) => {
    checkpoint = { ...checkpoint, activeTrial: null, completedCase };
    await options.persistCaseCheckpoint(checkpoint);
    return completedCase;
  };

  while (true) {
    const initialTrial = checkpoint.trials[0]?.trial;
    if (initialTrial === undefined) {
      throw new Error('Semantic case resolution requires an initial trial checkpoint.');
    }
    if (initialTrial.passed) {
      return finishCase({
        confirmationStatus: 'not-required',
        id: caseDefinition.id,
        status: 'passed',
        trials: checkpoint.trials,
      });
    }
    if (!initialTrial.confirmationEligible) {
      return finishCase({
        confirmationStatus: 'not-applicable',
        id: caseDefinition.id,
        status: 'failed',
        trials: checkpoint.trials,
      });
    }

    const resolution = getEvaluationConfirmationResolution(
      checkpoint.trials.slice(1).map(({ trial }) => trial.passed),
    );
    if (resolution === 'recovered') {
      return finishCase({
        confirmationStatus: 'passed',
        id: caseDefinition.id,
        status: 'recovered',
        trials: checkpoint.trials,
      });
    }
    if (resolution === 'confirmed-failure') {
      return finishCase({
        confirmationStatus: 'rejected',
        id: caseDefinition.id,
        status: 'failed',
        trials: checkpoint.trials,
      });
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
    checkpoint = {
      ...checkpoint,
      activeTrial: null,
      trials: [...checkpoint.trials, recordedTrial],
    };
    await options.persistCaseCheckpoint(checkpoint);
  }
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
