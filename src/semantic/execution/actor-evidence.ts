import {
  identifyMoldeaCliLauncherOperation,
  identifyRepositoryTestCommandKind,
} from '../../execution/host/index.ts';
import type {
  IMoldeaCliOperation,
  IRepositoryTestCommandKind,
} from '../../execution/host/index.ts';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';
import type { IMoldeaResourceBudget } from '../cases/index.ts';

import type {
  IMoldeaResourceEvidence,
  ISemanticActorExecutionEvidence,
  ISemanticActorExecutionEvidenceOptions,
  ISemanticActorExecutionOutputEvidence,
  ISemanticActorExecutionOutputFact,
} from './types.ts';

type ICommandCompletedStatus = ISemanticActorExecutionEvidence['item']['status'];
type IMoldeaStatus = Extract<
  ISemanticActorExecutionOutputFact,
  { kind: 'moldea-cli-envelope' }
>['status'];
type IOutputDisposition = ISemanticActorExecutionOutputEvidence['disposition'];

const COMMAND_COMPLETED_STATUSES: ReadonlySet<string> = new Set(['completed', 'failed']);
const MOLDEA_COMMANDS: ReadonlySet<string> = new Set([
  'composition',
  'content',
  'inspect',
  'scope',
  'validate',
]);
const MOLDEA_STATUSES: ReadonlySet<string> = new Set(['error', 'invalid', 'valid']);
const MOLDEA_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/u;
const OUTPUT_DISPOSITIONS: ReadonlySet<string> = new Set([
  'empty',
  'projected',
  'too-large',
  'unrecognized',
]);
const MAX_ACTOR_EXECUTION_EVIDENCE_ITEMS =
  MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxActorExecutionEvidenceItems;
const MAX_ACTOR_EXECUTION_EVIDENCE_ITEM_BYTES =
  MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxActorExecutionEvidenceItemBytes;
const MAX_MOLDEA_OUTPUT_BYTES =
  MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaInvocationOutputBytes;
const MAX_OTHER_OUTPUT_BYTES = MOLDEA_SKILL_RESOURCE_PROFILES.ordinary.maxCommandOutputBytes;
const MAX_RECORDED_OUTPUT_BYTES = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostOutputBytes;
const MAX_AGGREGATE_MOLDEA_OUTPUT_BYTES =
  MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaOutputBytes;
const MAX_MOLDEA_COMMAND_COUNT = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaCommandCount;
const MOLDEA_RESOURCE_OPERATIONS: ReadonlySet<string> = new Set([
  ...MOLDEA_COMMANDS,
  'unrecognized',
]);
const NODE_TEST_SUMMARY_FIELDS = [
  'cancelled',
  'fail',
  'pass',
  'skipped',
  'suites',
  'tests',
  'todo',
] as const;
type INodeTestSummaryField = (typeof NODE_TEST_SUMMARY_FIELDS)[number];
const NODE_TEST_SUMMARY_LINE_PATTERN =
  /^(?:#|ℹ) (cancelled|fail|pass|skipped|suites|tests|todo) (\d+)$/u;
const NODE_TEST_DURATION_LINE_PATTERN = /^(?:#|ℹ) duration_ms \d+(?:\.\d+)?$/u;

const isPlainRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const hasExactKeys = (
  record: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean => {
  const actualKeys = Object.keys(record).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
};

const isCommandCompletedStatus = (input: unknown): input is ICommandCompletedStatus =>
  typeof input === 'string' && COMMAND_COMPLETED_STATUSES.has(input);

const isMoldeaOperation = (input: unknown): input is IMoldeaCliOperation =>
  typeof input === 'string' && MOLDEA_COMMANDS.has(input);

const isMoldeaStatus = (input: unknown): input is IMoldeaStatus =>
  typeof input === 'string' && MOLDEA_STATUSES.has(input);

const isOutputDisposition = (input: unknown): input is IOutputDisposition =>
  typeof input === 'string' && OUTPUT_DISPOSITIONS.has(input);

const isCommandKind = (
  input: unknown,
): input is ISemanticActorExecutionEvidence['item']['commandKind'] =>
  input === 'moldea' || input === 'other';

const hasValidProjectionOptions = (
  options: unknown,
): options is ISemanticActorExecutionEvidenceOptions => {
  if (!isPlainRecord(options)) return false;
  const { cliVersion, jsonSchemaVersion } = options;
  return (
    typeof cliVersion === 'string' &&
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(cliVersion) &&
    typeof jsonSchemaVersion === 'number' &&
    Number.isSafeInteger(jsonSchemaVersion) &&
    jsonSchemaVersion > 0
  );
};

const containsContentField = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsContentField);
  if (!isPlainRecord(value)) return false;
  return Object.entries(value).some(
    ([key, child]) =>
      (key === 'content' && typeof child === 'string') || containsContentField(child),
  );
};

const countPageRecords = (result: unknown): number => {
  if (!isPlainRecord(result) || !isPlainRecord(result['page'])) return 0;
  const records = result['page']['records'];
  return Array.isArray(records) ? records.length : 0;
};

const hasNextPage = (result: unknown): boolean => {
  if (!isPlainRecord(result) || !isPlainRecord(result['page'])) return false;
  const cursor = result['page']['cursor'];
  return typeof cursor === 'string' && cursor.length > 0;
};

const hasConsistentMoldeaEnvelope = (
  envelope: unknown,
  operation: IMoldeaCliOperation,
  exitCode: number,
  options: ISemanticActorExecutionEvidenceOptions,
): envelope is Record<string, unknown> => {
  if (!isPlainRecord(envelope)) return false;
  const { cliVersion, command, error, result, schemaVersion, status } = envelope;
  if (
    schemaVersion !== options.jsonSchemaVersion ||
    cliVersion !== options.cliVersion ||
    command !== operation ||
    !isMoldeaStatus(status) ||
    !Object.hasOwn(envelope, 'result') ||
    !Object.hasOwn(envelope, 'error')
  ) {
    return false;
  }
  if (status === 'valid') {
    return exitCode === 0 && result !== null && error === null;
  }
  if (status === 'invalid') {
    return exitCode === 1 && result !== null && error === null;
  }
  return (
    [2, 3].includes(exitCode) &&
    result === null &&
    isPlainRecord(error) &&
    typeof error['code'] === 'string' &&
    MOLDEA_ERROR_CODE_PATTERN.test(error['code'])
  );
};

const projectMoldeaEnvelope = (
  source: string,
  operation: IMoldeaCliOperation,
  exitCode: number,
  options: ISemanticActorExecutionEvidenceOptions,
): ISemanticActorExecutionOutputFact | null => {
  let envelope: unknown;
  try {
    envelope = JSON.parse(source);
  } catch {
    return null;
  }
  if (!hasConsistentMoldeaEnvelope(envelope, operation, exitCode, options)) return null;
  const { error, result, status } = envelope;
  if (!isMoldeaStatus(status)) return null;
  return {
    cliVersion: options.cliVersion,
    command: operation,
    containsContent: result !== null && containsContentField(result),
    errorCode:
      status === 'error' && isPlainRecord(error) && typeof error['code'] === 'string'
        ? error['code']
        : null,
    errorPresent: error !== null,
    hasNextPage: hasNextPage(result),
    kind: 'moldea-cli-envelope',
    pageRecordCount: countPageRecords(result),
    relevant:
      operation === 'scope' && isPlainRecord(result) && typeof result['relevant'] === 'boolean'
        ? result['relevant']
        : null,
    resultPresent: result !== null,
    schemaVersion: options.jsonSchemaVersion,
    status,
  };
};

const hasValidMoldeaFact = (
  fact: unknown,
  exitCode: number,
  options: ISemanticActorExecutionEvidenceOptions,
): fact is Extract<ISemanticActorExecutionOutputFact, { kind: 'moldea-cli-envelope' }> => {
  if (
    !isPlainRecord(fact) ||
    !hasExactKeys(fact, [
      'cliVersion',
      'command',
      'containsContent',
      'errorCode',
      'errorPresent',
      'hasNextPage',
      'kind',
      'pageRecordCount',
      'relevant',
      'resultPresent',
      'schemaVersion',
      'status',
    ])
  ) {
    return false;
  }
  const {
    cliVersion,
    command,
    containsContent,
    errorCode,
    errorPresent,
    hasNextPage: doesHaveNextPage,
    kind,
    pageRecordCount,
    relevant,
    resultPresent,
    schemaVersion,
    status,
  } = fact;
  if (
    kind !== 'moldea-cli-envelope' ||
    cliVersion !== options.cliVersion ||
    schemaVersion !== options.jsonSchemaVersion ||
    !isMoldeaOperation(command) ||
    !isMoldeaStatus(status) ||
    typeof containsContent !== 'boolean' ||
    (errorCode !== null &&
      (typeof errorCode !== 'string' || !MOLDEA_ERROR_CODE_PATTERN.test(errorCode))) ||
    typeof doesHaveNextPage !== 'boolean' ||
    typeof pageRecordCount !== 'number' ||
    !Number.isSafeInteger(pageRecordCount) ||
    pageRecordCount < 0 ||
    (relevant !== null && typeof relevant !== 'boolean') ||
    typeof resultPresent !== 'boolean' ||
    typeof errorPresent !== 'boolean'
  ) {
    return false;
  }
  const hasValidContent =
    command === 'content'
      ? status === 'valid'
        ? containsContent
        : !containsContent
      : !containsContent;
  if (!hasValidContent) return false;
  return (
    (status === 'valid' &&
      exitCode === 0 &&
      resultPresent &&
      !errorPresent &&
      errorCode === null) ||
    (status === 'invalid' &&
      exitCode === 1 &&
      resultPresent &&
      !errorPresent &&
      errorCode === null) ||
    (status === 'error' &&
      [2, 3].includes(exitCode) &&
      !resultPresent &&
      errorPresent &&
      errorCode !== null)
  );
};

/** Projects a successful native Node test summary without retaining test output. */
const projectNodeTestSummary = (
  source: string,
  exitCode: number,
  testKind: IRepositoryTestCommandKind,
): ISemanticActorExecutionOutputFact | null => {
  if (exitCode !== 0) return null;
  const summary = new Map<INodeTestSummaryField, number>();
  let durationCount = 0;
  for (const line of source.replaceAll('\r\n', '\n').split('\n')) {
    const match = NODE_TEST_SUMMARY_LINE_PATTERN.exec(line);
    if (match !== null) {
      const [, rawField, rawCount] = match;
      const field = rawField as INodeTestSummaryField;
      if (summary.has(field)) return null;
      const count = Number(rawCount);
      if (!Number.isSafeInteger(count)) return null;
      summary.set(field, count);
      continue;
    }
    if (NODE_TEST_DURATION_LINE_PATTERN.test(line)) durationCount += 1;
  }
  if (
    durationCount !== 1 ||
    NODE_TEST_SUMMARY_FIELDS.some((field) => !summary.has(field)) ||
    summary.get('tests') === 0 ||
    summary.get('pass') !== summary.get('tests') ||
    (['cancelled', 'fail', 'skipped', 'todo'] as const).some((field) => summary.get(field) !== 0)
  ) {
    return null;
  }
  return {
    cancelledCount: 0,
    failedCount: 0,
    kind: 'node-test-summary',
    passedCount: summary.get('pass') ?? 0,
    skippedCount: 0,
    status: 'passed',
    testCount: summary.get('tests') ?? 0,
    testKind,
    todoCount: 0,
  };
};

const hasValidNodeTestFact = (
  fact: unknown,
  exitCode: number,
): fact is Extract<ISemanticActorExecutionOutputFact, { kind: 'node-test-summary' }> => {
  if (
    !isPlainRecord(fact) ||
    !hasExactKeys(fact, [
      'cancelledCount',
      'failedCount',
      'kind',
      'passedCount',
      'skippedCount',
      'status',
      'testCount',
      'testKind',
      'todoCount',
    ])
  ) {
    return false;
  }
  const {
    cancelledCount,
    failedCount,
    kind,
    passedCount,
    skippedCount,
    status,
    testCount,
    testKind,
    todoCount,
  } = fact;
  return (
    kind === 'node-test-summary' &&
    status === 'passed' &&
    exitCode === 0 &&
    typeof testCount === 'number' &&
    Number.isSafeInteger(testCount) &&
    testCount > 0 &&
    typeof testKind === 'string' &&
    ['correctness', 'e2e', 'integration', 'unit'].includes(testKind) &&
    typeof passedCount === 'number' &&
    Number.isSafeInteger(passedCount) &&
    passedCount === testCount &&
    cancelledCount === 0 &&
    failedCount === 0 &&
    skippedCount === 0 &&
    todoCount === 0
  );
};

const createOutputEvidence = (
  source: string,
  operation: IMoldeaCliOperation | null,
  exitCode: number,
  options: ISemanticActorExecutionEvidenceOptions,
  testKind: IRepositoryTestCommandKind | null,
): ISemanticActorExecutionOutputEvidence => {
  const byteCount = Buffer.byteLength(source, 'utf8');
  const maximumBytes = operation === null ? MAX_OTHER_OUTPUT_BYTES : MAX_MOLDEA_OUTPUT_BYTES;
  if (byteCount > maximumBytes) return { byteCount, disposition: 'too-large', facts: [] };
  if (source.trim() === '') return { byteCount, disposition: 'empty', facts: [] };
  if (source.includes('\0')) return { byteCount, disposition: 'unrecognized', facts: [] };
  const fact =
    operation === null
      ? testKind !== null
        ? projectNodeTestSummary(source, exitCode, testKind)
        : null
      : projectMoldeaEnvelope(source, operation, exitCode, options);
  return fact === null
    ? { byteCount, disposition: 'unrecognized', facts: [] }
    : { byteCount, disposition: 'projected', facts: [fact] };
};

const hasValidOutputEvidence = (
  evidence: unknown,
  commandKind: ISemanticActorExecutionEvidence['item']['commandKind'],
  exitCode: number,
  options: ISemanticActorExecutionEvidenceOptions,
): evidence is ISemanticActorExecutionOutputEvidence => {
  if (!isPlainRecord(evidence) || !hasExactKeys(evidence, ['byteCount', 'disposition', 'facts'])) {
    return false;
  }
  const { byteCount, disposition, facts } = evidence;
  if (
    typeof byteCount !== 'number' ||
    !Number.isSafeInteger(byteCount) ||
    byteCount < 0 ||
    !isOutputDisposition(disposition) ||
    !Array.isArray(facts)
  ) {
    return false;
  }
  const maximumBytes = commandKind === 'moldea' ? MAX_MOLDEA_OUTPUT_BYTES : MAX_OTHER_OUTPUT_BYTES;
  if (disposition === 'too-large') {
    return (
      byteCount > (commandKind === 'moldea' ? maximumBytes : 0) &&
      byteCount <= MAX_RECORDED_OUTPUT_BYTES &&
      facts.length === 0
    );
  }
  if (byteCount > maximumBytes) return false;
  if (disposition === 'empty') {
    return facts.length === 0;
  }
  if (disposition === 'unrecognized') {
    return byteCount > 0 && facts.length === 0;
  }
  return (
    byteCount > 0 &&
    facts.length === 1 &&
    (commandKind === 'moldea'
      ? hasValidMoldeaFact(facts[0], exitCode, options)
      : hasValidNodeTestFact(facts[0], exitCode))
  );
};

const hasValidEntry = (
  entry: unknown,
  options: ISemanticActorExecutionEvidenceOptions,
): entry is ISemanticActorExecutionEvidence => {
  if (
    !isPlainRecord(entry) ||
    !hasExactKeys(entry, ['eventType', 'item']) ||
    entry['eventType'] !== 'item.completed' ||
    !isPlainRecord(entry['item']) ||
    !hasExactKeys(entry['item'], ['commandKind', 'exitCode', 'outputEvidence', 'status', 'type'])
  ) {
    return false;
  }
  const { commandKind, exitCode, outputEvidence, status, type } = entry['item'];
  return (
    isCommandKind(commandKind) &&
    isCommandCompletedStatus(status) &&
    typeof exitCode === 'number' &&
    Number.isSafeInteger(exitCode) &&
    type === 'command_execution' &&
    hasValidOutputEvidence(outputEvidence, commandKind, exitCode, options) &&
    Buffer.byteLength(JSON.stringify(entry), 'utf8') <= MAX_ACTOR_EXECUTION_EVIDENCE_ITEM_BYTES
  );
};

/** Projects one completed command event without retaining command text or output bodies. */
export const projectActorExecutionEvidenceEvent = (
  event: unknown,
  options: ISemanticActorExecutionEvidenceOptions,
): ISemanticActorExecutionEvidence | null => {
  if (!hasValidProjectionOptions(options)) {
    throw new Error('Actor execution evidence requires a valid release CLI identity.');
  }
  if (
    !isPlainRecord(event) ||
    event['type'] !== 'item.completed' ||
    !isPlainRecord(event['item']) ||
    event['item']['type'] !== 'command_execution'
  ) {
    return null;
  }
  const item = event['item'];
  const { aggregated_output: aggregatedOutput, command, exit_code: exitCode, status } = item;
  if (
    typeof command !== 'string' ||
    command.trim() === '' ||
    !isCommandCompletedStatus(status) ||
    typeof exitCode !== 'number' ||
    !Number.isSafeInteger(exitCode) ||
    typeof aggregatedOutput !== 'string'
  ) {
    throw new Error('A completed Codex command event did not include its result evidence.');
  }
  const operation = identifyMoldeaCliLauncherOperation(command);
  const testKind = operation === null ? identifyRepositoryTestCommandKind(command) : null;
  const entry: ISemanticActorExecutionEvidence = {
    eventType: 'item.completed',
    item: {
      commandKind: operation === null ? 'other' : 'moldea',
      exitCode,
      outputEvidence: createOutputEvidence(
        aggregatedOutput,
        operation,
        exitCode,
        options,
        testKind,
      ),
      status,
      type: 'command_execution',
    },
  };
  if (!hasValidEntry(entry, options)) {
    throw new Error('A Codex actor execution evidence item has an unsupported shape.');
  }
  return entry;
};

/** Checks the strict bounded protocol for a complete projected command sequence. */
export const hasValidActorExecutionEvidence = (
  executionEvidence: unknown,
  options: ISemanticActorExecutionEvidenceOptions,
): executionEvidence is ISemanticActorExecutionEvidence[] =>
  hasValidProjectionOptions(options) &&
  Array.isArray(executionEvidence) &&
  executionEvidence.length <= MAX_ACTOR_EXECUTION_EVIDENCE_ITEMS &&
  executionEvidence.every((entry) => hasValidEntry(entry, options));

/** Summarizes moldea command and model-visible output consumption without retaining content. */
export const createMoldeaResourceEvidence = (
  executionEvidence: ISemanticActorExecutionEvidence[],
  options: ISemanticActorExecutionEvidenceOptions,
): IMoldeaResourceEvidence => {
  if (!hasValidActorExecutionEvidence(executionEvidence, options)) {
    throw new Error('Cannot summarize invalid actor execution evidence.');
  }
  const moldeaEntries = executionEvidence.filter(({ item }) => item.commandKind === 'moldea');
  const operations = moldeaEntries.map(({ item }) => {
    const [fact] = item.outputEvidence.facts;
    return fact?.kind === 'moldea-cli-envelope' ? fact.command : 'unrecognized';
  });
  const stdoutByteCount = moldeaEntries.reduce(
    (total, { item }) => total + item.outputEvidence.byteCount,
    0,
  );
  return {
    commandCount: moldeaEntries.length,
    maximumInvocationByteCount: moldeaEntries.reduce(
      (maximum, { item }) => Math.max(maximum, item.outputEvidence.byteCount),
      0,
    ),
    modelVisibleToolOutputByteCount: stdoutByteCount,
    operations,
    stdoutByteCount,
  };
};

/** Checks one content-free moldea resource aggregate against absolute containment limits. */
export const hasValidMoldeaResourceEvidence = (
  evidence: unknown,
): evidence is IMoldeaResourceEvidence => {
  if (
    !isPlainRecord(evidence) ||
    !hasExactKeys(evidence, [
      'commandCount',
      'maximumInvocationByteCount',
      'modelVisibleToolOutputByteCount',
      'operations',
      'stdoutByteCount',
    ])
  ) {
    return false;
  }
  const {
    commandCount,
    maximumInvocationByteCount,
    modelVisibleToolOutputByteCount,
    operations,
    stdoutByteCount,
  } = evidence;
  return (
    typeof commandCount === 'number' &&
    Number.isSafeInteger(commandCount) &&
    commandCount >= 0 &&
    commandCount <= MAX_MOLDEA_COMMAND_COUNT &&
    typeof maximumInvocationByteCount === 'number' &&
    Number.isSafeInteger(maximumInvocationByteCount) &&
    maximumInvocationByteCount >= 0 &&
    maximumInvocationByteCount <= MAX_MOLDEA_OUTPUT_BYTES &&
    typeof modelVisibleToolOutputByteCount === 'number' &&
    Number.isSafeInteger(modelVisibleToolOutputByteCount) &&
    modelVisibleToolOutputByteCount >= 0 &&
    modelVisibleToolOutputByteCount <= MAX_AGGREGATE_MOLDEA_OUTPUT_BYTES &&
    typeof stdoutByteCount === 'number' &&
    Number.isSafeInteger(stdoutByteCount) &&
    stdoutByteCount >= 0 &&
    stdoutByteCount <= MAX_AGGREGATE_MOLDEA_OUTPUT_BYTES &&
    modelVisibleToolOutputByteCount === stdoutByteCount &&
    Array.isArray(operations) &&
    operations.length === commandCount &&
    operations.every(
      (operation) => typeof operation === 'string' && MOLDEA_RESOURCE_OPERATIONS.has(operation),
    ) &&
    maximumInvocationByteCount <= stdoutByteCount &&
    (commandCount > 0 || (maximumInvocationByteCount === 0 && stdoutByteCount === 0))
  );
};

/** Checks one scenario's required moldea activation and operation order. */
export const hasPassingMoldeaActivation = (
  evidence: unknown,
  budget: IMoldeaResourceBudget,
): boolean => {
  if (!hasValidMoldeaResourceEvidence(evidence)) return false;
  if (evidence.commandCount < budget.minimumMoldeaCommands) return false;
  if (budget.activation === 'abstain' || budget.activation === 'informational') {
    return evidence.commandCount === 0;
  }
  if (budget.activation === 'relationship') {
    return evidence.operations[0] === 'scope' && !evidence.operations.includes('inspect');
  }
  if (budget.activation === 'direct') return true;
  return evidence.operations[0] !== 'scope';
};

/** Checks one scenario's upper moldea command and output containment limits. */
export const hasPassingMoldeaResourceContainment = (
  evidence: unknown,
  budget: IMoldeaResourceBudget,
): boolean =>
  hasValidMoldeaResourceEvidence(evidence) &&
  evidence.commandCount <= budget.maximumMoldeaCommands &&
  evidence.stdoutByteCount <= budget.maximumMoldeaOutputBytes &&
  evidence.modelVisibleToolOutputByteCount <= budget.maximumMoldeaOutputBytes &&
  evidence.maximumInvocationByteCount <= MAX_MOLDEA_OUTPUT_BYTES;

/** Checks measured moldea activation and containment against one complete scenario budget. */
export const hasPassingMoldeaResourceBudget = (
  evidence: unknown,
  budget: IMoldeaResourceBudget,
): boolean =>
  hasPassingMoldeaActivation(evidence, budget) &&
  hasPassingMoldeaResourceContainment(evidence, budget);
