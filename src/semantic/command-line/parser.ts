import {
  EVALUATION_BATCH_DEFAULT_WORKER_COUNT,
  type IEvaluationBatchWorkerCount,
} from '../../execution/batch/index.ts';

import type { ISemanticDiagnosticSelector, ISemanticEvaluationArguments } from './types.ts';

const DIAGNOSTIC_SELECTOR_OPTIONS = {
  '--all': 'all',
  '--cases': 'cases',
  '--claims': 'claims',
  '--unresolved-from': 'unresolved-from',
} as const;
const VALUE_OPTIONS = new Set(['--case', '--cases', '--claims', '--unresolved-from', '--workers']);
const SUPPORTED_OPTIONS = new Set([
  '--all',
  '--case',
  '--cases',
  '--claims',
  '--diagnose-batch',
  '--preflight',
  '--record',
  '--record-checkpoint',
  '--restart',
  '--resume-stopped-stage',
  '--unresolved-from',
  '--verify-attempts',
  '--workers',
]);

const parseSelectorValues = (source: string, label: '--cases' | '--claims'): string[] => {
  const values = source.split(',').map((value) => value.trim());
  if (
    values.length === 0 ||
    values.some((value) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) ||
    new Set(values).size !== values.length
  ) {
    throw new Error(`${label} requires unique comma-separated kebab-case identifiers.`);
  }
  return values;
};

const getOptionValue = (arguments_: readonly string[], option: string): string | undefined => {
  const index = arguments_.indexOf(option);
  return index === -1 ? undefined : arguments_[index + 1];
};

const isWorkerCount = (input: number): input is IEvaluationBatchWorkerCount =>
  input === 1 || input === 2 || input === 4;

const createDiagnosticSelector = (
  arguments_: readonly string[],
  isDiagnoseBatchRequested: boolean,
): ISemanticDiagnosticSelector | null => {
  const selectedOptions = Object.entries(DIAGNOSTIC_SELECTOR_OPTIONS).filter(([option]) =>
    arguments_.includes(option),
  );
  if (isDiagnoseBatchRequested && selectedOptions.length !== 1) {
    throw new Error('--diagnose-batch requires exactly one diagnostic selector.');
  }
  if (!isDiagnoseBatchRequested && selectedOptions.length > 0) {
    throw new Error('Semantic diagnostic selectors require --diagnose-batch.');
  }
  const selected = selectedOptions[0];
  if (selected === undefined) return null;
  const [option, kind] = selected;
  if (kind === 'all') return { kind, value: null };
  const value = getOptionValue(arguments_, option);
  if (value === undefined) throw new Error(`${option} requires one value.`);
  if (kind === 'cases') parseSelectorValues(value, '--cases');
  if (kind === 'claims') parseSelectorValues(value, '--claims');
  return { kind, value };
};

/** Parses the semantic runner's recording, targeting, and verification options. */
export const parseSemanticEvaluationArguments = (
  arguments_: readonly string[],
): ISemanticEvaluationArguments => {
  const seenOptions = new Set<string>();
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === undefined || !SUPPORTED_OPTIONS.has(argument)) {
      throw new Error(`Unsupported semantic evaluation option: ${String(argument)}`);
    }
    if (seenOptions.has(argument)) {
      throw new Error(`Semantic evaluation option may be supplied only once: ${argument}`);
    }
    seenOptions.add(argument);
    if (!VALUE_OPTIONS.has(argument)) continue;
    const optionValue = arguments_[index + 1];
    if (optionValue === undefined || optionValue.startsWith('--')) {
      throw new Error(`${argument} requires one value.`);
    }
    index += 1;
  }

  if (arguments_.length === 0) {
    throw new Error(
      'Semantic model execution requires --record, --case <id>, or --diagnose-batch.',
    );
  }
  const isPreflightRequested = seenOptions.has('--preflight');
  const isRecordRequested = seenOptions.has('--record');
  const isRecordCheckpointRequested = seenOptions.has('--record-checkpoint');
  const isDiagnoseBatchRequested = seenOptions.has('--diagnose-batch');
  const isRestartRequested = seenOptions.has('--restart');
  const isResumeStoppedStageRequested = seenOptions.has('--resume-stopped-stage');
  const isVerifyAttemptsRequested = seenOptions.has('--verify-attempts');
  const requestedCaseId = getOptionValue(arguments_, '--case');

  if (isPreflightRequested && arguments_.length !== 1) {
    throw new Error('--preflight must run without other options.');
  }
  if (requestedCaseId !== undefined && isRecordRequested) {
    throw new Error('--case is diagnostic-only and cannot be combined with --record.');
  }
  if (seenOptions.has('--case') && arguments_.length !== 2) {
    throw new Error('--case accepts exactly one semantic case ID and no other options.');
  }
  if ((isRecordCheckpointRequested || isVerifyAttemptsRequested) && arguments_.length !== 1) {
    const operation = isRecordCheckpointRequested ? '--record-checkpoint' : '--verify-attempts';
    throw new Error(`${operation} must run without other options.`);
  }
  if (isRestartRequested && isResumeStoppedStageRequested) {
    throw new Error('--restart and --resume-stopped-stage cannot be combined.');
  }

  const workerValue = getOptionValue(arguments_, '--workers');
  const parsedWorkerCount = workerValue === undefined ? undefined : Number(workerValue);
  if (parsedWorkerCount !== undefined && !isWorkerCount(parsedWorkerCount)) {
    throw new Error('--workers must be 1, 2, or 4.');
  }
  if (parsedWorkerCount !== undefined && !isRecordRequested && !isDiagnoseBatchRequested) {
    throw new Error('--workers requires --record or --diagnose-batch.');
  }

  const allowedOptions = isRecordRequested
    ? new Set(['--record', '--restart', '--resume-stopped-stage', '--workers'])
    : isDiagnoseBatchRequested
      ? new Set([
          '--all',
          '--cases',
          '--claims',
          '--diagnose-batch',
          '--restart',
          '--resume-stopped-stage',
          '--unresolved-from',
          '--workers',
        ])
      : null;
  if (allowedOptions !== null && [...seenOptions].some((option) => !allowedOptions.has(option))) {
    throw new Error(
      isRecordRequested
        ? '--record accepts only a worker count and one optional execution modifier.'
        : '--diagnose-batch accepts one selector, one worker count, and one optional execution modifier.',
    );
  }
  if (isRestartRequested && !isRecordRequested && !isDiagnoseBatchRequested) {
    throw new Error('--restart requires --record or --diagnose-batch.');
  }
  if (isResumeStoppedStageRequested && !isRecordRequested && !isDiagnoseBatchRequested) {
    throw new Error('--resume-stopped-stage requires --record or --diagnose-batch.');
  }

  const diagnosticBatchSelector = createDiagnosticSelector(arguments_, isDiagnoseBatchRequested);
  const workerCount =
    isRecordRequested || isDiagnoseBatchRequested
      ? (parsedWorkerCount ?? EVALUATION_BATCH_DEFAULT_WORKER_COUNT)
      : null;

  return {
    diagnosticBatchSelector,
    isDiagnoseBatchRequested,
    isPreflightRequested,
    isRecordCheckpointRequested,
    isRecordRequested,
    isRestartRequested,
    isResumeStoppedStageRequested,
    isVerifyAttemptsRequested,
    requestedCaseId,
    workerCount,
  };
};
