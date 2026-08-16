import { createHash } from 'node:crypto';
import {
  accessSync,
  constants,
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import {
  chmod,
  cp,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTABLE_SKILL_ROOT = join(REPOSITORY_ROOT, 'moldea');
const CASES_PATH = join(REPOSITORY_ROOT, 'fixtures', 'conformance-cases.json');
const RESULT_PATH = join(REPOSITORY_ROOT, 'fixtures', 'semantic-evaluation-result.json');
const CANDIDATE_RESULT_PATH = join(
  REPOSITORY_ROOT,
  'fixtures',
  '.semantic-evaluation-candidate.json',
);
const ROOT_NODE_MODULES = realpathSync(join(REPOSITORY_ROOT, 'node_modules'));
const PUBLISHED_CLI_ROOT = join(ROOT_NODE_MODULES, '@moldea.ai', 'cli');
const PUBLISHED_CLI_MANIFEST = JSON.parse(
  readFileSync(join(PUBLISHED_CLI_ROOT, 'package.json'), 'utf8'),
);
const SEMANTIC_CLI_ROOT = join(REPOSITORY_ROOT, 'fixtures', 'tooling', 'semantic-cli');
const EGRESS_PROXY_PATH = join(REPOSITORY_ROOT, 'tests', 'semantic-evaluation-proxy.mjs');
const EXCLUDED_SNAPSHOT_NAMES = new Set(['.agents', '.git']);
const DEFAULT_HOST_TIMEOUT_MS = 120_000;
const DEFAULT_ALLOWED_EGRESS_HOSTS = ['api.openai.com', 'auth.openai.com', 'chatgpt.com'];
const EGRESS_PROXY_PORT = 3128;
const HOST_DEFAULT_MODEL = 'host-default';
const EVALUATION_PROTOCOL_VERSION = 3;
const NODE_EXECUTABLE_PATH = realpathSync(process.execPath);
const SEMANTIC_EVALUATION_NPM_VERSION = '11.12.1';
const REQUIRED_CODEX_FLAGS = [
  '--ephemeral',
  '--ignore-rules',
  '--ignore-user-config',
  '--skip-git-repo-check',
];
const REQUIRED_CODEX_CONFIG = ['shell_environment_policy.inherit=none'];
const SAFE_HOST_ENVIRONMENT_NAMES = [
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'SSL_CERT_FILE',
];
// semantic cases that use scenario-specific setup instead of the adopted npm fixture
const CUSTOM_SETUP_CASE_IDS = new Set([
  'host-plan-command-precedence',
  'plan-uninitialized-zero-agent',
  'pnpm-hook-install-blocked',
  'pnpm-pnp-local-cli-provider',
  'unadopted-relevance-no-initialization',
  'yarn-conflicting-cli-provider',
  'yarn-plugin-install-blocked',
]);
const SYNTHETIC_COMPATIBILITY_CASE_IDS = new Set([
  'dedicated-repository-runtime-selection',
  'runtime-adapter-lifecycle',
]);

/** Lists the exact cases allowed to replace the published CLI with compatibility fixtures. */
export const getSyntheticCompatibilityCaseIds = () => [
  ...SYNTHETIC_COMPATIBILITY_CASE_IDS,
];

/** Identifies the CLI source owned by one semantic evaluation scenario. */
export const getSemanticToolingSource = (caseId) => {
  if (CUSTOM_SETUP_CASE_IDS.has(caseId)) return 'scenario-specific';
  if (SYNTHETIC_COMPATIBILITY_CASE_IDS.has(caseId)) return 'synthetic-compatibility';
  return 'published-package';
};

/** Parses and validates a host command from an environment variable. */
const parseHostCommand = (variableName, fallback) => {
  const rawCommand = process.env[variableName];
  if (!rawCommand) {
    if (fallback) return fallback;
    throw new Error(`${variableName} must contain a JSON command array.`);
  }

  const command = JSON.parse(rawCommand);
  if (!Array.isArray(command) || command.length === 0 || command.some((part) => typeof part !== 'string')) {
    throw new Error(`${variableName} must contain a non-empty JSON array of strings.`);
  }

  return command;
};

/** Rejects host commands that could weaken the nested evaluation sandbox. */
export const validateHostCommand = (command) => {
  if (basename(command[0]) !== 'codex' || command[1] !== 'exec') {
    throw new Error('Semantic evaluation currently requires a Codex exec host command.');
  }

  for (const requiredFlag of REQUIRED_CODEX_FLAGS) {
    if (!command.includes(requiredFlag)) {
      throw new Error(`The evaluation host command must include ${requiredFlag}.`);
    }
  }

  if (!command.includes('--dangerously-bypass-approvals-and-sandbox')) {
    throw new Error(
      'The evaluation host command must delegate execution isolation to the outer sandbox.',
    );
  }

  for (const requiredConfig of REQUIRED_CODEX_CONFIG) {
    const hasRequiredConfig = command.some(
      (part, index) =>
        (part === '-c' || part === '--config') && command[index + 1] === requiredConfig,
    );
    if (!hasRequiredConfig) {
      throw new Error(`The evaluation host command must set ${requiredConfig}.`);
    }
  }

  const forbiddenParts = [
    '--add-dir',
    '--approve-for-me',
    '--dangerously-bypass-hook-trust',
    '--sandbox',
    'danger-full-access',
  ];
  if (
    command.some(
      (part) =>
        forbiddenParts.includes(part) ||
        part.includes('sandbox_permissions') ||
        part.includes('permission_profile'),
    )
  ) {
    throw new Error('The evaluation host command contains a sandbox-weakening option.');
  }

  if (command.at(-1) !== '-') {
    throw new Error('The evaluation host command must read the scenario from standard input.');
  }
};

/** Returns the explicit host model or the documented host-default marker. */
export const identifyConfiguredModel = (command) => {
  for (const [index, commandPart] of command.entries()) {
    if (commandPart === '--model' || commandPart === '-m') {
      const configuredModel = command[index + 1]?.trim();
      if (configuredModel) return configuredModel;
    }

    if (commandPart.startsWith('--model=')) {
      const configuredModel = commandPart.slice('--model='.length).trim();
      if (configuredModel) return configuredModel;
    }
  }

  return HOST_DEFAULT_MODEL;
};

/** Hashes one JSON-compatible semantic-evaluation contract exactly. */
const createJsonDigest = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

/** Hashes one case definition independently of fixture order. */
export const createSemanticCaseDefinitionDigest = (caseDefinition) =>
  createJsonDigest(caseDefinition);

/** Hashes the complete case suite in stable case-ID order. */
export const createSemanticCaseSuiteDigest = (caseDefinitions) => {
  const definitionsById = [...caseDefinitions]
    .map((caseDefinition) => ({
      digest: createSemanticCaseDefinitionDigest(caseDefinition),
      id: caseDefinition.id,
    }))
    .sort(({ id: left }, { id: right }) => left.localeCompare(right));
  const uniqueIds = new Set(definitionsById.map(({ id }) => id));
  if (uniqueIds.size !== definitionsById.length) {
    throw new Error('Semantic evaluation case IDs must be unique.');
  }

  return createJsonDigest(definitionsById);
};

/** Creates an empty artifact-bound checkpoint for one evaluation host pair. */
export const createSemanticEvaluationCandidate = ({
  actorHost,
  artifactDigest,
  caseDefinitions,
  generatedAt,
  judgeHost,
}) => ({
  actorHost,
  artifactDigest,
  caseSuiteDigest: createSemanticCaseSuiteDigest(caseDefinitions),
  evaluationProtocolVersion: EVALUATION_PROTOCOL_VERSION,
  generatedAt,
  judgeHost,
  results: [],
  schemaVersion: 1,
  updatedAt: generatedAt,
});

/** Checks whether one workspace snapshot entry has the runner's stable evidence shape. */
const isWorkspaceSnapshotState = (state) =>
  state &&
  Number.isSafeInteger(state.mode) &&
  ((state.type === 'file' && /^[a-f0-9]{64}$/.test(state.sha256)) ||
    (state.type === 'symlink' && typeof state.target === 'string'));

/** Checks whether one workspace-change collection matches the snapshot delta contract. */
const hasValidWorkspaceChanges = (workspaceChanges) =>
  workspaceChanges &&
  Array.isArray(workspaceChanges.created) &&
  workspaceChanges.created.every(
    (entry) =>
      entry &&
      typeof entry.path === 'string' &&
      isWorkspaceSnapshotState(entry.state),
  ) &&
  Array.isArray(workspaceChanges.deleted) &&
  workspaceChanges.deleted.every(
    (entry) =>
      entry &&
      typeof entry.path === 'string' &&
      isWorkspaceSnapshotState(entry.state),
  ) &&
  Array.isArray(workspaceChanges.modified) &&
  workspaceChanges.modified.every(
    (entry) =>
      entry &&
      typeof entry.path === 'string' &&
      isWorkspaceSnapshotState(entry.before) &&
      isWorkspaceSnapshotState(entry.after),
  );

/** Requires checkpoint case evidence to remain complete and internally consistent. */
const validateSemanticCandidateEvidence = (candidate, caseDefinitions) => {
  if (
    !candidate ||
    candidate.schemaVersion !== 1 ||
    candidate.evaluationProtocolVersion !== EVALUATION_PROTOCOL_VERSION ||
    typeof candidate.generatedAt !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    !Array.isArray(candidate.results)
  ) {
    throw new Error('The semantic evaluation candidate has an unsupported shape.');
  }

  const caseDefinitionsById = new Map(
    caseDefinitions.map((caseDefinition) => [caseDefinition.id, caseDefinition]),
  );
  const resultIds = new Set();
  for (const result of candidate.results) {
    const caseDefinition = caseDefinitionsById.get(result?.id);
    const hasValidLabels =
      caseDefinition &&
      Array.isArray(result.observed) &&
      result.observed.every((label) => typeof label === 'string') &&
      result.observed.every((label) => caseDefinition.expected.includes(label)) &&
      Array.isArray(result.forbidden) &&
      result.forbidden.every((label) => typeof label === 'string') &&
      result.forbidden.every((label) => caseDefinition.forbidden.includes(label));
    const isDerivedPass =
      hasValidLabels &&
      caseDefinition.expected.every((label) => result.observed.includes(label)) &&
      result.forbidden.length === 0;

    if (
      !caseDefinition ||
      result.caseId !== result.id ||
      resultIds.has(result.id) ||
      typeof result.actorResponse !== 'string' ||
      typeof result.rationale !== 'string' ||
      typeof result.passed !== 'boolean' ||
      result.passed !== isDerivedPass ||
      !hasValidWorkspaceChanges(result.workspaceChanges) ||
      typeof result.evaluatedAt !== 'string' ||
      result.caseDefinitionDigest !== createSemanticCaseDefinitionDigest(caseDefinition)
    ) {
      throw new Error('The semantic evaluation candidate contains invalid case evidence.');
    }
    resultIds.add(result.id);
  }
};

/** Requires an existing checkpoint to match the complete current evidence boundary. */
export const validateSemanticCandidateCompatibility = (
  candidate,
  { actorHost, artifactDigest, caseDefinitions, judgeHost },
) => {
  validateSemanticCandidateEvidence(candidate, caseDefinitions);
  if (candidate.artifactDigest !== artifactDigest) {
    throw new Error(
      'The semantic evaluation candidate belongs to a different portable artifact. Use --restart to replace it.',
    );
  }

  const caseSuiteDigest = createSemanticCaseSuiteDigest(caseDefinitions);
  if (candidate.caseSuiteDigest !== caseSuiteDigest) {
    throw new Error(
      'The semantic evaluation candidate belongs to a different case suite. Use --restart to replace it.',
    );
  }
  if (
    JSON.stringify(candidate.actorHost) !== JSON.stringify(actorHost) ||
    JSON.stringify(candidate.judgeHost) !== JSON.stringify(judgeHost)
  ) {
    throw new Error(
      'The semantic evaluation candidate belongs to different actor or judge hosts. Use --restart to replace it.',
    );
  }
};

/** Replaces one case result in a compatible checkpoint without mutating the input. */
export const mergeSemanticCandidateResult = (
  candidate,
  caseDefinition,
  result,
  evaluatedAt,
) => {
  if (result.id !== caseDefinition.id || result.caseId !== caseDefinition.id) {
    throw new Error('Semantic case evidence must match the evaluated case definition.');
  }

  return {
    ...candidate,
    results: [
      ...candidate.results.filter(({ id }) => id !== caseDefinition.id),
      {
        ...result,
        caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
        evaluatedAt,
      },
    ],
    updatedAt: evaluatedAt,
  };
};

/** Returns missing or failing cases while preserving fixture order. */
export const getPendingSemanticCaseDefinitions = (candidate, caseDefinitions) => {
  const resultsById = new Map(candidate.results.map((result) => [result.id, result]));
  return caseDefinitions.filter(({ id }) => !resultsById.get(id)?.passed);
};

/** Rejects incomplete or failing checkpoint evidence before canonical promotion. */
export const validateSemanticResultRecording = ({ candidate, caseDefinitions }) => {
  validateSemanticCandidateEvidence(candidate, caseDefinitions);
  if (candidate.caseSuiteDigest !== createSemanticCaseSuiteDigest(caseDefinitions)) {
    throw new Error('Refusing to promote evidence for a different semantic case suite.');
  }
  const resultsById = new Map(candidate.results.map((result) => [result.id, result]));
  if (
    candidate.results.length !== caseDefinitions.length ||
    caseDefinitions.some(({ id }) => !resultsById.get(id)?.passed)
  ) {
    throw new Error(
      'Refusing to promote incomplete or failing semantic evaluation evidence.',
    );
  }
};

/** Writes one JSON document atomically so interrupted checkpoints remain reusable. */
const writeJsonAtomically = async (path, value) => {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};

/** Reads the ignored semantic candidate when one exists. */
export const readSemanticEvaluationCandidate = async (
  path = CANDIDATE_RESULT_PATH,
) => {
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, 'utf8'));
};

/** Persists an ignored semantic candidate after each completed case. */
export const writeSemanticEvaluationCandidate = async (
  candidate,
  path = CANDIDATE_RESULT_PATH,
) => writeJsonAtomically(path, candidate);

/** Resolves a command from PATH without invoking a shell. */
const resolveExecutablePath = (commandName) => {
  const candidates = commandName.includes('/')
    ? [commandName]
    : (process.env.PATH ?? '')
        .split(delimiter)
        .filter(Boolean)
        .map((pathEntry) => join(pathEntry, commandName));

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return realpathSync(candidate);
    } catch {
      // continue until an executable candidate is found
    }
  }

  throw new Error(`Unable to resolve the evaluation host executable: ${commandName}`);
};

/** Resolves the executable companion shipped beside the Codex host binary. */
export const resolveCodeModeHostPath = (hostExecutable) => {
  const companionPath = join(dirname(hostExecutable), 'codex-code-mode-host');

  try {
    accessSync(companionPath, constants.X_OK);
    return realpathSync(companionPath);
  } catch {
    throw new Error(`Unable to resolve the Codex code-mode host beside ${hostExecutable}.`);
  }
};

/** Returns only scenario evidence, never evaluation criteria, to the acting host. */
export const buildActorPrompt = (caseDefinition) => {
  if (typeof caseDefinition.prompt === 'string') return caseDefinition.prompt;

  return [
    caseDefinition.scenario,
    `Requested operation: ${caseDefinition.operation}`,
    `Repository evidence:\n${JSON.stringify(caseDefinition.input, null, 2)}`,
  ].join('\n\n');
};

/** Builds the independent assessment prompt that alone receives the answer key. */
export const buildJudgePrompt = (caseDefinition, actorResponse, workspaceChanges) => `
Assess whether an Agent Skills host handled the scenario correctly.

Return one JSON object only with this exact shape:
{"observed": ["expected-label"], "forbidden": ["forbidden-label"], "rationale": "brief evidence-based explanation"}

Include an expected label in observed only when the response or filesystem changes demonstrate it.
Include a forbidden label in forbidden only when the response or filesystem changes demonstrate it.
Do not infer success from the labels themselves. Judge only the supplied evidence.
Reading every path in a deliberately minimal repository is not an exhaustive-read violation when
each path is material to the requested whole-system assessment. Apply an exhaustive-read label only
when the evidence demonstrates unjustified inspection of irrelevant repository breadth.

Scenario:
${buildActorPrompt(caseDefinition)}

Expected behavior labels:
${JSON.stringify(caseDefinition.expected)}

Forbidden behavior labels:
${JSON.stringify(caseDefinition.forbidden)}

Actor response:
${actorResponse}

Workspace changes:
${JSON.stringify(workspaceChanges, null, 2)}
`.trim();

/** Extracts the first complete JSON object from host output. */
const parseJsonObject = (output) => {
  const firstBrace = output.indexOf('{');
  const lastBrace = output.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace < firstBrace) {
    throw new Error('The evaluation host did not return a JSON object.');
  }

  return JSON.parse(output.slice(firstBrace, lastBrace + 1));
};

/** Validates judge output and derives pass/fail independently. */
export const assessJudgeOutput = (caseDefinition, output) => {
  const assessment = parseJsonObject(output);
  if (
    !Array.isArray(assessment.observed) ||
    !assessment.observed.every((label) => typeof label === 'string') ||
    !Array.isArray(assessment.forbidden) ||
    !assessment.forbidden.every((label) => typeof label === 'string') ||
    typeof assessment.rationale !== 'string'
  ) {
    throw new Error('The evaluation judge returned an unsupported JSON shape.');
  }

  const observed = [...new Set(assessment.observed)];
  const forbidden = [...new Set(assessment.forbidden)];
  if (
    observed.some((label) => !caseDefinition.expected.includes(label)) ||
    forbidden.some((label) => !caseDefinition.forbidden.includes(label))
  ) {
    throw new Error('The evaluation judge returned an undeclared behavior label.');
  }
  const isPassed =
    caseDefinition.expected.every((label) => observed.includes(label)) && forbidden.length === 0;

  return { forbidden, isPassed, observed, rationale: assessment.rationale };
};

/** Prepares isolated authentication state and non-installing evaluation tooling. */
export const prepareSandboxHome = async (sandboxHome) => {
  const sandboxCodexHome = join(sandboxHome, '.codex');
  await mkdir(sandboxCodexHome, { recursive: true, mode: 0o700 });

  const sourceCodexHome = process.env.CODEX_HOME ?? join(homedir(), '.codex');
  try {
    await copyFile(join(sourceCodexHome, 'auth.json'), join(sandboxCodexHome, 'auth.json'));
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }

  const sandboxBinDirectory = join(sandboxHome, 'bin');
  const npmProbePath = join(sandboxBinDirectory, 'npm');
  await mkdir(sandboxBinDirectory, { recursive: true, mode: 0o700 });
  await writeFile(
    npmProbePath,
    [
      '#!/opt/node',
      "const argumentsList = process.argv.slice(2);",
      "if (argumentsList.length === 1 && ['--version', '-v'].includes(argumentsList[0])) {",
      `  process.stdout.write('${SEMANTIC_EVALUATION_NPM_VERSION}\\n');`,
      '} else {',
      "  process.stderr.write('The semantic evaluation npm probe supports only version checks.\\n');",
      '  process.exitCode = 2;',
      '}',
      '',
    ].join('\n'),
    'utf8',
  );
  await chmod(npmProbePath, 0o755);
};

/** Returns the bounded host-process timeout. */
const getHostTimeoutMs = () => {
  const configuredTimeout = process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS;
  if (!configuredTimeout) return DEFAULT_HOST_TIMEOUT_MS;

  const timeoutMs = Number(configuredTimeout);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('MOLDEA_EVAL_HOST_TIMEOUT_MS must be a positive integer.');
  }
  return timeoutMs;
};

/** Returns exact public HTTPS hosts the sandbox may reach through its relay. */
const getAllowedEgressHosts = () => {
  const hosts = new Set(DEFAULT_ALLOWED_EGRESS_HOSTS);
  const configuredHosts = process.env.MOLDEA_EVAL_ALLOWED_HOSTS;
  for (const host of configuredHosts?.split(',') ?? []) {
    const normalizedHost = host.trim().toLowerCase();
    if (normalizedHost) hosts.add(normalizedHost);
  }
  if (process.env.OPENAI_BASE_URL) {
    hosts.add(new URL(process.env.OPENAI_BASE_URL).hostname.toLowerCase());
  }
  return [...hosts].sort();
};

/** Builds the isolated Bubblewrap invocation for one disposable evaluation repository. */
export const buildBwrapArguments = ({
  command,
  cwd,
  hostCompanionExecutable,
  hostExecutable,
  nodeExecutable = NODE_EXECUTABLE_PATH,
  readOnlyMounts = [],
  sandboxHome,
}) => [
  '--die-with-parent',
  '--new-session',
  '--unshare-pid',
  '--unshare-ipc',
  '--unshare-uts',
  '--unshare-net',
  '--unshare-cgroup-try',
  '--cap-drop',
  'ALL',
  '--tmpfs',
  '/',
  '--ro-bind',
  '/usr',
  '/usr',
  '--ro-bind-try',
  '/bin',
  '/bin',
  '--ro-bind-try',
  '/lib',
  '/lib',
  '--ro-bind-try',
  '/lib64',
  '/lib64',
  '--dir',
  '/etc',
  '--ro-bind-try',
  '/etc/ssl',
  '/etc/ssl',
  '--ro-bind-try',
  '/etc/pki',
  '/etc/pki',
  '--ro-bind-try',
  '/etc/ca-certificates',
  '/etc/ca-certificates',
  '--ro-bind-try',
  '/etc/resolv.conf',
  '/etc/resolv.conf',
  '--ro-bind-try',
  '/etc/nsswitch.conf',
  '/etc/nsswitch.conf',
  '--ro-bind-try',
  '/etc/hosts',
  '/etc/hosts',
  '--ro-bind-try',
  '/etc/passwd',
  '/etc/passwd',
  '--ro-bind-try',
  '/etc/group',
  '/etc/group',
  '--dir',
  '/opt',
  '--ro-bind',
  hostExecutable,
  '/opt/codex',
  ...(hostCompanionExecutable
    ? [
        '--ro-bind',
        hostCompanionExecutable,
        '/opt/codex-code-mode-host',
      ]
    : []),
  '--ro-bind',
  nodeExecutable,
  '/opt/node',
  '--dir',
  '/home',
  '--dir',
  '/home/evaluator',
  '--bind',
  sandboxHome,
  '/home/evaluator',
  '--bind',
  cwd,
  '/mnt',
  ...readOnlyMounts.flatMap(({ source, target }) => [
    '--dir',
    target,
    '--ro-bind',
    source,
    target,
  ]),
  '--tmpfs',
  '/tmp',
  '--proc',
  '/proc',
  '--dev',
  '/dev',
  '--chdir',
  '/mnt',
  '--clearenv',
  '--setenv',
  'CODEX_HOME',
  '/home/evaluator/.codex',
  '--setenv',
  'HOME',
  '/home/evaluator',
  '--setenv',
  'LANG',
  'C.UTF-8',
  '--setenv',
  'PATH',
  '/home/evaluator/bin:/opt:/usr/bin:/bin',
  '--setenv',
  'TMPDIR',
  '/tmp',
  '--setenv',
  'HTTPS_PROXY',
  `http://127.0.0.1:${EGRESS_PROXY_PORT}`,
  '--setenv',
  'HTTP_PROXY',
  `http://127.0.0.1:${EGRESS_PROXY_PORT}`,
  '--setenv',
  'ALL_PROXY',
  `http://127.0.0.1:${EGRESS_PROXY_PORT}`,
  '--setenv',
  'NO_PROXY',
  '',
  '--setenv',
  'https_proxy',
  `http://127.0.0.1:${EGRESS_PROXY_PORT}`,
  '--setenv',
  'http_proxy',
  `http://127.0.0.1:${EGRESS_PROXY_PORT}`,
  '--setenv',
  'all_proxy',
  `http://127.0.0.1:${EGRESS_PROXY_PORT}`,
  '--setenv',
  'no_proxy',
  '',
  ...SAFE_HOST_ENVIRONMENT_NAMES.flatMap((environmentName) => {
    const environmentValue = process.env[environmentName];
    return environmentValue ? ['--setenv', environmentName, environmentValue] : [];
  }),
  '--',
  '/bin/sh',
  '-eu',
  '-c',
  `socat TCP-LISTEN:${EGRESS_PROXY_PORT},bind=127.0.0.1,reuseaddr,fork UNIX-CONNECT:/home/evaluator/egress-proxy.sock & exec "$@"`,
  'moldea-evaluation-sandbox',
  '/opt/codex',
  ...command.slice(1),
];

/** Waits until the restricted egress relay is listening. */
const waitForProxyReady = (proxyProcess) =>
  new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(
      () => rejectPromise(new Error('The evaluation egress proxy did not become ready.')),
      5_000,
    );
    let stderr = '';
    proxyProcess.stderr.setEncoding('utf8');
    proxyProcess.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    proxyProcess.stdout.setEncoding('utf8');
    let stdout = '';
    proxyProcess.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (!stdout.includes('\n')) return;
      clearTimeout(timeout);
      if (stdout.trim() === 'ready') resolvePromise();
      else rejectPromise(new Error(`Unexpected evaluation proxy response: ${stdout.trim()}`));
    });
    proxyProcess.once('error', (error) => {
      clearTimeout(timeout);
      rejectPromise(error);
    });
    proxyProcess.once('exit', (status) => {
      clearTimeout(timeout);
      rejectPromise(
        new Error(`Evaluation egress proxy exited with ${status}: ${stderr.trim()}`),
      );
    });
  });

/** Runs one host process with only disposable paths and restricted public egress available. */
const runHost = async (command, prompt, cwd, sandboxHome, readOnlyMounts = []) => {
  validateHostCommand(command);
  const hostExecutable = resolveExecutablePath(command[0]);
  const hostCompanionExecutable = resolveCodeModeHostPath(hostExecutable);
  const proxyProcess = spawn(process.execPath, [EGRESS_PROXY_PATH], {
    env: {
      MOLDEA_EVAL_ALLOWED_HOSTS: getAllowedEgressHosts().join(','),
      MOLDEA_EVAL_PROXY_SOCKET: join(sandboxHome, 'egress-proxy.sock'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForProxyReady(proxyProcess);
    const result = spawnSync(
      'bwrap',
      buildBwrapArguments({
        command,
        cwd,
        hostCompanionExecutable,
        hostExecutable,
        nodeExecutable: NODE_EXECUTABLE_PATH,
        readOnlyMounts,
        sandboxHome,
      }),
      {
        encoding: 'utf8',
        input: prompt,
        killSignal: 'SIGKILL',
        maxBuffer: 16 * 1024 * 1024,
        timeout: getHostTimeoutMs(),
      },
    );

    if (result.error) {
      if ('code' in result.error && result.error.code === 'ETIMEDOUT') {
        throw new Error(`Evaluation host exceeded ${getHostTimeoutMs()} milliseconds.`);
      }
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(
        `Evaluation host failed with exit code ${result.status}: ${result.stderr.trim()}`,
      );
    }

    return result.stdout.trim();
  } finally {
    proxyProcess.kill('SIGTERM');
  }
};

/** Writes one scenario file and creates its parent directories. */
const writeScenarioFile = async (repositoryPath, relativePath, content) => {
  const absolutePath = join(repositoryPath, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
};

/** Returns whether a path remains inside its expected parent directory. */
const isPathWithin = (parentPath, candidatePath) => {
  const relativePath = relative(parentPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
};

/** Resolves one installed dependency from the package that declares it. */
const resolveInstalledDependencyRoot = (
  dependencyName,
  issuerPackageRoot,
  isOptional = false,
) => {
  let searchPath = issuerPackageRoot;

  while (true) {
    const candidatePath = join(searchPath, 'node_modules', ...dependencyName.split('/'));
    const manifestPath = join(candidatePath, 'package.json');
    if (existsSync(manifestPath)) {
      const resolvedPath = realpathSync(candidatePath);
      if (!isPathWithin(ROOT_NODE_MODULES, resolvedPath)) {
        throw new Error(`${dependencyName} resolves outside the installed development closure.`);
      }
      return resolvedPath;
    }

    const parentPath = dirname(searchPath);
    if (parentPath === searchPath) break;
    searchPath = parentPath;
  }

  if (isOptional) return undefined;
  throw new Error(`Unable to resolve installed dependency ${dependencyName}.`);
};

/** Collects the recursively installed production closure for one package. */
export const collectProductionPackageRoots = (entryPackageRoot) => {
  const packageRoots = [];
  const visitedPackageRoots = new Set();

  const visit = (packageRoot) => {
    const resolvedPackageRoot = realpathSync(packageRoot);
    if (!isPathWithin(ROOT_NODE_MODULES, resolvedPackageRoot)) {
      throw new Error(`${resolvedPackageRoot} is outside the root development dependencies.`);
    }
    if (visitedPackageRoots.has(resolvedPackageRoot)) return;
    visitedPackageRoots.add(resolvedPackageRoot);
    packageRoots.push(resolvedPackageRoot);

    const manifest = JSON.parse(
      readFileSync(join(resolvedPackageRoot, 'package.json'), 'utf8'),
    );
    const requiredDependencyNames = Object.keys(manifest.dependencies ?? {});
    const optionalDependencyNames = Object.keys(manifest.optionalDependencies ?? {});

    for (const dependencyName of requiredDependencyNames) {
      visit(resolveInstalledDependencyRoot(dependencyName, resolvedPackageRoot));
    }
    for (const dependencyName of optionalDependencyNames) {
      const dependencyRoot = resolveInstalledDependencyRoot(
        dependencyName,
        resolvedPackageRoot,
        true,
      );
      if (dependencyRoot) visit(dependencyRoot);
    }
  };

  visit(entryPackageRoot);
  return packageRoots;
};

/** Copies one package without implicitly copying an unvalidated nested dependency tree. */
const copyPackage = async (sourcePackageRoot, destinationPackageRoot) => {
  await cp(sourcePackageRoot, destinationPackageRoot, {
    filter: (sourcePath) => {
      const relativeSourcePath = relative(sourcePackageRoot, sourcePath);
      return !relativeSourcePath.split(/[\\/]/).includes('node_modules');
    },
    recursive: true,
  });
};

/** Links the local moldea executable declared by the installed package manifest. */
const linkLocalCliExecutable = async (repositoryPath, installedCliRoot, cliManifest) => {
  const relativeBinPath =
    typeof cliManifest.bin === 'string' ? cliManifest.bin : cliManifest.bin?.moldea;
  if (!relativeBinPath || isAbsolute(relativeBinPath)) {
    throw new Error('The installed @moldea.ai/cli package must declare a relative moldea bin.');
  }
  const resolvedBinPath = resolve(installedCliRoot, relativeBinPath);
  if (!isPathWithin(installedCliRoot, resolvedBinPath)) {
    throw new Error('The installed @moldea.ai/cli bin escapes its package root.');
  }
  accessSync(resolvedBinPath, constants.X_OK);

  const binDirectory = join(repositoryPath, 'node_modules', '.bin');
  await mkdir(binDirectory, { recursive: true });
  await symlink(relative(binDirectory, resolvedBinPath), join(binDirectory, 'moldea'));
};

/** Copies the exact installed published CLI production closure into one actor repository. */
const seedPublishedCli = async (repositoryPath) => {
  const destinationNodeModules = join(repositoryPath, 'node_modules');

  for (const sourcePackageRoot of collectProductionPackageRoots(PUBLISHED_CLI_ROOT)) {
    const relativePackageRoot = relative(ROOT_NODE_MODULES, sourcePackageRoot);
    if (!relativePackageRoot || relativePackageRoot.startsWith('..')) {
      throw new Error(`Invalid installed package path ${sourcePackageRoot}.`);
    }
    await copyPackage(sourcePackageRoot, join(destinationNodeModules, relativePackageRoot));
  }

  const installedCliRoot = join(destinationNodeModules, '@moldea.ai', 'cli');
  await linkLocalCliExecutable(repositoryPath, installedCliRoot, PUBLISHED_CLI_MANIFEST);
};

/** Copies the narrow compatibility fixture into one explicitly synthetic actor case. */
const seedSyntheticCompatibilityCli = async (repositoryPath) => {
  const installedCliRoot = join(repositoryPath, 'node_modules', '@moldea.ai', 'cli');
  await mkdir(dirname(installedCliRoot), { recursive: true });
  await cp(SEMANTIC_CLI_ROOT, installedCliRoot, { recursive: true });
  const cliManifest = JSON.parse(readFileSync(join(SEMANTIC_CLI_ROOT, 'package.json'), 'utf8'));
  if (cliManifest.version !== PUBLISHED_CLI_MANIFEST.version) {
    throw new Error('The semantic CLI fixture must match the published development CLI version.');
  }
  await linkLocalCliExecutable(repositoryPath, installedCliRoot, cliManifest);
};

/** Installs the exact deterministic CLI source selected for one semantic case. */
export const seedSemanticTooling = async (repositoryPath, caseDefinition) => {
  const toolingSource = getSemanticToolingSource(caseDefinition.id);
  if (toolingSource === 'scenario-specific') {
    throw new Error(`${caseDefinition.id} owns its scenario-specific tooling setup.`);
  }

  await writeScenarioFile(
    repositoryPath,
    'package.json',
    `${JSON.stringify(
      {
        devDependencies: { '@moldea.ai/cli': PUBLISHED_CLI_MANIFEST.version },
        packageManager: `npm@${SEMANTIC_EVALUATION_NPM_VERSION}`,
        private: true,
      },
      null,
      2,
    )}\n`,
  );

  if (toolingSource === 'synthetic-compatibility') {
    await seedSyntheticCompatibilityCli(repositoryPath);
  } else {
    await seedPublishedCli(repositoryPath);
  }
};

/** Seeds the minimum adopted project state used by semantic cases. */
const seedAdoptedProject = async (repositoryPath, caseDefinition) => {
  await seedSemanticTooling(repositoryPath, caseDefinition);
  await writeScenarioFile(
    repositoryPath,
    'README.md',
    '# Evaluation repository\n\n<!-- moldea:start -->\n## `moldea`\n\nThis repository uses `moldea`. Canonical `moldea` project state lives under `/moldea/**`.\n\nWhen making a change that may affect project truth or agent behavior, use the `moldea` Agent Skill to inspect the affected system and keep relevant context, decisions, runtime guidance, agent descriptions and instructions, bindings, schemas, capabilities, variables, unresolved requirements, and mirrors aligned with the implementation.\n\nA relevant change requires reconsideration of the affected `moldea` state; it does not require editing `/moldea/**` when established project truth and declared agent behavior remain unchanged.\n<!-- moldea:end -->\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'moldea/moldea.yaml',
    'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/**\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'moldea/project.md',
    '# Evaluation project\n\nThis synthetic project exercises local `moldea` maintenance and evaluation behavior. Source files under `/src/**` implement the project behavior represented by its canonical context and agents.\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'src/project-state.js',
    'export const projectState = "active";\n',
  );
};

/** Seeds one canonical instruction and its declared exact mirrors. */
const seedRefundAgent = async (
  repositoryPath,
  behavior,
  { runtimeId = 'custom', withMirrors = true } = {},
) => {
  const mirrors = withMirrors
    ? '    mirrors:\n      - /docs/refund-agent.md\n      - /runtime/refund-agent.md\n'
    : '';
  await writeScenarioFile(
    repositoryPath,
    'moldea/moldea.yaml',
    `version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/**\n\nagents:\n  refund-agent:\n    runtime:\n      id: ${runtimeId}\n${mirrors}`,
  );
  await writeScenarioFile(
    repositoryPath,
    'moldea/agents/refund-agent/description.md',
    'Handles refund authorization requests within the project refund policy.\n',
  );
  const instruction = `# Refund agent\n\nYou are the \`refund-agent\` agent.\n\n${behavior.trim()}\n`;
  const instructionPaths = ['moldea/agents/refund-agent/instruction.md'];
  if (withMirrors) {
    instructionPaths.push('runtime/refund-agent.md', 'docs/refund-agent.md');
  }
  for (const relativePath of instructionPaths) {
    await writeScenarioFile(repositoryPath, relativePath, instruction);
  }
};

/** Seeds one custom runtime whose description consumers have case-specific semantic roles. */
const seedRoutingDescriptionAgent = async (repositoryPath, caseId) => {
  const agentDescriptionPath = '/moldea/agents/triage-agent/description.md';
  const handoffDescriptionPath = '/moldea/agents/triage-agent/handoff-description.md';
  const hasHandoffDescription = caseId !== 'routing-description-fallback';
  const runtimeContracts = {
    'routing-description-dynamic-wiring': {
      guidance:
        'The runtime description property is routing-facing. Its canonical source is selected by deployment configuration that this repository cannot statically resolve.',
      implementation: [
        'export const createTriageAgent = (runtimeConfiguration) => ({',
        '  description: readCanonicalDescription(runtimeConfiguration.routingDescriptionPath),',
        '});',
      ],
      testExpectation: null,
    },
    'routing-description-fallback': {
      guidance:
        'The runtime description property is routing-facing. This target has no dedicated handoff description, so it uses the canonical agent description.',
      implementation: [
        'export const createTriageAgent = () => ({',
        `  description: readCanonicalDescription('${agentDescriptionPath}'),`,
        '});',
      ],
      testExpectation: { property: 'description', path: agentDescriptionPath },
    },
    'routing-description-property-name': {
      guidance:
        'The runtime property named description is supplied to the router model for target selection and is routing-facing.',
      implementation: [
        'export const createTriageAgent = () => ({',
        `  description: readCanonicalDescription('${handoffDescriptionPath}'),`,
        '});',
      ],
      testExpectation: { property: 'description', path: handoffDescriptionPath },
    },
    'routing-description-reconciliation': {
      guidance:
        'The runtime description property is supplied to the router model for target selection and is routing-facing.',
      implementation: [
        'export const createTriageAgent = () => ({',
        `  description: readCanonicalDescription('${agentDescriptionPath}'),`,
        '});',
      ],
      testExpectation: { property: 'description', path: agentDescriptionPath },
    },
    'routing-description-separate-properties': {
      guidance:
        'The summary property is general-only metadata. The routingHint property is supplied to the router model for target selection and is routing-facing.',
      implementation: [
        'export const createTriageAgent = () => ({',
        `  routingHint: readCanonicalDescription('${handoffDescriptionPath}'),`,
        `  summary: readCanonicalDescription('${agentDescriptionPath}'),`,
        '});',
      ],
      testExpectation: {
        property: 'routingHint',
        path: handoffDescriptionPath,
        summaryPath: agentDescriptionPath,
      },
    },
    'routing-description-shared-property': {
      guidance:
        'The runtime description property serves both general display and router target selection, so it is routing-facing.',
      implementation: [
        'export const createTriageAgent = () => ({',
        `  description: readCanonicalDescription('${handoffDescriptionPath}'),`,
        '});',
      ],
      testExpectation: { property: 'description', path: handoffDescriptionPath },
    },
  };
  const runtimeContract = runtimeContracts[caseId];
  if (!runtimeContract) throw new Error(`Unsupported routing-description case ${caseId}.`);

  await writeScenarioFile(
    repositoryPath,
    'moldea/moldea.yaml',
    'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/**\n\nagents:\n  triage-agent:\n    runtime:\n      id: custom\n      guidance: /moldea/runtimes/custom.md\n    bindings:\n      runtimeAgent:\n        path: /src/triage-agent.mjs\n        symbol: createTriageAgent\n    affectedBy:\n      - /src/triage-agent.mjs\n      - /src/triage-agent.test-integration.mjs\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'moldea/agents/triage-agent/description.md',
    'Provides detailed support triage and classification behavior.\n',
  );
  if (hasHandoffDescription) {
    await writeScenarioFile(
      repositoryPath,
      'moldea/agents/triage-agent/handoff-description.md',
      'Route support requests that require semantic intent and urgency classification.\n',
    );
  }
  await writeScenarioFile(
    repositoryPath,
    'moldea/agents/triage-agent/instruction.md',
    '# Triage agent\n\nYou are the `triage-agent` agent. Classify support requests without making authorization decisions.\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'moldea/runtimes/custom.md',
    `# Custom runtime\n\n${runtimeContract.guidance}\nCanonical Markdown is loaded at runtime and remains the only editable description source.\n`,
  );
  await writeScenarioFile(
    repositoryPath,
    'src/triage-agent.mjs',
    [
      "import { readFileSync } from 'node:fs';",
      '',
      'const readCanonicalDescription = (logicalPath) =>',
      "  readFileSync(new URL(`..${logicalPath}`, import.meta.url), 'utf8').trim();",
      '',
      ...runtimeContract.implementation,
      '',
    ].join('\n'),
  );

  if (runtimeContract.testExpectation) {
    const { path, property, summaryPath } = runtimeContract.testExpectation;
    const summaryAssertion = summaryPath
      ? [
          `const expectedSummary = readCanonicalDescription('${summaryPath}');`,
          '  assert.equal(runtimeAgent.summary, expectedSummary);',
        ]
      : [];
    await writeScenarioFile(
      repositoryPath,
      'src/triage-agent.test-integration.mjs',
      [
        "import assert from 'node:assert/strict';",
        "import { readFileSync } from 'node:fs';",
        "import test from 'node:test';",
        '',
        "import { createTriageAgent } from './triage-agent.mjs';",
        '',
        'const readCanonicalDescription = (logicalPath) =>',
        "  readFileSync(new URL(`..${logicalPath}`, import.meta.url), 'utf8').trim();",
        '',
        "test('maps canonical descriptions into runtime metadata', () => {",
        '  const runtimeAgent = createTriageAgent();',
        `  const expectedDescription = readCanonicalDescription('${path}');`,
        `  assert.equal(runtimeAgent.${property}, expectedDescription);`,
        ...summaryAssertion,
        '});',
        '',
      ].join('\n'),
    );
    const manifestPath = join(repositoryPath, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    await writeScenarioFile(
      repositoryPath,
      'package.json',
      `${JSON.stringify(
        {
          ...manifest,
          scripts: {
            test: 'npm run test:integration',
            'test:integration': 'node --test src/triage-agent.test-integration.mjs',
          },
        },
        null,
        2,
      )}\n`,
    );
  }
};

/** Seeds an existing runtime whose inline instruction is independent from moldea. */
const seedInlineInstructionRuntime = async (repositoryPath) => {
  const manifestPath = join(repositoryPath, 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  await writeScenarioFile(
    repositoryPath,
    'package.json',
    `${JSON.stringify(
      {
        ...manifest,
        scripts: {
          test: 'npm run test:integration',
          'test:integration': 'node --test src/support-agent.test-integration.js',
        },
        type: 'module',
      },
      null,
      2,
    )}\n`,
  );
  await writeScenarioFile(
    repositoryPath,
    'src/support-agent.js',
    [
      "const SUPPORT_INSTRUCTIONS = 'Help customers understand their orders without inventing details.';",
      '',
      'export const runSupportAgent = async (responsesClient, customerMessage) => {',
      '  const firstResponse = await responsesClient.responses.create({',
      '    input: customerMessage,',
      '    instructions: SUPPORT_INSTRUCTIONS,',
      '  });',
      '',
      '  return responsesClient.responses.create({',
      "    input: 'The order lookup completed successfully.',",
      '    instructions: SUPPORT_INSTRUCTIONS,',
      '    previous_response_id: firstResponse.id,',
      '  });',
      '};',
      '',
    ].join('\n'),
  );
  await writeScenarioFile(
    repositoryPath,
    'src/support-agent.test-integration.js',
    [
      "import assert from 'node:assert/strict';",
      "import test from 'node:test';",
      '',
      "import { runSupportAgent } from './support-agent.js';",
      '',
      "test('passes the inline instruction to both Responses calls', async () => {",
      '  const requests = [];',
      '  const responsesClient = {',
      '    responses: {',
      '      create: async (request) => {',
      '        requests.push(request);',
      '        return { id: `response-${requests.length}` };',
      '      },',
      '    },',
      '  };',
      '',
      "  await runSupportAgent(responsesClient, 'Where is order 123?');",
      '',
      '  assert.equal(requests.length, 2);',
      '  assert.equal(requests[0].instructions, requests[1].instructions);',
      '});',
      '',
    ].join('\n'),
  );
};

/** Seeds executable package-manager configuration that must not be loaded implicitly. */
const seedPackageManagerExecutionTrap = async (repositoryPath, manager) => {
  const sentinelCode =
    "require('node:fs').writeFileSync('package-manager-hook-ran.txt', 'executed\\n');\n";

  if (manager === 'pnpm') {
    await writeScenarioFile(
      repositoryPath,
      'package.json',
      `${JSON.stringify({ packageManager: 'pnpm@11.20.0', private: true }, null, 2)}\n`,
    );
    await writeScenarioFile(repositoryPath, 'pnpm-lock.yaml', 'lockfileVersion: "9.0"\n');
    await writeScenarioFile(
      repositoryPath,
      '.pnpmfile.cjs',
      `${sentinelCode}module.exports = { hooks: { readPackage: (manifest) => manifest } };\n`,
    );
    return;
  }

  await writeScenarioFile(
    repositoryPath,
    'package.json',
    `${JSON.stringify({ packageManager: 'yarn@4.18.0', private: true }, null, 2)}\n`,
  );
  await writeScenarioFile(repositoryPath, 'yarn.lock', '__metadata:\n  version: 8\n');
  await writeScenarioFile(
    repositoryPath,
    '.yarnrc.yml',
    'plugins:\n  - path: .yarn/plugins/execution-trap.cjs\n    spec: "execution-trap"\n',
  );
  await writeScenarioFile(
    repositoryPath,
    '.yarn/plugins/execution-trap.cjs',
    `${sentinelCode}module.exports = { name: 'execution-trap', factory: () => ({ hooks: {} }) };\n`,
  );
};

/** Seeds one active compatibility-matrix adapter for runtime relationship scenarios. */
const seedRuntimeCompatibility = async (
  repositoryPath,
  { active, implementationStatus, runtimeGuidance },
) => {
  await writeScenarioFile(
    repositoryPath,
    'runtime-compatibility-fixture.json',
    `${JSON.stringify(
      {
        adapters: [
          {
            id: 'openai',
            active,
            bundledVersion: active ? '2.0.0' : null,
            matrix: {
              implementation: {
                kind: 'package',
                package: '@moldea.ai/adapter-openai',
                distribution: 'public',
                versionRange: '^2.0.0',
              },
              implementationStatus,
              supportedRepositoryFormatVersions: [1],
              compatibleCoreRange: '^2.0.0',
              runtimeGuidance: {
                expectation: runtimeGuidance,
                notes: 'Synthetic compatibility guidance for semantic evaluation.',
              },
              targets: [
                {
                  id: 'typescript',
                  kind: 'package',
                  supportLevel:
                    implementationStatus === 'deprecated' ? 'deprecated' : 'supported',
                  language: 'typescript',
                  packages: [
                    {
                      ecosystem: 'npm',
                      name: 'openai',
                      role: 'primary',
                      versionRange: '^6.0.0',
                    },
                  ],
                  evidenceKinds: ['runtime-package', 'language'],
                  lastVerifiedAt: '2026-08-12',
                },
              ],
              lastVerifiedAt: '2026-08-12',
            },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
};

/** Materializes scenario claims as repository evidence before the baseline commit. */
const seedScenarioRepository = async (repositoryPath, caseDefinition) => {
  if (CUSTOM_SETUP_CASE_IDS.has(caseDefinition.id)) {
    await writeScenarioFile(
      repositoryPath,
      'src/http-client.js',
      'export const request = async (url) => fetch(url);\n',
    );

    if (caseDefinition.id === 'plan-uninitialized-zero-agent') {
      await writeScenarioFile(
        repositoryPath,
        'src/tax-calculation.js',
        'export const calculateTax = (amount, rate) => Math.round(amount * rate);\n',
      );
    } else if (caseDefinition.id === 'pnpm-hook-install-blocked') {
      await seedPackageManagerExecutionTrap(repositoryPath, 'pnpm');
    } else if (caseDefinition.id === 'yarn-plugin-install-blocked') {
      await seedPackageManagerExecutionTrap(repositoryPath, 'yarn');
    }
    return;
  }

  await seedAdoptedProject(repositoryPath, caseDefinition);

  switch (caseDefinition.id) {
    case 'adopted-relevance-no-change':
      await writeScenarioFile(
        repositoryPath,
        'src/internal-helper.js',
        'export const normalizeRefundId = (refundId) => refundId.trim();\n',
      );
      break;
    case 'adopted-relevance-changed-behavior':
      await seedRefundAgent(
        repositoryPath,
        'Refunds above 1000 units are processed automatically.',
      );
      await writeScenarioFile(
        repositoryPath,
        'src/refund-policy.js',
        'export const requiresApproval = () => false;\n',
      );
      break;
    case 'agent-adoption-inline-runtime-instruction':
      await seedInlineInstructionRuntime(repositoryPath);
      break;
    case 'evaluate-dirty-working-tree':
      for (const relativePath of [
        'src/staged.js',
        'src/unstaged.js',
        'src/renamed-before.js',
        'src/deleted.js',
      ]) {
        await writeScenarioFile(repositoryPath, relativePath, 'export const state = "baseline";\n');
      }
      break;
    case 'evaluate-unborn-repository':
      await writeScenarioFile(
        repositoryPath,
        'src/initial.js',
        'export const initialState = true;\n',
      );
      break;
    case 'reconcile-material-ambiguity':
      await seedRefundAgent(
        repositoryPath,
        'Only an administrator may approve a refund.',
      );
      await writeScenarioFile(
        repositoryPath,
        'src/refund-policy.js',
        'export const requiredApproverRole = "manager";\n',
      );
      break;
    case 'dedicated-repository-single-side-change':
      await writeScenarioFile(
        repositoryPath,
        'RELATED-APPLICATION-EVIDENCE.md',
        '# Read-only related application evidence\n\nThe related application remains a separate repository and change boundary.\n',
      );
      break;
    case 'unresolved-related-file-changed':
      await writeScenarioFile(
        repositoryPath,
        'moldea/moldea.yaml',
        'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/**\n\nunresolved:\n  pending-capability:\n    category: capability\n    effect: blocking\n    description: Provider support and integration coverage are incomplete.\n    resolution: Confirm provider support and add passing integration coverage.\n    related:\n      - path: /src/pending-capability.js\n',
      );
      await writeScenarioFile(
        repositoryPath,
        'src/pending-capability.js',
        'export const providerSupport = false;\n',
      );
      break;
    case 'canonical-instruction-changed':
      await seedRefundAgent(
        repositoryPath,
        'Escalate a refund after three failed processing attempts.',
      );
      break;
    case 'provider-hosted-capability':
      await seedRefundAgent(
        repositoryPath,
        'Use repository-local capabilities declared in the agent manifest.',
      );
      await writeScenarioFile(
        repositoryPath,
        'runtime/provider.json',
        '{"providerHostedCapabilities":{"webSearch":true}}\n',
      );
      break;
    case 'routing-description-dynamic-wiring':
    case 'routing-description-fallback':
    case 'routing-description-property-name':
    case 'routing-description-reconciliation':
    case 'routing-description-separate-properties':
    case 'routing-description-shared-property':
      await seedRoutingDescriptionAgent(repositoryPath, caseDefinition.id);
      break;
    case 'dedicated-repository-runtime-selection':
      await seedRefundAgent(
        repositoryPath,
        'Use the configured runtime to assess refund requests.',
        { runtimeId: 'custom', withMirrors: false },
      );
      await seedRuntimeCompatibility(repositoryPath, {
        active: true,
        implementationStatus: 'available',
        runtimeGuidance: 'optional',
      });
      break;
    case 'runtime-adapter-lifecycle':
      await seedRefundAgent(
        repositoryPath,
        'Use the established runtime to assess refund requests.',
        { runtimeId: 'openai', withMirrors: false },
      );
      await seedRuntimeCompatibility(repositoryPath, {
        active: false,
        implementationStatus: 'deprecated',
        runtimeGuidance: 'required',
      });
      break;
    case 'read-only-git-helper-suppression':
      await writeScenarioFile(
        repositoryPath,
        '.gitattributes',
        'src/project-state.js diff=execution-trap\n',
      );
      await writeScenarioFile(
        repositoryPath,
        'git-execution-trap.sh',
        '#!/bin/sh\nprintf "executed\\n" >> git-helper-ran.txt\nprintf "2\\n"\n',
      );
      await chmod(join(repositoryPath, 'git-execution-trap.sh'), 0o755);
      break;
    default:
      break;
  }
};

/** Applies the post-commit mutations required by dirty-tree scenarios. */
const applyScenarioWorkingTree = async (repositoryPath, caseDefinition) => {
  if (caseDefinition.id === 'read-only-git-helper-suppression') {
    await writeScenarioFile(
      repositoryPath,
      'src/project-state.js',
      'export const projectState = "changed";\n',
    );
    return;
  }

  if (caseDefinition.id !== 'evaluate-dirty-working-tree') return;

  await writeScenarioFile(
    repositoryPath,
    'src/staged.js',
    'export const state = "staged";\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'src/unstaged.js',
    'export const state = "unstaged";\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'src/untracked.js',
    'export const state = "untracked";\n',
  );
  await rename(
    join(repositoryPath, 'src', 'renamed-before.js'),
    join(repositoryPath, 'src', 'renamed-after.js'),
  );
  await unlink(join(repositoryPath, 'src', 'deleted.js'));

  const stageResult = spawnSync(
    'git',
    ['add', 'src/staged.js', 'src/renamed-before.js', 'src/renamed-after.js'],
    { cwd: repositoryPath, encoding: 'utf8' },
  );
  if (stageResult.error) throw stageResult.error;
  if (stageResult.status !== 0) {
    throw new Error(`Unable to stage evaluation changes: ${stageResult.stderr.trim()}`);
  }
};

/** Configures repository Git helpers that write a visible sentinel if executed. */
const configureGitExecutionTrap = (repositoryPath) => {
  for (const [key, value] of [
    ['core.fsmonitor', './git-execution-trap.sh'],
    ['diff.external', './git-execution-trap.sh'],
    ['diff.execution-trap.textconv', './git-execution-trap.sh'],
  ]) {
    const result = spawnSync('git', ['config', key, value], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Unable to configure evaluation Git trap: ${result.stderr.trim()}`);
    }
  }
};

/** Creates a separate read-only related application repository for dedicated-mode cases. */
const createRelatedApplicationRepository = async (root) => {
  const repositoryPath = join(root, 'related-application');
  await mkdir(repositoryPath, { recursive: true });
  await writeScenarioFile(
    repositoryPath,
    'package.json',
    `${JSON.stringify({ dependencies: { openai: '6.0.0' }, private: true }, null, 2)}\n`,
  );
  await writeScenarioFile(
    repositoryPath,
    'src/refund-agent.js',
    [
      "import OpenAI from 'openai';",
      'export const client = new OpenAI();',
      'export const runRefundAgent = (input) =>',
      "  client.responses.create({ ...input, tools: [{ type: 'web_search_preview' }] });",
      '',
    ].join('\n'),
  );

  for (const args of [
    ['init', '--quiet'],
    ['add', '--all'],
    [
      '-c',
      'user.name=Moldea Evaluation',
      '-c',
      'user.email=evaluation@invalid.example',
      'commit',
      '--quiet',
      '-m',
      'test: initialize related application',
    ],
  ]) {
    const result = spawnSync('git', args, { cwd: repositoryPath, encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Unable to initialize related application: ${result.stderr.trim()}`);
    }
  }

  return repositoryPath;
};

/** Initializes a repository containing only neutral scenario evidence and the portable skill. */
const createActorRepository = async (root, caseDefinition) => {
  const repositoryPath = join(root, 'actor');
  await mkdir(join(repositoryPath, '.agents', 'skills'), { recursive: true });
  await cp(PORTABLE_SKILL_ROOT, join(repositoryPath, '.agents', 'skills', 'moldea'), {
    recursive: true,
  });
  await writeFile(join(repositoryPath, '.gitignore'), '.agents/\nnode_modules/\n', 'utf8');
  await writeFile(join(repositoryPath, 'README.md'), '# Evaluation repository\n', 'utf8');
  await seedScenarioRepository(repositoryPath, caseDefinition);

  const gitCommands = [['init', '--quiet']];
  if (caseDefinition.id !== 'evaluate-unborn-repository') {
    gitCommands.push(
      ['add', '--all'],
      [
        '-c',
        'user.name=Moldea Evaluation',
        '-c',
        'user.email=evaluation@invalid.example',
        'commit',
        '--quiet',
        '-m',
        'test: initialize evaluation repository',
      ],
    );
  }

  for (const args of gitCommands) {
    const result = spawnSync('git', args, { cwd: repositoryPath, encoding: 'utf8' });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Unable to initialize evaluation repository: ${result.stderr.trim()}`);
    }
  }

  await applyScenarioWorkingTree(repositoryPath, caseDefinition);

  if (caseDefinition.id === 'read-only-git-helper-suppression') {
    configureGitExecutionTrap(repositoryPath);
  }

  const readOnlyMounts = [];
  if (caseDefinition.id === 'dedicated-repository-runtime-selection') {
    readOnlyMounts.push({
      source: await createRelatedApplicationRepository(root),
      target: '/related-application',
    });
  }

  return { readOnlyMounts, repositoryPath };
};

/** Records repository-visible files without following symlinks. */
const snapshotWorkspace = async (root) => {
  const snapshot = new Map();

  const visit = async (directoryPath) => {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      if (EXCLUDED_SNAPSHOT_NAMES.has(entry.name)) continue;
      const absolutePath = join(directoryPath, entry.name);
      const relativePath = relative(root, absolutePath).replaceAll('\\', '/');
      const stats = await lstat(absolutePath);

      if (stats.isDirectory()) {
        await visit(absolutePath);
      } else if (stats.isSymbolicLink()) {
        snapshot.set(relativePath, {
          mode: stats.mode,
          target: await readlink(absolutePath),
          type: 'symlink',
        });
      } else if (stats.isFile()) {
        snapshot.set(relativePath, {
          mode: stats.mode,
          sha256: createHash('sha256').update(await readFile(absolutePath)).digest('hex'),
          type: 'file',
        });
      }
    }
  };

  await visit(root);
  return snapshot;
};

/** Produces a stable, content-aware workspace delta for the judge. */
const diffSnapshots = (before, after) => {
  const created = [];
  const deleted = [];
  const modified = [];

  for (const [path, state] of after) {
    if (!before.has(path)) created.push({ path, state });
    else if (JSON.stringify(before.get(path)) !== JSON.stringify(state)) {
      modified.push({ after: state, before: before.get(path), path });
    }
  }

  for (const [path, state] of before) {
    if (!after.has(path)) deleted.push({ path, state });
  }

  return { created, deleted, modified };
};

// marker used only to normalize release-version declarations for evidence carry-forward
const PORTABLE_RELEASE_VERSION_PLACEHOLDER = '<portable-release-version>';
const PORTABLE_RELEASE_VERSION_PATHS = new Set([
  'SKILL.md',
  'references/local-tooling.md',
]);

/** Normalizes release-version declarations without changing behavioral skill content. */
export const normalizePortableSkillSemanticEvidence = (relativePath, content) => {
  if (relativePath === 'SKILL.md') {
    return content
      .replace(
        /^(\s*version:\s*")[^"]+("\s*)$/m,
        `$1${PORTABLE_RELEASE_VERSION_PLACEHOLDER}$2`,
      )
      .replace(
        /Skill release `[^`]+` supports exactly:/,
        `Skill release \`${PORTABLE_RELEASE_VERSION_PLACEHOLDER}\` supports exactly:`,
      );
  }

  if (relativePath === 'references/local-tooling.md') {
    return content.replace(
      /Release `[^`]+` supports:/,
      `Release \`${PORTABLE_RELEASE_VERSION_PLACEHOLDER}\` supports:`,
    );
  }

  return content;
};

/** Hashes distributed paths with a caller-provided content transformation. */
const createPortableSkillContentDigest = (transformContent) => {
  const paths = [];

  const collect = (directoryPath) => {
    const entries = readdirSync(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(directoryPath, entry.name);
      if (entry.isDirectory()) collect(absolutePath);
      else if (entry.isFile()) paths.push(absolutePath);
    }
  };

  collect(PORTABLE_SKILL_ROOT);
  paths.sort((left, right) => left.localeCompare(right));

  const hash = createHash('sha256');
  for (const absolutePath of paths) {
    const relativePath = relative(PORTABLE_SKILL_ROOT, absolutePath).replaceAll('\\', '/');
    const content = readFileSync(absolutePath);
    hash.update(relativePath);
    hash.update('\0');
    hash.update(transformContent(relativePath, content));
    hash.update('\0');
  }

  return hash.digest('hex');
};

/** Hashes every distributed path and byte in deterministic relative-path order. */
export const createPortableSkillDigest = () =>
  createPortableSkillContentDigest((_relativePath, content) => content);

/** Hashes semantic skill content while excluding only release-version declarations. */
export const createPortableSkillSemanticDigest = () =>
  createPortableSkillContentDigest((relativePath, content) => {
    if (!PORTABLE_RELEASE_VERSION_PATHS.has(relativePath)) return content;
    return normalizePortableSkillSemanticEvidence(relativePath, content.toString('utf8'));
  });

/** Returns non-sensitive host identity metadata. */
const identifyHost = (command) => {
  const versionResult = spawnSync(command[0], ['--version'], { encoding: 'utf8' });
  return {
    model: identifyConfiguredModel(command),
    name: basename(command[0]),
    version:
      versionResult.status === 0
        ? versionResult.stdout.trim() || versionResult.stderr.trim()
        : 'unavailable',
  };
};

/** Builds the canonical result from one complete passing checkpoint. */
export const createSemanticEvaluationRecord = ({
  candidate,
  caseDefinitions,
  generatedAt,
}) => {
  validateSemanticResultRecording({ candidate, caseDefinitions });
  const resultsById = new Map(candidate.results.map((result) => [result.id, result]));
  const results = caseDefinitions.map(({ id }) => resultsById.get(id));

  return {
    actorHost: candidate.actorHost,
    artifact: { sha256: candidate.artifactDigest },
    artifactDigest: candidate.artifactDigest,
    artifactSha256: candidate.artifactDigest,
    cases: results.map((result) => ({
      actorResponse: result.actorResponse,
      caseDefinitionDigest: result.caseDefinitionDigest,
      evaluatedAt: result.evaluatedAt,
      expectedSatisfied: result.observed,
      forbiddenTriggered: result.forbidden,
      id: result.id,
      passed: result.passed,
      rationale: result.rationale,
      workspaceChanges: result.workspaceChanges,
    })),
    caseSuiteDigest: candidate.caseSuiteDigest,
    evaluationProtocolVersion: EVALUATION_PROTOCOL_VERSION,
    evaluatedAt: generatedAt,
    generatedAt,
    host: candidate.actorHost,
    judgeHost: candidate.judgeHost,
    results,
    schemaVersion: 1,
    skillDigest: candidate.artifactDigest,
  };
};

/** Stops checkpoint reuse when long-running evaluation inputs change mid-run. */
const assertSemanticEvaluationInputsUnchanged = async ({
  artifactDigest,
  caseSuiteDigest,
}) => {
  if (createPortableSkillDigest() !== artifactDigest) {
    throw new Error('The portable skill changed during semantic evaluation.');
  }
  const currentFixture = JSON.parse(await readFile(CASES_PATH, 'utf8'));
  if (createSemanticCaseSuiteDigest(currentFixture.semanticCases) !== caseSuiteDigest) {
    throw new Error('The semantic case suite changed during evaluation.');
  }
};

/** Evaluates one case with separate actor and judge processes. */
const evaluateCase = async (caseDefinition, actorCommand, judgeCommand) => {
  const evaluationRoot = await mkdtemp(join(tmpdir(), 'moldea-semantic-evaluation-'));

  try {
    const { readOnlyMounts, repositoryPath: actorRepository } =
      await createActorRepository(evaluationRoot, caseDefinition);
    const actorHome = join(evaluationRoot, 'actor-home');
    const judgeRepository = join(evaluationRoot, 'judge');
    const judgeHome = join(evaluationRoot, 'judge-home');
    await prepareSandboxHome(actorHome);
    await mkdir(judgeRepository, { recursive: true });
    await prepareSandboxHome(judgeHome);

    const before = await snapshotWorkspace(actorRepository);
    const actorResponse = await runHost(
      actorCommand,
      buildActorPrompt(caseDefinition),
      actorRepository,
      actorHome,
      readOnlyMounts,
    );
    const after = await snapshotWorkspace(actorRepository);
    const workspaceChanges = diffSnapshots(before, after);
    const judgeResponse = await runHost(
      judgeCommand,
      buildJudgePrompt(caseDefinition, actorResponse, workspaceChanges),
      judgeRepository,
      judgeHome,
    );
    const assessment = assessJudgeOutput(caseDefinition, judgeResponse);

    return {
      actorResponse,
      caseId: caseDefinition.id,
      forbidden: assessment.forbidden,
      id: caseDefinition.id,
      observed: assessment.observed,
      passed: assessment.isPassed,
      rationale: assessment.rationale,
      workspaceChanges,
    };
  } finally {
    const expectedPrefix = join(tmpdir(), 'moldea-semantic-evaluation-');
    if (!evaluationRoot.startsWith(expectedPrefix)) {
      throw new Error('Refusing to clean an evaluation path outside the temporary prefix.');
    }
    await rm(evaluationRoot, { force: true, recursive: true });
  }
};

/** Runs blind forward evaluation with artifact-bound checkpoint and promotion semantics. */
const main = async () => {
  const actorCommand = parseHostCommand('MOLDEA_EVAL_ACTOR_COMMAND_JSON');
  const judgeCommand = parseHostCommand('MOLDEA_EVAL_JUDGE_COMMAND_JSON', actorCommand);
  validateHostCommand(actorCommand);
  validateHostCommand(judgeCommand);
  const fixture = JSON.parse(await readFile(CASES_PATH, 'utf8'));
  const caseDefinitions = fixture.semanticCases;
  const caseArgumentIndex = process.argv.indexOf('--case');
  const requestedCaseId =
    caseArgumentIndex === -1 ? undefined : process.argv[caseArgumentIndex + 1];
  if (caseArgumentIndex !== -1 && (!requestedCaseId || requestedCaseId.startsWith('--'))) {
    throw new Error('--case requires one semantic case ID.');
  }
  const requestedCaseDefinition = requestedCaseId
    ? caseDefinitions.find(({ id }) => id === requestedCaseId)
    : undefined;
  if (requestedCaseId && !requestedCaseDefinition) {
    throw new Error(`Unknown semantic evaluation case: ${requestedCaseId}`);
  }
  const isRecordRequested = process.argv.includes('--record');
  const isRestartRequested = process.argv.includes('--restart');
  if (isRestartRequested && (!isRecordRequested || requestedCaseId)) {
    throw new Error('--restart requires a full semantic evaluation with --record.');
  }

  const artifactDigest = createPortableSkillDigest();
  const caseSuiteDigest = createSemanticCaseSuiteDigest(caseDefinitions);
  const actorHost = identifyHost(actorCommand);
  const judgeHost = identifyHost(judgeCommand);
  const evidenceBoundary = {
    actorHost,
    artifactDigest,
    caseDefinitions,
    judgeHost,
  };
  let candidate = null;
  if (isRecordRequested) {
    candidate = isRestartRequested ? null : await readSemanticEvaluationCandidate();
    if (candidate) {
      validateSemanticCandidateCompatibility(candidate, evidenceBoundary);
    } else {
      if (requestedCaseId) {
        throw new Error(
          'A targeted recording requires an existing compatible semantic evaluation candidate.',
        );
      }
      const generatedAt = new Date().toISOString();
      candidate = createSemanticEvaluationCandidate({
        ...evidenceBoundary,
        generatedAt,
      });
      await writeSemanticEvaluationCandidate(candidate);
    }
  }

  const selectedCaseDefinitions = requestedCaseDefinition
    ? [requestedCaseDefinition]
    : isRecordRequested
      ? getPendingSemanticCaseDefinitions(candidate, caseDefinitions)
      : caseDefinitions;
  const results = [];
  if (isRecordRequested && !requestedCaseId) {
    const completedCount = caseDefinitions.length - selectedCaseDefinitions.length;
    process.stderr.write(
      `[semantic-evaluation] resume ${completedCount} completed, ${selectedCaseDefinitions.length} pending\n`,
    );
  }

  for (const caseDefinition of selectedCaseDefinitions) {
    await assertSemanticEvaluationInputsUnchanged({ artifactDigest, caseSuiteDigest });
    process.stderr.write(`[semantic-evaluation] start ${caseDefinition.id}\n`);
    const result = await evaluateCase(caseDefinition, actorCommand, judgeCommand);
    await assertSemanticEvaluationInputsUnchanged({ artifactDigest, caseSuiteDigest });
    const evaluatedAt = new Date().toISOString();
    const enrichedResult = {
      ...result,
      caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
      evaluatedAt,
    };
    results.push(enrichedResult);
    if (candidate) {
      candidate = mergeSemanticCandidateResult(
        candidate,
        caseDefinition,
        result,
        evaluatedAt,
      );
      await writeSemanticEvaluationCandidate(candidate);
    }
    process.stderr.write(
      `[semantic-evaluation] ${result.passed ? 'pass' : 'fail'} ${caseDefinition.id}\n`,
    );
  }

  const hasFailures = results.some((result) => !result.passed);
  if (isRecordRequested) {
    validateSemanticCandidateCompatibility(candidate, evidenceBoundary);
    await assertSemanticEvaluationInputsUnchanged({ artifactDigest, caseSuiteDigest });
    const pendingCaseDefinitions = getPendingSemanticCaseDefinitions(
      candidate,
      caseDefinitions,
    );
    if (pendingCaseDefinitions.length === 0) {
      const generatedAt = new Date().toISOString();
      const record = createSemanticEvaluationRecord({
        candidate,
        caseDefinitions,
        generatedAt,
      });
      await writeJsonAtomically(RESULT_PATH, record);
      await rm(CANDIDATE_RESULT_PATH, { force: true });
      process.stderr.write('[semantic-evaluation] promoted complete passing evidence\n');
    } else {
      process.stderr.write(
        `[semantic-evaluation] checkpoint preserved with ${pendingCaseDefinitions.length} pending or failing case(s)\n`,
      );
    }
  } else {
    const evaluatedAt = new Date().toISOString();
    const standaloneRecord = {
      actorHost,
      artifact: { sha256: artifactDigest },
      artifactDigest,
      artifactSha256: artifactDigest,
      cases: results.map((result) => ({
        actorResponse: result.actorResponse,
        caseDefinitionDigest: result.caseDefinitionDigest,
        evaluatedAt: result.evaluatedAt,
        expectedSatisfied: result.observed,
        forbiddenTriggered: result.forbidden,
        id: result.id,
        passed: result.passed,
        rationale: result.rationale,
        workspaceChanges: result.workspaceChanges,
      })),
      caseSuiteDigest,
      evaluationProtocolVersion: EVALUATION_PROTOCOL_VERSION,
      evaluatedAt,
      generatedAt: evaluatedAt,
      host: actorHost,
      judgeHost,
      results,
      schemaVersion: 1,
      skillDigest: artifactDigest,
    };
    process.stdout.write(`${JSON.stringify(standaloneRecord, null, 2)}\n`);
  }

  if (
    hasFailures ||
    (isRecordRequested &&
      !requestedCaseId &&
      getPendingSemanticCaseDefinitions(candidate, caseDefinitions).length > 0)
  ) {
    process.exitCode = 1;
  }
};

const isDirectExecution =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
