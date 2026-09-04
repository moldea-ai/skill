import { posix } from 'node:path';

const COMMAND_COMPLETED_STATUSES = new Set(['completed', 'failed']);
const MOLDEA_COMMANDS = new Set(['composition', 'content', 'inspect', 'scope', 'validate']);
const MOLDEA_STATUSES = new Set(['error', 'invalid', 'valid']);
const OUTPUT_DISPOSITIONS = new Set(['empty', 'projected', 'too-large', 'unrecognized']);
const RECOGNIZED_MOLDEA_EXECUTABLE_PATHS = [
  'node_modules/.bin/moldea',
  './node_modules/.bin/moldea',
  '/mnt/node_modules/.bin/moldea',
  'node_modules/@moldea.ai/cli/dist/moldea.js',
  './node_modules/@moldea.ai/cli/dist/moldea.js',
  '/mnt/node_modules/@moldea.ai/cli/dist/moldea.js',
];
const RECOGNIZED_MOLDEA_INVOCATION_PREFIXES = [
  ...RECOGNIZED_MOLDEA_EXECUTABLE_PATHS,
  ...RECOGNIZED_MOLDEA_EXECUTABLE_PATHS.flatMap((executablePath) => [
    `node ${executablePath}`,
    `/opt/node ${executablePath}`,
  ]),
];
const MAX_ACTOR_EXECUTION_EVIDENCE_ITEMS = 128;
const MAX_ACTOR_EXECUTION_EVIDENCE_ITEM_BYTES = 32_768;
const MAX_MOLDEA_OUTPUT_BYTES = 1_048_576;
const MAX_OTHER_OUTPUT_BYTES = 32_768;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const hasExactKeys = (record, expectedKeys) => {
  const actualKeys = Object.keys(record).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  return (
    actualKeys.length === sortedExpectedKeys.length &&
    actualKeys.every((key, index) => key === sortedExpectedKeys[index])
  );
};

const hasValidProjectionOptions = (options) =>
  isPlainRecord(options) &&
  typeof options.cliVersion === 'string' &&
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(options.cliVersion) &&
  Number.isSafeInteger(options.jsonSchemaVersion) &&
  options.jsonSchemaVersion > 0;

/** Returns a recognized operation only for a direct repository-local CLI invocation. */
const recognizeMoldeaOperation = (command) => {
  for (const prefix of RECOGNIZED_MOLDEA_INVOCATION_PREFIXES) {
    const prefixIndex = command.indexOf(prefix);
    if (prefixIndex === -1) continue;
    const suffix = command.slice(prefixIndex + prefix.length).trimStart();
    const operation = [...MOLDEA_COMMANDS].find(
      (candidate) => suffix === candidate || suffix.startsWith(`${candidate} `),
    );
    if (operation === undefined) continue;
    if (!command.includes('--json') || !command.includes('--max-output-bytes 65536')) continue;
    if (operation === 'scope' && !command.includes('--path')) continue;
    if (operation === 'content') {
      const pathMatch = command.match(/--path\s+([^\s'";|&]+)/u);
      if (pathMatch === null || !pathMatch[1].startsWith('/moldea/')) continue;
      if (posix.normalize(pathMatch[1]) !== pathMatch[1]) continue;
    }
    return operation;
  }
  return null;
};

const containsContentField = (value) => {
  if (Array.isArray(value)) return value.some(containsContentField);
  if (!isPlainRecord(value)) return false;
  return Object.entries(value).some(
    ([key, child]) =>
      (key === 'content' && typeof child === 'string') || containsContentField(child),
  );
};

const countPageRecords = (result) =>
  isPlainRecord(result) && isPlainRecord(result.page) && Array.isArray(result.page.records)
    ? result.page.records.length
    : 0;

const hasNextPage = (result) =>
  isPlainRecord(result) &&
  isPlainRecord(result.page) &&
  typeof result.page.cursor === 'string' &&
  result.page.cursor.length > 0;

const hasConsistentMoldeaEnvelope = (envelope, operation, exitCode, options) => {
  if (
    !isPlainRecord(envelope) ||
    envelope.schemaVersion !== options.jsonSchemaVersion ||
    envelope.cliVersion !== options.cliVersion ||
    envelope.command !== operation ||
    !MOLDEA_STATUSES.has(envelope.status) ||
    !Object.hasOwn(envelope, 'result') ||
    !Object.hasOwn(envelope, 'error')
  ) {
    return false;
  }
  if (envelope.status === 'valid') {
    return exitCode === 0 && envelope.result !== null && envelope.error === null;
  }
  if (envelope.status === 'invalid') {
    return exitCode === 1 && envelope.result !== null && envelope.error === null;
  }
  return [2, 3].includes(exitCode) && envelope.result === null && envelope.error !== null;
};

const projectMoldeaEnvelope = (source, operation, exitCode, options) => {
  let envelope;
  try {
    envelope = JSON.parse(source);
  } catch {
    return null;
  }
  if (!hasConsistentMoldeaEnvelope(envelope, operation, exitCode, options)) return null;
  const result = envelope.result;
  return {
    cliVersion: envelope.cliVersion,
    command: envelope.command,
    containsContent: result !== null && containsContentField(result),
    errorPresent: envelope.error !== null,
    hasNextPage: hasNextPage(result),
    kind: 'moldea-cli-envelope',
    pageRecordCount: countPageRecords(result),
    relevant:
      operation === 'scope' && isPlainRecord(result) && typeof result.relevant === 'boolean'
        ? result.relevant
        : null,
    resultPresent: result !== null,
    schemaVersion: envelope.schemaVersion,
    status: envelope.status,
  };
};

const hasValidMoldeaFact = (fact, exitCode, options) =>
  isPlainRecord(fact) &&
  hasExactKeys(fact, [
    'cliVersion',
    'command',
    'containsContent',
    'errorPresent',
    'hasNextPage',
    'kind',
    'pageRecordCount',
    'relevant',
    'resultPresent',
    'schemaVersion',
    'status',
  ]) &&
  fact.kind === 'moldea-cli-envelope' &&
  fact.cliVersion === options.cliVersion &&
  fact.schemaVersion === options.jsonSchemaVersion &&
  MOLDEA_COMMANDS.has(fact.command) &&
  MOLDEA_STATUSES.has(fact.status) &&
  typeof fact.containsContent === 'boolean' &&
  typeof fact.hasNextPage === 'boolean' &&
  Number.isSafeInteger(fact.pageRecordCount) &&
  fact.pageRecordCount >= 0 &&
  (fact.relevant === null || typeof fact.relevant === 'boolean') &&
  ((fact.command === 'content' && fact.containsContent) ||
    (fact.command !== 'content' && !fact.containsContent)) &&
  ((fact.status === 'valid' && exitCode === 0 && fact.resultPresent && !fact.errorPresent) ||
    (fact.status === 'invalid' && exitCode === 1 && fact.resultPresent && !fact.errorPresent) ||
    (fact.status === 'error' &&
      [2, 3].includes(exitCode) &&
      !fact.resultPresent &&
      fact.errorPresent));

const createOutputEvidence = (source, operation, exitCode, options) => {
  const byteCount = Buffer.byteLength(source, 'utf8');
  const maximumBytes = operation === null ? MAX_OTHER_OUTPUT_BYTES : MAX_MOLDEA_OUTPUT_BYTES;
  if (byteCount > maximumBytes) return { byteCount, disposition: 'too-large', facts: [] };
  if (source.trim() === '') return { byteCount, disposition: 'empty', facts: [] };
  if (source.includes('\0')) return { byteCount, disposition: 'unrecognized', facts: [] };
  const fact = operation === null ? null : projectMoldeaEnvelope(source, operation, exitCode, options);
  return fact === null
    ? { byteCount, disposition: 'unrecognized', facts: [] }
    : { byteCount, disposition: 'projected', facts: [fact] };
};

const hasValidOutputEvidence = (evidence, commandKind, exitCode, options) => {
  if (
    !isPlainRecord(evidence) ||
    !hasExactKeys(evidence, ['byteCount', 'disposition', 'facts']) ||
    !Number.isSafeInteger(evidence.byteCount) ||
    evidence.byteCount < 0 ||
    !OUTPUT_DISPOSITIONS.has(evidence.disposition) ||
    !Array.isArray(evidence.facts)
  ) {
    return false;
  }
  const maximumBytes = commandKind === 'moldea' ? MAX_MOLDEA_OUTPUT_BYTES : MAX_OTHER_OUTPUT_BYTES;
  if (evidence.disposition === 'too-large') {
    return evidence.byteCount > maximumBytes && evidence.facts.length === 0;
  }
  if (evidence.byteCount > maximumBytes) return false;
  if (evidence.disposition === 'empty') {
    return evidence.facts.length === 0;
  }
  if (evidence.disposition === 'unrecognized') {
    return evidence.byteCount > 0 && evidence.facts.length === 0;
  }
  return (
    commandKind === 'moldea' &&
    evidence.byteCount > 0 &&
    evidence.facts.length === 1 &&
    hasValidMoldeaFact(evidence.facts[0], exitCode, options)
  );
};

const hasValidEntry = (entry, options) =>
  isPlainRecord(entry) &&
  hasExactKeys(entry, ['eventType', 'item']) &&
  entry.eventType === 'item.completed' &&
  isPlainRecord(entry.item) &&
  hasExactKeys(entry.item, ['commandKind', 'exitCode', 'outputEvidence', 'status', 'type']) &&
  ['moldea', 'other'].includes(entry.item.commandKind) &&
  COMMAND_COMPLETED_STATUSES.has(entry.item.status) &&
  Number.isSafeInteger(entry.item.exitCode) &&
  entry.item.type === 'command_execution' &&
  hasValidOutputEvidence(
    entry.item.outputEvidence,
    entry.item.commandKind,
    entry.item.exitCode,
    options,
  ) &&
  Buffer.byteLength(JSON.stringify(entry), 'utf8') <= MAX_ACTOR_EXECUTION_EVIDENCE_ITEM_BYTES;

/** Projects one completed command event without retaining command text or output bodies. */
export const projectActorExecutionEvidenceEvent = (event, options) => {
  if (!hasValidProjectionOptions(options)) {
    throw new Error('Actor execution evidence requires a valid release CLI identity.');
  }
  if (
    !isPlainRecord(event) ||
    event.type !== 'item.completed' ||
    !isPlainRecord(event.item) ||
    event.item.type !== 'command_execution'
  ) {
    return null;
  }
  const item = event.item;
  if (
    typeof item.command !== 'string' ||
    item.command.trim() === '' ||
    !COMMAND_COMPLETED_STATUSES.has(item.status) ||
    !Number.isSafeInteger(item.exit_code) ||
    typeof item.aggregated_output !== 'string'
  ) {
    throw new Error('A completed Codex command event did not include its result evidence.');
  }
  const operation = recognizeMoldeaOperation(item.command);
  const entry = {
    eventType: event.type,
    item: {
      commandKind: operation === null ? 'other' : 'moldea',
      exitCode: item.exit_code,
      outputEvidence: createOutputEvidence(item.aggregated_output, operation, item.exit_code, options),
      status: item.status,
      type: item.type,
    },
  };
  if (!hasValidEntry(entry, options)) {
    throw new Error('A Codex actor execution evidence item has an unsupported shape.');
  }
  return entry;
};

/** Checks the strict bounded protocol for a complete projected command sequence. */
export const hasValidActorExecutionEvidence = (executionEvidence, options) =>
  hasValidProjectionOptions(options) &&
  Array.isArray(executionEvidence) &&
  executionEvidence.length <= MAX_ACTOR_EXECUTION_EVIDENCE_ITEMS &&
  executionEvidence.every((entry) => hasValidEntry(entry, options));

/** Summarizes moldea command and model-visible output consumption without retaining content. */
export const createMoldeaResourceEvidence = (executionEvidence, options) => {
  if (!hasValidActorExecutionEvidence(executionEvidence, options)) {
    throw new Error('Cannot summarize invalid actor execution evidence.');
  }
  const moldeaEntries = executionEvidence.filter(({ item }) => item.commandKind === 'moldea');
  const operations = moldeaEntries.map(({ item }) => {
    const [fact] = item.outputEvidence.facts;
    return isPlainRecord(fact) && fact.kind === 'moldea-cli-envelope' ? fact.command : 'unrecognized';
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

/** Checks measured moldea consumption against one scenario's explicit resource budget. */
export const hasPassingMoldeaResourceBudget = (evidence, budget) => {
  if (
    !isPlainRecord(evidence) ||
    !hasExactKeys(evidence, [
      'commandCount',
      'maximumInvocationByteCount',
      'modelVisibleToolOutputByteCount',
      'operations',
      'stdoutByteCount',
    ]) ||
    !Number.isSafeInteger(evidence.commandCount) ||
    !Number.isSafeInteger(evidence.maximumInvocationByteCount) ||
    !Number.isSafeInteger(evidence.modelVisibleToolOutputByteCount) ||
    !Number.isSafeInteger(evidence.stdoutByteCount) ||
    !Array.isArray(evidence.operations)
  ) {
    return false;
  }
  const withinBudget =
    evidence.commandCount >= budget.minimumMoldeaCommands &&
    evidence.commandCount <= budget.maximumMoldeaCommands &&
    evidence.stdoutByteCount <= budget.maximumMoldeaOutputBytes &&
    evidence.modelVisibleToolOutputByteCount <= budget.maximumMoldeaOutputBytes &&
    evidence.maximumInvocationByteCount <= MAX_MOLDEA_OUTPUT_BYTES;
  if (!withinBudget) return false;
  if (budget.activation === 'abstain') return evidence.commandCount === 0;
  if (budget.activation === 'relationship') return evidence.operations[0] === 'scope';
  return evidence.operations[0] !== 'scope';
};
