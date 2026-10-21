import { parseStrictArgs } from 'jg-process';

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
const FLAG = { type: 'boolean' } as const;
const VALUE = { type: 'string' } as const;
// every option the runner accepts, each at most once
const SEMANTIC_EVALUATION_OPTIONS = {
  all: FLAG,
  case: VALUE,
  cases: VALUE,
  claims: VALUE,
  'diagnose-batch': FLAG,
  preflight: FLAG,
  record: FLAG,
  'record-checkpoint': FLAG,
  restart: FLAG,
  'resume-stopped-stage': FLAG,
  'unresolved-from': VALUE,
  'verify-attempts': FLAG,
  workers: VALUE,
} as const;

type ISemanticEvaluationOptionValues = Record<string, string | boolean | undefined>;

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

const getOptionValue = (
  values: ISemanticEvaluationOptionValues,
  option: string,
): string | undefined => {
  const value = values[option.slice(2)];
  return typeof value === 'string' ? value : undefined;
};

const isWorkerCount = (input: number): input is IEvaluationBatchWorkerCount =>
  input === 1 || input === 2 || input === 4;

const createDiagnosticSelector = (
  seenOptions: ReadonlySet<string>,
  values: ISemanticEvaluationOptionValues,
  isDiagnoseBatchRequested: boolean,
  isRecordRequested: boolean,
): ISemanticDiagnosticSelector | null => {
  const selectedOptions = Object.entries(DIAGNOSTIC_SELECTOR_OPTIONS).filter(
    ([option]) => seenOptions.has(option) && !(isRecordRequested && option === '--cases'),
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
  const value = getOptionValue(values, option);
  if (value === undefined) throw new Error(`${option} requires one value.`);
  if (kind === 'cases') parseSelectorValues(value, '--cases');
  if (kind === 'claims') parseSelectorValues(value, '--claims');
  return { kind, value };
};

/**
 * Parses the semantic runner's recording, targeting, and verification options.
 * @throws
 * - INVALID_ARGUMENTS: an unknown option, a positional argument, a missing or empty value, a
 * repeated option, or a missing required one
 * - The options don't form one supported recording, diagnostic, or verification run.
 */
export const parseSemanticEvaluationArguments = (
  arguments_: readonly string[],
): ISemanticEvaluationArguments => {
  const values: ISemanticEvaluationOptionValues = parseStrictArgs(
    arguments_,
    SEMANTIC_EVALUATION_OPTIONS,
  );
  // the options given, spelled as on the command line
  const seenOptions = new Set(
    Object.entries(values)
      .filter(([, value]) => value !== undefined && value !== false)
      .map(([name]) => `--${name}`),
  );

  if (seenOptions.size === 0) {
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
  const requestedCaseId = getOptionValue(values, '--case');
  const recordCaseIds =
    isRecordRequested && seenOptions.has('--cases')
      ? parseSelectorValues(getOptionValue(values, '--cases') ?? '', '--cases')
      : null;

  if (isPreflightRequested && seenOptions.size !== 1) {
    throw new Error('--preflight must run without other options.');
  }
  if (requestedCaseId !== undefined && isRecordRequested) {
    throw new Error('--case is diagnostic-only and cannot be combined with --record.');
  }
  if (seenOptions.has('--case') && seenOptions.size !== 1) {
    throw new Error('--case accepts exactly one semantic case ID and no other options.');
  }
  if ((isRecordCheckpointRequested || isVerifyAttemptsRequested) && seenOptions.size !== 1) {
    const operation = isRecordCheckpointRequested ? '--record-checkpoint' : '--verify-attempts';
    throw new Error(`${operation} must run without other options.`);
  }
  if (isRestartRequested && isResumeStoppedStageRequested) {
    throw new Error('--restart and --resume-stopped-stage cannot be combined.');
  }

  const workerValue = getOptionValue(values, '--workers');
  const parsedWorkerCount = workerValue === undefined ? undefined : Number(workerValue);
  if (parsedWorkerCount !== undefined && !isWorkerCount(parsedWorkerCount)) {
    throw new Error('--workers must be 1, 2, or 4.');
  }
  if (parsedWorkerCount !== undefined && !isRecordRequested && !isDiagnoseBatchRequested) {
    throw new Error('--workers requires --record or --diagnose-batch.');
  }

  const allowedOptions = isRecordRequested
    ? new Set(['--record', '--cases', '--restart', '--resume-stopped-stage', '--workers'])
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

  const diagnosticBatchSelector = createDiagnosticSelector(
    seenOptions,
    values,
    isDiagnoseBatchRequested,
    isRecordRequested,
  );
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
    recordCaseIds,
    requestedCaseId,
    workerCount,
  };
};
