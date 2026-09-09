import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { accessSync, constants, readFileSync, realpathSync } from 'node:fs';
import { chmod, copyFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../resource-calibration/profiles.mjs';

import { prepareGitCommandPolicyBoundary } from './git-command-policy-boundary.mjs';

// fixed model contract shared by local evaluation workflows
export const CODEX_EVALUATION_MODEL = 'gpt-5.6-sol';
export const CODEX_EVALUATION_NPM_VERSION = '11.12.1';
export const CODEX_EVALUATION_ACTOR_REASONING_EFFORT = 'xhigh';
export const CODEX_EVALUATION_JUDGE_REASONING_EFFORT = 'xhigh';
const CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS =
  'You are running inside a closed local evaluation workspace. Do not use network clients other ' +
  'than an evaluator-provided fixed local probe required by the current evaluation task. When the ' +
  'task requires current runtime publication evidence, invoke the probe as `curl --fail --silent ' +
  '--show-error --location -- <the exact publication URL named in task-owned instructions>`. Do not ' +
  'perform Git network operations, invoke package managers or installers, call providers ' +
  'or models, use subagents, inspect environment variables or authentication state, access the ' +
  'evaluator home, or access filesystem paths outside the current workspace except evaluator-provided ' +
  'read-only repositories explicitly named by the current task. Required dependencies and fixtures ' +
  'are already present. Host-injected system-skill paths are unavailable; if an exact lookup fails, ' +
  'do not search evaluator home for a substitute. Use only local workspace files and direct local executables. ' +
  'When repository tests are needed, invoke Node directly with explicit repository-relative test paths.';
const CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_CONFIG = JSON.stringify(
  CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS,
);
export const CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256 = createHash('sha256')
  .update(CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS)
  .digest('hex');

export const CODEX_EVALUATION_DEFAULT_HOST_TIMEOUT_MS = 900_000;
export const CODEX_EVALUATION_DEFAULT_ALLOWED_EGRESS_HOSTS = [
  'api.openai.com',
  'auth.openai.com',
  'chatgpt.com',
];
// stable categories for evaluation-host failures
export const CODEX_EVALUATION_HOST_FAILURE_KINDS = {
  Aborted: 'aborted',
  ExecutionFailed: 'execution-failed',
  OutputLimit: 'output-limit',
  ProxyUnavailable: 'proxy-unavailable',
  SpawnFailed: 'spawn-failed',
  TimedOut: 'timed-out',
};
const RETRYABLE_CODEX_EVALUATION_HOST_FAILURE_KINDS = new Set([
  CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
  CODEX_EVALUATION_HOST_FAILURE_KINDS.ProxyUnavailable,
  CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut,
]);
const EGRESS_PROXY_PATH = fileURLToPath(new URL('./proxy.mjs', import.meta.url));
const EGRESS_PROXY_PORT = 3128;
const EGRESS_PROXY_SHUTDOWN_TIMEOUT_MS = 5_000;
const MAX_HOST_OUTPUT_BYTES = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostOutputBytes;
const NODE_EXECUTABLE_PATH = realpathSync(process.execPath);
const REQUIRED_CODEX_FLAGS = [
  '--ephemeral',
  '--ignore-rules',
  '--ignore-user-config',
  '--skip-git-repo-check',
];
const REQUIRED_CODEX_CONFIG = ['shell_environment_policy.inherit=none'];
const REQUIRED_CODEX_FEATURE = 'skip_host_skill_discovery';
const SAFE_HOST_ENVIRONMENT_NAMES = ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'SSL_CERT_FILE'];
const EXCLUDED_WORKSPACE_PATH_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

/** Resolves the runner-owned effort for one closed evaluation role. */
const getCodexEvaluationReasoningEffort = (role) => {
  if (role === 'actor') return CODEX_EVALUATION_ACTOR_REASONING_EFFORT;
  if (role === 'judge') return CODEX_EVALUATION_JUDGE_REASONING_EFFORT;
  throw new Error(`Unsupported Codex evaluation role: ${role}.`);
};

/** Identifies one controlled evaluation-host failure without exposing provider diagnostics. */
export class CodexEvaluationHostError extends Error {
  /**
   * Creates a categorized evaluation-host failure.
   * @param kind The stable failure category.
   * @param message The actionable local diagnostic.
   * @param options Optional native error options.
   */
  constructor(kind, message, options) {
    super(message, options);
    this.name = CodexEvaluationHostError.name;
    this.kind = kind;
  }
}

/** Checks whether an evaluation-host failure can recover without changing evaluator inputs. */
export const isRetryableCodexEvaluationHostError = (error) =>
  error instanceof CodexEvaluationHostError &&
  RETRYABLE_CODEX_EVALUATION_HOST_FAILURE_KINDS.has(error.kind);

/** Resolves safe workspace-relative paths for read-only sandbox overlays. */
const resolveReadOnlyWorkspacePaths = (cwd, paths) =>
  paths.map((path) => {
    if (
      typeof path !== 'string' ||
      path.length === 0 ||
      isAbsolute(path) ||
      path.includes('\\') ||
      path
        .split('/')
        .some(
          (segment) =>
            segment.length === 0 ||
            segment === '.' ||
            segment === '..' ||
            EXCLUDED_WORKSPACE_PATH_NAMES.has(segment),
        )
    ) {
      throw new Error(`Invalid read-only workspace path: ${path}.`);
    }
    const source = resolve(cwd, path);
    const relativeSource = relative(cwd, source);
    if (relativeSource.startsWith('..') || isAbsolute(relativeSource)) {
      throw new Error(`Read-only workspace path escapes the workspace: ${path}.`);
    }
    return { source, target: `/mnt/${path}` };
  });

/**
 * Parses one non-interactive Codex command from an environment variable.
 * @param variableName The environment variable containing a JSON command array.
 * @param fallback The command to use when the variable is absent.
 * @returns The parsed command.
 */
export const parseCodexEvaluationHostCommand = (variableName, fallback) => {
  const rawCommand = process.env[variableName];
  if (!rawCommand) {
    if (fallback) return fallback;
    throw new Error(`${variableName} must contain a JSON command array.`);
  }

  const command = JSON.parse(rawCommand);
  if (
    !Array.isArray(command) ||
    command.length === 0 ||
    command.some((part) => typeof part !== 'string')
  ) {
    throw new Error(`${variableName} must contain a non-empty JSON array of strings.`);
  }

  return command;
};

/** Rejects base commands that could weaken the outer evaluation sandbox. */
const validateBaseHostCommand = (command) => {
  if (basename(command[0]) !== 'codex' || command[1] !== 'exec') {
    throw new Error('Codex evaluation requires a Codex exec host command.');
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

/** Returns every command-level Codex configuration assignment for one exact key. */
const identifyConfiguredValues = (command, key) => {
  const configuredValues = [];
  for (const [index, commandPart] of command.entries()) {
    const assignment =
      commandPart === '-c' || commandPart === '--config'
        ? command[index + 1]
        : commandPart.startsWith('--config=')
          ? commandPart.slice('--config='.length)
          : undefined;
    if (!assignment) continue;

    const separatorIndex = assignment.indexOf('=');
    if (separatorIndex === -1) continue;
    if (assignment.slice(0, separatorIndex).trim() !== key) continue;

    configuredValues.push(assignment.slice(separatorIndex + 1).trim());
  }

  return configuredValues;
};

/** Returns the first non-empty command-level Codex configuration value when present. */
const identifyConfiguredValue = (command, key) =>
  identifyConfiguredValues(command, key).find((configuredValue) => configuredValue !== '');

/**
 * Returns the explicit Codex model in one host command.
 * @param command The complete Codex command.
 * @returns The configured model.
 */
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

  throw new Error('The evaluation host command does not declare its model.');
};

/**
 * Returns the explicit reasoning effort in one host command.
 * @param command The complete Codex command.
 * @returns The configured reasoning effort.
 */
export const identifyConfiguredReasoningEffort = (command) => {
  const configuredEffort = identifyConfiguredValue(command, 'model_reasoning_effort');
  if (configuredEffort) return configuredEffort;

  throw new Error('The evaluation host command does not declare its reasoning effort.');
};

/**
 * Adds the runner-owned model contract to one validated base command.
 * @param command The caller-provided base Codex command.
 * @param role The closed evaluation role that owns reasoning effort.
 * @returns The complete executable command.
 */
export const buildCodexEvaluationHostCommand = (command, role) => {
  validateBaseHostCommand(command);
  const reasoningEffort = getCodexEvaluationReasoningEffort(role);
  const hasModelOverride = command.some(
    (commandPart) =>
      commandPart === '--model' ||
      commandPart === '-m' ||
      commandPart.startsWith('--model=') ||
      commandPart.startsWith('-m='),
  );
  if (hasModelOverride || identifyConfiguredValue(command, 'model')) {
    throw new Error(
      `The evaluation host command must not override the runner-owned ` +
        `${CODEX_EVALUATION_MODEL} model.`,
    );
  }
  if (identifyConfiguredValue(command, 'model_reasoning_effort')) {
    throw new Error(
      'The evaluation host command must not override the runner-owned reasoning effort.',
    );
  }
  if (identifyConfiguredValues(command, 'developer_instructions').length > 0) {
    throw new Error(
      'The evaluation host command must not override the runner-owned developer instructions.',
    );
  }
  if (
    command.some(
      (commandPart, index) =>
        ((commandPart === '--enable' || commandPart === '--disable') &&
          command[index + 1] === REQUIRED_CODEX_FEATURE) ||
        commandPart === `--enable=${REQUIRED_CODEX_FEATURE}` ||
        commandPart === `--disable=${REQUIRED_CODEX_FEATURE}`,
    )
  ) {
    throw new Error('The evaluation host command must not override host skill discovery.');
  }

  const effectiveCommand = [
    ...command.slice(0, -1),
    '--enable',
    REQUIRED_CODEX_FEATURE,
    '--model',
    CODEX_EVALUATION_MODEL,
    '-c',
    `model_reasoning_effort=${reasoningEffort}`,
    '-c',
    `developer_instructions=${CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_CONFIG}`,
    '-',
  ];
  validateCodexEvaluationHostCommand(effectiveCommand, role);

  return effectiveCommand;
};

/**
 * Requires the complete sandbox, model, reasoning, and developer-policy contract.
 * @param command The complete Codex command.
 * @param role The closed evaluation role that owns reasoning effort.
 */
export const validateCodexEvaluationHostCommand = (command, role) => {
  validateBaseHostCommand(command);
  const enabledHostSkillDiscoveryFeatures = command.filter(
    (commandPart, index) =>
      (commandPart === '--enable' && command[index + 1] === REQUIRED_CODEX_FEATURE) ||
      commandPart === `--enable=${REQUIRED_CODEX_FEATURE}`,
  );
  if (
    enabledHostSkillDiscoveryFeatures.length !== 1 ||
    command.some(
      (commandPart, index) =>
        (commandPart === '--disable' && command[index + 1] === REQUIRED_CODEX_FEATURE) ||
        commandPart === `--disable=${REQUIRED_CODEX_FEATURE}`,
    )
  ) {
    throw new Error('Codex evaluation must disable host skill discovery.');
  }
  const reasoningEffort = getCodexEvaluationReasoningEffort(role);
  if (identifyConfiguredModel(command) !== CODEX_EVALUATION_MODEL) {
    throw new Error(`Codex evaluation must use ${CODEX_EVALUATION_MODEL}.`);
  }
  if (identifyConfiguredReasoningEffort(command) !== reasoningEffort) {
    throw new Error(`Codex evaluation ${role} must use ${reasoningEffort} reasoning effort.`);
  }
  const developerInstructions = identifyConfiguredValues(command, 'developer_instructions');
  if (
    developerInstructions.length !== 1 ||
    developerInstructions[0] !== CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_CONFIG
  ) {
    throw new Error('Codex evaluation must use the runner-owned developer instructions.');
  }
};

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

/**
 * Resolves the code-mode companion shipped beside a Codex executable.
 * @param hostExecutable The resolved Codex executable.
 * @returns The resolved companion executable.
 */
export const resolveCodeModeHostPath = (hostExecutable) => {
  const companionPath = join(dirname(hostExecutable), 'codex-code-mode-host');

  try {
    accessSync(companionPath, constants.X_OK);
    return realpathSync(companionPath);
  } catch {
    throw new Error(`Unable to resolve the Codex code-mode host beside ${hostExecutable}.`);
  }
};

/**
 * Returns non-sensitive identity metadata for one configured Codex host.
 * @param command The complete Codex command.
 * @param role The closed evaluation role represented by the command.
 * @returns The host identity recorded with evaluation evidence.
 */
export const identifyCodexEvaluationHost = (command, role) => {
  validateCodexEvaluationHostCommand(command, role);
  const versionResult = spawnSync(command[0], ['--version'], {
    encoding: 'utf8',
  });

  return {
    developerInstructionsSha256: CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
    model: identifyConfiguredModel(command),
    name: basename(command[0]),
    reasoningEffort: identifyConfiguredReasoningEffort(command),
    role,
    version:
      versionResult.status === 0
        ? versionResult.stdout.trim() || versionResult.stderr.trim()
        : 'unavailable',
  };
};

/**
 * Prepares copied authentication state and evaluator-owned command boundaries.
 * @param sandboxHome The disposable home mounted inside Bubblewrap.
 * @returns A promise that resolves after the home is ready.
 */
export const prepareCodexEvaluationHome = async (sandboxHome) => {
  const sandboxCodexHome = join(sandboxHome, '.codex');
  await mkdir(sandboxCodexHome, { recursive: true, mode: 0o700 });
  await mkdir(join(sandboxCodexHome, 'skills'), {
    recursive: true,
    mode: 0o700,
  });
  await mkdir(join(sandboxHome, 'tmp'), { recursive: true, mode: 0o700 });

  const sourceCodexHome = process.env.CODEX_HOME ?? join(homedir(), '.codex');
  try {
    await copyFile(join(sourceCodexHome, 'auth.json'), join(sandboxCodexHome, 'auth.json'));
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }

  const sandboxBinDirectory = join(sandboxHome, 'bin');
  const npmProbePath = join(sandboxBinDirectory, 'npm');
  await mkdir(sandboxBinDirectory, { recursive: true, mode: 0o700 });
  await prepareGitCommandPolicyBoundary(sandboxBinDirectory);
  await writeFile(
    npmProbePath,
    [
      '#!/opt/node',
      'const argumentsList = process.argv.slice(2);',
      "if (argumentsList.length === 1 && ['--version', '-v'].includes(argumentsList[0])) {",
      `  process.stdout.write('${CODEX_EVALUATION_NPM_VERSION}\\n');`,
      '} else {',
      "  process.stderr.write('The evaluation npm probe supports only version checks.\\n');",
      '  process.exitCode = 2;',
      '}',
      '',
    ].join('\n'),
    'utf8',
  );
  await chmod(npmProbePath, 0o755);
};

/** Returns the configured bounded host timeout. */
const getHostTimeoutMs = (defaultHostTimeoutMs) => {
  const configuredTimeout = process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS;
  if (!configuredTimeout) {
    if (!Number.isSafeInteger(defaultHostTimeoutMs) || defaultHostTimeoutMs <= 0) {
      throw new Error('defaultHostTimeoutMs must be a positive integer.');
    }
    return defaultHostTimeoutMs;
  }

  const timeoutMs = Number(configuredTimeout);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('MOLDEA_EVAL_HOST_TIMEOUT_MS must be a positive integer.');
  }
  return timeoutMs;
};

/** Returns exact public HTTPS hosts exposed through the restricted relay. */
const getAllowedEgressHosts = () => {
  const hosts = new Set(CODEX_EVALUATION_DEFAULT_ALLOWED_EGRESS_HOSTS);
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

/**
 * Returns the resolved non-secret configuration that affects host execution.
 * @param options Workflow-specific defaults used when no environment override is present.
 * @returns The resolved host configuration.
 * @throws
 * - If defaultHostTimeoutMs is not a positive integer and no environment override is present
 * - If MOLDEA_EVAL_HOST_TIMEOUT_MS is not a positive integer
 * - If the proxy or host process cannot start
 * - If execution is aborted, times out, exceeds the output limit, or exits unsuccessfully
 */
export const identifyCodexEvaluationHostConfiguration = ({
  defaultHostTimeoutMs = CODEX_EVALUATION_DEFAULT_HOST_TIMEOUT_MS,
} = {}) => ({
  allowedEgressHosts: getAllowedEgressHosts(),
  hostTimeoutMs: getHostTimeoutMs(defaultHostTimeoutMs),
  modelEndpoint: process.env.OPENAI_BASE_URL
    ? {
        origin: new URL(process.env.OPENAI_BASE_URL).origin,
        sha256: createHash('sha256').update(process.env.OPENAI_BASE_URL).digest('hex'),
      }
    : null,
  sslCertificateFileSha256: process.env.SSL_CERT_FILE
    ? createHash('sha256').update(readFileSync(process.env.SSL_CERT_FILE)).digest('hex')
    : null,
});

/**
 * Builds the isolated Bubblewrap invocation for one disposable repository.
 * @param options The host command, mounts, runtime paths, and disposable directories.
 * @returns The Bubblewrap argument list.
 */
export const buildCodexEvaluationBwrapArguments = ({
  command,
  cwd,
  hostCompanionExecutable,
  hostExecutable,
  includeWorkspaceBinaryDirectory = false,
  nodeExecutable = NODE_EXECUTABLE_PATH,
  readOnlyMounts = [],
  readOnlyWorkspacePaths = [],
  sandboxHome,
  statusFileDescriptor,
  workspaceAccess = 'read-write',
}) => {
  const protectedWorkspacePaths = includeWorkspaceBinaryDirectory
    ? [...new Set([...readOnlyWorkspacePaths, 'node_modules'])]
    : readOnlyWorkspacePaths;
  const workspaceOverlays = resolveReadOnlyWorkspacePaths(cwd, protectedWorkspacePaths);

  return [
    '--die-with-parent',
    '--new-session',
    ...(statusFileDescriptor === undefined
      ? []
      : ['--json-status-fd', String(statusFileDescriptor)]),
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
      ? ['--ro-bind', hostCompanionExecutable, '/opt/codex-code-mode-host']
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
    '--ro-bind-try',
    join(sandboxHome, '.codex', 'skills'),
    '/home/evaluator/.codex/skills',
    '--ro-bind',
    join(sandboxHome, 'bin'),
    '/home/evaluator/bin',
    workspaceAccess === 'read-only' ? '--ro-bind' : '--bind',
    cwd,
    '/mnt',
    ...workspaceOverlays.flatMap(({ source, target }) => ['--ro-bind', source, target]),
    ...readOnlyMounts.flatMap(({ source, target }) => [
      '--dir',
      target,
      '--ro-bind',
      source,
      target,
    ]),
    '--bind',
    join(sandboxHome, 'tmp'),
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
    includeWorkspaceBinaryDirectory
      ? '/home/evaluator/bin:/opt:/usr/bin:/bin:/mnt/node_modules/.bin'
      : '/home/evaluator/bin:/opt:/usr/bin:/bin',
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
    `socat TCP-LISTEN:${EGRESS_PROXY_PORT},bind=127.0.0.1,reuseaddr,fork ` +
      'UNIX-CONNECT:/home/evaluator/egress-proxy.sock & exec "$@"',
    'moldea-evaluation-sandbox',
    '/opt/codex',
    ...command.slice(1),
  ];
};

/** Runs Bubblewrap with cancellation, bounded output, and timeout enforcement. */
const runBubblewrapProcess = ({ argumentsList, prompt, signal, timeoutMs }) =>
  new Promise((resolvePromise, rejectPromise) => {
    const sandboxProcess = spawn('bwrap', argumentsList, {
      stdio: ['pipe', 'pipe', 'pipe', 'pipe'],
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    let outputBytes = 0;
    let pendingError = null;
    let hasSettled = false;
    let sandboxChildPid = null;
    let statusOutput = '';

    const killSandbox = () => {
      if (sandboxChildPid !== null) {
        try {
          process.kill(sandboxChildPid, 'SIGKILL');
        } catch {
          // the child may already have exited between status and cancellation
        }
      }
      sandboxProcess.kill('SIGKILL');
    };

    const timeout = setTimeout(() => {
      pendingError = new CodexEvaluationHostError(
        CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut,
        `Evaluation host exceeded ${timeoutMs} milliseconds.`,
      );
      killSandbox();
    }, timeoutMs);

    const abortProcess = () => {
      pendingError = new CodexEvaluationHostError(
        CODEX_EVALUATION_HOST_FAILURE_KINDS.Aborted,
        'Evaluation host execution was aborted.',
      );
      killSandbox();
    };

    const settle = (operation) => {
      if (hasSettled) return;
      hasSettled = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abortProcess);
      operation();
    };

    const captureChunk = (chunks, chunk) => {
      if (pendingError !== null) return;

      if (outputBytes + chunk.byteLength > MAX_HOST_OUTPUT_BYTES) {
        pendingError = new CodexEvaluationHostError(
          CODEX_EVALUATION_HOST_FAILURE_KINDS.OutputLimit,
          `Evaluation host output exceeded ${MAX_HOST_OUTPUT_BYTES} bytes and was stopped.`,
        );
        killSandbox();
        return;
      }
      outputBytes += chunk.byteLength;
      chunks.push(chunk);
    };

    sandboxProcess.stdout.on('data', (chunk) => captureChunk(stdoutChunks, chunk));
    sandboxProcess.stderr.on('data', (chunk) => captureChunk(stderrChunks, chunk));
    sandboxProcess.stdin.on('error', () => {
      // process close owns the actionable exit status and captured diagnostic output
    });
    sandboxProcess.stdio[3].setEncoding('utf8');
    sandboxProcess.stdio[3].on('data', (chunk) => {
      statusOutput += chunk;
      for (const statusLine of statusOutput.split('\n')) {
        if (statusLine.trim() === '') continue;
        try {
          const status = JSON.parse(statusLine);
          if (Number.isSafeInteger(status['child-pid']) && status['child-pid'] > 0) {
            sandboxChildPid = status['child-pid'];
            if (pendingError !== null) killSandbox();
          }
        } catch {
          // wait for the remainder of a potentially partial status document
        }
      }
    });
    sandboxProcess.once('error', (error) =>
      settle(() =>
        rejectPromise(
          new CodexEvaluationHostError(
            CODEX_EVALUATION_HOST_FAILURE_KINDS.SpawnFailed,
            'Evaluation host process could not start.',
            { cause: error },
          ),
        ),
      ),
    );
    sandboxProcess.once('close', (status) => {
      settle(() => {
        if (pendingError !== null) {
          rejectPromise(pendingError);
          return;
        }

        const stdout = Buffer.concat(stdoutChunks).toString('utf8');
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        if (status !== 0) {
          rejectPromise(
            new CodexEvaluationHostError(
              CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
              `Evaluation host failed with exit code ${status}: ${stderr.trim()}`,
            ),
          );
          return;
        }

        resolvePromise(stdout.trim());
      });
    });

    if (signal?.aborted === true) {
      abortProcess();
    } else {
      signal?.addEventListener('abort', abortProcess, { once: true });
    }

    sandboxProcess.stdin.end(prompt, 'utf8');
  });

/** Waits until the restricted egress relay is listening. */
const waitForProxyReady = (proxyProcess) =>
  new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(
      () =>
        rejectPromise(
          new CodexEvaluationHostError(
            CODEX_EVALUATION_HOST_FAILURE_KINDS.ProxyUnavailable,
            'The evaluation egress proxy did not become ready.',
          ),
        ),
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
      else {
        rejectPromise(
          new CodexEvaluationHostError(
            CODEX_EVALUATION_HOST_FAILURE_KINDS.ProxyUnavailable,
            `Unexpected evaluation proxy response: ${stdout.trim()}`,
          ),
        );
      }
    });
    proxyProcess.once('error', (error) => {
      clearTimeout(timeout);
      rejectPromise(
        new CodexEvaluationHostError(
          CODEX_EVALUATION_HOST_FAILURE_KINDS.ProxyUnavailable,
          'The evaluation egress proxy could not start.',
          { cause: error },
        ),
      );
    });
    proxyProcess.once('exit', (status) => {
      clearTimeout(timeout);
      rejectPromise(
        new CodexEvaluationHostError(
          CODEX_EVALUATION_HOST_FAILURE_KINDS.ProxyUnavailable,
          `Evaluation egress proxy exited with ${status}: ${stderr.trim()}`,
        ),
      );
    });
  });

/**
 * Stops the exact evaluation relay without letting an open tunnel keep the runner alive.
 * @param proxyProcess The relay child owned by the current host execution.
 * @param gracePeriodMs The bounded graceful-shutdown period.
 * @returns A promise that resolves after the relay exits or was already closed.
 */
export const stopCodexEvaluationProxyProcess = async (
  proxyProcess,
  gracePeriodMs = EGRESS_PROXY_SHUTDOWN_TIMEOUT_MS,
) => {
  const closePromise = new Promise((resolvePromise) => {
    proxyProcess.once('close', resolvePromise);
  });
  if (proxyProcess.exitCode !== null || proxyProcess.signalCode !== null) return;

  try {
    proxyProcess.kill('SIGTERM');
  } catch {
    return;
  }

  let graceTimeout;
  const didCloseGracefully = await Promise.race([
    closePromise.then(() => true),
    new Promise((resolvePromise) => {
      graceTimeout = setTimeout(() => resolvePromise(false), gracePeriodMs);
      graceTimeout.unref();
    }),
  ]);
  clearTimeout(graceTimeout);
  if (didCloseGracefully || proxyProcess.exitCode !== null || proxyProcess.signalCode !== null) {
    return;
  }

  try {
    proxyProcess.kill('SIGKILL');
  } catch {
    return;
  }
  await closePromise;
};

/**
 * Runs one Codex process with disposable paths and restricted public egress.
 * @param options The command, prompt, workspace, home, and optional read-only mounts.
 * @returns A promise resolving to trimmed host output.
 * @throws
 * - If defaultHostTimeoutMs is not a positive integer and no environment override is present
 * - If MOLDEA_EVAL_HOST_TIMEOUT_MS is not a positive integer
 */
export const runCodexEvaluationHost = async ({
  command,
  cwd,
  defaultHostTimeoutMs = CODEX_EVALUATION_DEFAULT_HOST_TIMEOUT_MS,
  includeWorkspaceBinaryDirectory = false,
  prompt,
  readOnlyMounts = [],
  readOnlyWorkspacePaths = [],
  role,
  sandboxHome,
  signal,
  workspaceAccess = 'read-write',
}) => {
  validateCodexEvaluationHostCommand(command, role);
  if (!['read-only', 'read-write'].includes(workspaceAccess)) {
    throw new Error(`Unsupported evaluation workspace access: ${workspaceAccess}`);
  }
  await mkdir(join(sandboxHome, 'tmp'), { recursive: true, mode: 0o700 });
  await prepareGitCommandPolicyBoundary(join(sandboxHome, 'bin'), {
    trustedReadOnlyDirectoryNames: includeWorkspaceBinaryDirectory ? ['node_modules'] : [],
  });
  const hostExecutable = resolveExecutablePath(command[0]);
  const hostCompanionExecutable = resolveCodeModeHostPath(hostExecutable);
  const hostConfiguration = identifyCodexEvaluationHostConfiguration({
    defaultHostTimeoutMs,
  });
  const proxyProcess = spawn(process.execPath, [EGRESS_PROXY_PATH], {
    env: {
      MOLDEA_EVAL_ALLOWED_HOSTS: hostConfiguration.allowedEgressHosts.join(','),
      MOLDEA_EVAL_PROXY_SOCKET: join(sandboxHome, 'egress-proxy.sock'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForProxyReady(proxyProcess);
    return await runBubblewrapProcess({
      argumentsList: buildCodexEvaluationBwrapArguments({
        command,
        cwd,
        hostCompanionExecutable,
        hostExecutable,
        includeWorkspaceBinaryDirectory,
        nodeExecutable: NODE_EXECUTABLE_PATH,
        readOnlyMounts,
        readOnlyWorkspacePaths,
        sandboxHome,
        statusFileDescriptor: 3,
        workspaceAccess,
      }),
      prompt,
      signal,
      timeoutMs: hostConfiguration.hostTimeoutMs,
    });
  } finally {
    await stopCodexEvaluationProxyProcess(proxyProcess);
  }
};
