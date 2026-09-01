import { posix } from 'node:path';

const COMMAND_COMPLETED_STATUSES = new Set(['completed', 'failed']);
const MOLDEA_COMMANDS = new Set(['composition', 'inspect', 'validate']);
const MOLDEA_STATUSES = new Set(['error', 'invalid', 'valid']);
const OUTPUT_DISPOSITIONS = new Set(['empty', 'projected', 'too-large', 'unrecognized']);
const YARN_CLI_PACKAGE_NAME = '@moldea.ai/cli';
const YARN_CONFLICTING_PROVIDER_NAME = 'conflicting-moldea-provider';
const YARN_PACKAGE_INFO_COMMAND = `yarn info ${YARN_CLI_PACKAGE_NAME} --json`;
const YARN_PROVIDER_INSPECTION_COMMAND = 'yarn bin -v --json';
const FOCUSED_RUNTIME_TEST_PATH = '/src/support-agent.test-integration.js';
const FOCUSED_RUNTIME_TEST_COMMAND = `node --test ${FOCUSED_RUNTIME_TEST_PATH.slice(1)}`;
const FOCUSED_RUNTIME_TEST_STATUSES = new Set(['failed', 'passed']);
const RECOGNIZED_WORKSPACE_PATHS = new Set([
  '/.pnp/node_modules/@moldea.ai/cli',
  '/.pnp/node_modules/@moldea.ai/cli/dist/moldea.js',
]);
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
  'pnpm node .pnp/node_modules/@moldea.ai/cli/dist/moldea.js',
  'pnpm node /mnt/.pnp/node_modules/@moldea.ai/cli/dist/moldea.js',
];
const MAX_ACTOR_EXECUTION_EVIDENCE_ITEMS = 128;
const MAX_ACTOR_EXECUTION_EVIDENCE_ITEM_BYTES = 32_768;
const MAX_COMMAND_OUTPUT_PROJECTION_BYTES = 32_768;

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

const isBoundedEvidenceText = (input, maximumBytes) =>
  typeof input === 'string' && Buffer.byteLength(input, 'utf8') <= maximumBytes;

const hasValidProjectionOptions = (options) =>
  isPlainRecord(options) &&
  typeof options.cliVersion === 'string' &&
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(options.cliVersion) &&
  Number.isSafeInteger(options.jsonSchemaVersion) &&
  options.jsonSchemaVersion > 0;

/** Checks one complete command against its direct and fixed Bash-wrapped forms. */
const matchesExactCommand = (command, directCommand) =>
  command === directCommand ||
  command === `/bin/bash -lc '${directCommand}'` ||
  command === `/bin/bash -lc "${directCommand}"`;

/** Returns whether a command exactly resolves the projected evaluator-owned paths. */
const hasRecognizedWorkspacePathCommand = (command, paths) => {
  const mountedPaths = paths.map((path) => `/mnt${path}`);
  return ['realpath', 'readlink -f'].some((operation) =>
    ['; ', ' && '].some((separator) =>
      matchesExactCommand(
        command,
        mountedPaths.map((path) => `${operation} ${path}`).join(separator),
      ),
    ),
  );
};

/** Returns evaluator-owned workspace paths only when the complete output is a recognized list. */
const projectWorkspacePaths = (source, command) => {
  const lines = source
    .trim()
    .split(/\r?\n/gu)
    .filter((line) => line.length > 0);
  if (lines.length === 0 || lines.length > RECOGNIZED_WORKSPACE_PATHS.size) return null;

  const paths = [];
  for (const line of lines) {
    if (line.includes('\\') || line.includes('\0') || !posix.isAbsolute(line)) return null;
    const normalizedPath = posix.normalize(line);
    if (
      normalizedPath !== line ||
      (normalizedPath !== '/mnt' && !normalizedPath.startsWith('/mnt/'))
    ) {
      return null;
    }
    const relativePath = posix.relative('/mnt', normalizedPath);
    if (relativePath.startsWith('..') || posix.isAbsolute(relativePath)) return null;
    const publicPath = relativePath === '' ? '/' : `/${relativePath}`;
    if (!RECOGNIZED_WORKSPACE_PATHS.has(publicPath) || paths.includes(publicPath)) return null;
    paths.push(publicPath);
  }

  if (!hasRecognizedWorkspacePathCommand(command, paths)) return null;
  return { kind: 'workspace-paths', paths };
};

/** Returns the recognized moldea operation for one exact repository-local invocation. */
const getRecognizedMoldeaOperation = (command) => {
  for (const operation of MOLDEA_COMMANDS) {
    if (
      RECOGNIZED_MOLDEA_INVOCATION_PREFIXES.some((invocationPrefix) =>
        matchesExactCommand(command, `${invocationPrefix} ${operation} --json`),
      )
    ) {
      return operation;
    }
  }
  return null;
};

/** Returns whether one moldea envelope has a consistent command, status, and exit code. */
const hasConsistentMoldeaEnvelope = (envelope, exitCode, options) => {
  if (
    !isPlainRecord(envelope) ||
    envelope.schemaVersion !== options.jsonSchemaVersion ||
    envelope.cliVersion !== options.cliVersion ||
    typeof envelope.command !== 'string' ||
    !MOLDEA_COMMANDS.has(envelope.command) ||
    typeof envelope.status !== 'string' ||
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
    return (
      envelope.command !== 'composition' &&
      exitCode === 1 &&
      envelope.result !== null &&
      envelope.error === null
    );
  }
  return [2, 3].includes(exitCode) && envelope.result === null && envelope.error !== null;
};

/** Returns safe release-bound fields only when the complete output is one moldea envelope. */
const projectMoldeaEnvelope = (source, command, exitCode, options) => {
  let envelope;
  try {
    envelope = JSON.parse(source);
  } catch {
    return null;
  }
  if (
    !hasConsistentMoldeaEnvelope(envelope, exitCode, options) ||
    getRecognizedMoldeaOperation(command) !== envelope.command
  ) {
    return null;
  }

  return {
    cliVersion: envelope.cliVersion,
    command: envelope.command,
    errorPresent: envelope.error !== null,
    kind: 'moldea-cli-envelope',
    resultPresent: envelope.result !== null,
    schemaVersion: envelope.schemaVersion,
    status: envelope.status,
  };
};

/** Returns one bounded test result only for the evaluator-owned runtime-provenance test. */
const projectFocusedRuntimeTest = (command, exitCode) => {
  if (!matchesExactCommand(command, FOCUSED_RUNTIME_TEST_COMMAND)) return null;

  return {
    kind: 'focused-runtime-test',
    path: FOCUSED_RUNTIME_TEST_PATH,
    status: exitCode === 0 ? 'passed' : 'failed',
  };
};

/** Returns release-bound Yarn package metadata only for the exact safe inspection. */
const projectYarnPackageInfo = (source, command, exitCode, options) => {
  if (!matchesExactCommand(command, YARN_PACKAGE_INFO_COMMAND) || exitCode !== 0) return null;

  let packageInfo;
  try {
    packageInfo = JSON.parse(source);
  } catch {
    return null;
  }
  if (
    !isPlainRecord(packageInfo) ||
    !hasExactKeys(packageInfo, ['children', 'value']) ||
    packageInfo.value !== `${YARN_CLI_PACKAGE_NAME}@npm:${options.cliVersion}` ||
    !isPlainRecord(packageInfo.children) ||
    !hasExactKeys(packageInfo.children, ['Exported Binaries', 'Version']) ||
    packageInfo.children.Version !== options.cliVersion ||
    !Array.isArray(packageInfo.children['Exported Binaries']) ||
    packageInfo.children['Exported Binaries'].length !== 1 ||
    packageInfo.children['Exported Binaries'][0] !== 'moldea'
  ) {
    return null;
  }

  return {
    binaries: ['moldea'],
    kind: 'yarn-package-info',
    packageName: YARN_CLI_PACKAGE_NAME,
    version: options.cliVersion,
  };
};

/** Returns the conflicting Yarn provider only for the exact safe inspection. */
const projectYarnBinaryProvider = (source, command, exitCode) => {
  if (!matchesExactCommand(command, YARN_PROVIDER_INSPECTION_COMMAND) || exitCode !== 0) {
    return null;
  }

  let provider;
  try {
    provider = JSON.parse(source);
  } catch {
    return null;
  }
  if (
    !isPlainRecord(provider) ||
    !hasExactKeys(provider, ['name', 'path', 'source']) ||
    provider.name !== 'moldea' ||
    provider.source !== YARN_CONFLICTING_PROVIDER_NAME ||
    provider.path !== `/mnt/node_modules/${YARN_CONFLICTING_PROVIDER_NAME}/bin/moldea.cjs`
  ) {
    return null;
  }

  return {
    binaryName: 'moldea',
    kind: 'yarn-binary-provider',
    source: YARN_CONFLICTING_PROVIDER_NAME,
  };
};

/** Projects one command output into safe evaluator-owned facts without retaining its content. */
const createCommandOutputEvidence = (source, command, exitCode, options) => {
  const byteCount = Buffer.byteLength(source, 'utf8');
  if (byteCount > MAX_COMMAND_OUTPUT_PROJECTION_BYTES) {
    return { byteCount, disposition: 'too-large', facts: [] };
  }
  if (source.trim() === '') {
    return { byteCount, disposition: 'empty', facts: [] };
  }
  if (source.includes('\0')) {
    return { byteCount, disposition: 'unrecognized', facts: [] };
  }

  const fact =
    projectMoldeaEnvelope(source, command, exitCode, options) ??
    projectWorkspacePaths(source, command) ??
    projectFocusedRuntimeTest(command, exitCode) ??
    projectYarnPackageInfo(source, command, exitCode, options) ??
    projectYarnBinaryProvider(source, command, exitCode);
  return fact === null
    ? { byteCount, disposition: 'unrecognized', facts: [] }
    : { byteCount, disposition: 'projected', facts: [fact] };
};

const hasValidWorkspacePathsFact = (fact) =>
  hasExactKeys(fact, ['kind', 'paths']) &&
  fact.kind === 'workspace-paths' &&
  Array.isArray(fact.paths) &&
  fact.paths.length > 0 &&
  fact.paths.length <= RECOGNIZED_WORKSPACE_PATHS.size &&
  new Set(fact.paths).size === fact.paths.length &&
  fact.paths.every(
    (path) =>
      typeof path === 'string' &&
      RECOGNIZED_WORKSPACE_PATHS.has(path) &&
      posix.normalize(path) === path,
  );

const hasValidMoldeaEnvelopeFact = (fact, exitCode, options) =>
  hasExactKeys(fact, [
    'cliVersion',
    'command',
    'errorPresent',
    'kind',
    'resultPresent',
    'schemaVersion',
    'status',
  ]) &&
  fact.kind === 'moldea-cli-envelope' &&
  fact.cliVersion === options.cliVersion &&
  fact.schemaVersion === options.jsonSchemaVersion &&
  typeof fact.command === 'string' &&
  MOLDEA_COMMANDS.has(fact.command) &&
  typeof fact.status === 'string' &&
  MOLDEA_STATUSES.has(fact.status) &&
  typeof fact.resultPresent === 'boolean' &&
  typeof fact.errorPresent === 'boolean' &&
  ((fact.status === 'valid' && exitCode === 0 && fact.resultPresent && !fact.errorPresent) ||
    (fact.status === 'invalid' &&
      fact.command !== 'composition' &&
      exitCode === 1 &&
      fact.resultPresent &&
      !fact.errorPresent) ||
    (fact.status === 'error' &&
      [2, 3].includes(exitCode) &&
      !fact.resultPresent &&
      fact.errorPresent));

const hasValidFocusedRuntimeTestFact = (fact, exitCode) =>
  hasExactKeys(fact, ['kind', 'path', 'status']) &&
  fact.kind === 'focused-runtime-test' &&
  fact.path === FOCUSED_RUNTIME_TEST_PATH &&
  typeof fact.status === 'string' &&
  FOCUSED_RUNTIME_TEST_STATUSES.has(fact.status) &&
  ((fact.status === 'passed' && exitCode === 0) || (fact.status === 'failed' && exitCode !== 0));

const hasValidYarnPackageInfoFact = (fact, exitCode, options) =>
  hasExactKeys(fact, ['binaries', 'kind', 'packageName', 'version']) &&
  fact.kind === 'yarn-package-info' &&
  fact.packageName === YARN_CLI_PACKAGE_NAME &&
  fact.version === options.cliVersion &&
  Array.isArray(fact.binaries) &&
  fact.binaries.length === 1 &&
  fact.binaries[0] === 'moldea' &&
  exitCode === 0;

const hasValidYarnBinaryProviderFact = (fact, exitCode) =>
  hasExactKeys(fact, ['binaryName', 'kind', 'source']) &&
  fact.kind === 'yarn-binary-provider' &&
  fact.binaryName === 'moldea' &&
  fact.source === YARN_CONFLICTING_PROVIDER_NAME &&
  exitCode === 0;

const hasValidCommandOutputEvidence = (outputEvidence, exitCode, options) => {
  if (
    !isPlainRecord(outputEvidence) ||
    !hasExactKeys(outputEvidence, ['byteCount', 'disposition', 'facts']) ||
    !Number.isSafeInteger(outputEvidence.byteCount) ||
    outputEvidence.byteCount < 0 ||
    typeof outputEvidence.disposition !== 'string' ||
    !OUTPUT_DISPOSITIONS.has(outputEvidence.disposition) ||
    !Array.isArray(outputEvidence.facts)
  ) {
    return false;
  }

  if (outputEvidence.disposition === 'empty') {
    return (
      outputEvidence.byteCount <= MAX_COMMAND_OUTPUT_PROJECTION_BYTES &&
      outputEvidence.facts.length === 0
    );
  }
  if (outputEvidence.disposition === 'too-large') {
    return (
      outputEvidence.byteCount > MAX_COMMAND_OUTPUT_PROJECTION_BYTES &&
      outputEvidence.facts.length === 0
    );
  }
  if (outputEvidence.disposition === 'unrecognized') {
    return (
      outputEvidence.byteCount > 0 &&
      outputEvidence.byteCount <= MAX_COMMAND_OUTPUT_PROJECTION_BYTES &&
      outputEvidence.facts.length === 0
    );
  }
  if (
    outputEvidence.byteCount === 0 ||
    outputEvidence.byteCount > MAX_COMMAND_OUTPUT_PROJECTION_BYTES ||
    outputEvidence.facts.length !== 1
  ) {
    return false;
  }

  const [fact] = outputEvidence.facts;
  return (
    isPlainRecord(fact) &&
    (hasValidWorkspacePathsFact(fact) ||
      hasValidMoldeaEnvelopeFact(fact, exitCode, options) ||
      hasValidFocusedRuntimeTestFact(fact, exitCode) ||
      hasValidYarnPackageInfoFact(fact, exitCode, options) ||
      hasValidYarnBinaryProviderFact(fact, exitCode))
  );
};

const hasValidCommandItem = (item, options) => {
  return (
    hasExactKeys(item, ['exitCode', 'outputEvidence', 'status', 'type']) &&
    COMMAND_COMPLETED_STATUSES.has(item.status) &&
    Number.isSafeInteger(item.exitCode) &&
    hasValidCommandOutputEvidence(item.outputEvidence, item.exitCode, options)
  );
};

const hasValidActorExecutionEvidenceEntry = (entry, options) => {
  if (
    !isPlainRecord(entry) ||
    !hasExactKeys(entry, ['eventType', 'item']) ||
    entry.eventType !== 'item.completed' ||
    !isPlainRecord(entry.item) ||
    entry.item.type !== 'command_execution' ||
    !isBoundedEvidenceText(JSON.stringify(entry), MAX_ACTOR_EXECUTION_EVIDENCE_ITEM_BYTES)
  ) {
    return false;
  }

  return hasValidCommandItem(entry.item, options);
};

/**
 * Selects one strict completed-command evidence entry from a Codex JSONL event.
 * @param event The parsed Codex event.
 * @param options The exact release CLI envelope identity.
 * @returns The selected entry, or null for an unrelated event.
 * @throws
 * - If a completed command event has an invalid shape
 */
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
  const selectedItem = {
    exitCode: item.exit_code,
    outputEvidence: createCommandOutputEvidence(
      item.aggregated_output,
      item.command,
      item.exit_code,
      options,
    ),
    status: item.status,
    type: item.type,
  };

  const entry = { eventType: event.type, item: selectedItem };
  if (!isBoundedEvidenceText(JSON.stringify(entry), MAX_ACTOR_EXECUTION_EVIDENCE_ITEM_BYTES)) {
    throw new Error('A Codex actor execution evidence item exceeded its byte limit.');
  }
  if (!hasValidActorExecutionEvidenceEntry(entry, options)) {
    throw new Error('A Codex actor execution evidence item has an unsupported shape.');
  }
  return entry;
};

/** Checks whether persisted actor execution evidence has the strict bounded protocol shape. */
export const hasValidActorExecutionEvidence = (executionEvidence, options) =>
  hasValidProjectionOptions(options) &&
  Array.isArray(executionEvidence) &&
  executionEvidence.length <= MAX_ACTOR_EXECUTION_EVIDENCE_ITEMS &&
  executionEvidence.every((entry) => hasValidActorExecutionEvidenceEntry(entry, options));
