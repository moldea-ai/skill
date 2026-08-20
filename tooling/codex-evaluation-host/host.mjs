import { spawn, spawnSync } from 'node:child_process';
import { accessSync, constants, realpathSync } from 'node:fs';
import { chmod, copyFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// fixed model contract shared by local evaluation workflows
export const CODEX_EVALUATION_MODEL = 'gpt-5.6-terra';
export const CODEX_EVALUATION_NPM_VERSION = '11.12.1';
export const CODEX_EVALUATION_REASONING_EFFORT = 'medium';

const DEFAULT_HOST_TIMEOUT_MS = 120_000;
const DEFAULT_ALLOWED_EGRESS_HOSTS = ['api.openai.com', 'auth.openai.com', 'chatgpt.com'];
const EGRESS_PROXY_PATH = fileURLToPath(new URL('./proxy.mjs', import.meta.url));
const EGRESS_PROXY_PORT = 3128;
const NODE_EXECUTABLE_PATH = realpathSync(process.execPath);
const REQUIRED_CODEX_FLAGS = [
  '--ephemeral',
  '--ignore-rules',
  '--ignore-user-config',
  '--skip-git-repo-check',
];
const REQUIRED_CODEX_CONFIG = ['shell_environment_policy.inherit=none'];
const SAFE_HOST_ENVIRONMENT_NAMES = ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'SSL_CERT_FILE'];

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

/** Returns one command-level Codex configuration assignment when present. */
const identifyConfiguredValue = (command, key) => {
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

    const configuredValue = assignment.slice(separatorIndex + 1).trim();
    if (configuredValue) return configuredValue;
  }

  return undefined;
};

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
 * @returns The complete executable command.
 */
export const buildCodexEvaluationHostCommand = (command) => {
  validateBaseHostCommand(command);
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

  const effectiveCommand = [
    ...command.slice(0, -1),
    '--model',
    CODEX_EVALUATION_MODEL,
    '-c',
    `model_reasoning_effort=${CODEX_EVALUATION_REASONING_EFFORT}`,
    '-',
  ];
  validateCodexEvaluationHostCommand(effectiveCommand);

  return effectiveCommand;
};

/**
 * Requires the complete sandbox, model, and reasoning contract.
 * @param command The complete Codex command.
 */
export const validateCodexEvaluationHostCommand = (command) => {
  validateBaseHostCommand(command);
  if (identifyConfiguredModel(command) !== CODEX_EVALUATION_MODEL) {
    throw new Error(`Codex evaluation must use ${CODEX_EVALUATION_MODEL}.`);
  }
  if (identifyConfiguredReasoningEffort(command) !== CODEX_EVALUATION_REASONING_EFFORT) {
    throw new Error(
      `Codex evaluation must use ${CODEX_EVALUATION_REASONING_EFFORT} reasoning effort.`,
    );
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
 * @returns The host identity recorded with evaluation evidence.
 */
export const identifyCodexEvaluationHost = (command) => {
  const versionResult = spawnSync(command[0], ['--version'], { encoding: 'utf8' });

  return {
    model: identifyConfiguredModel(command),
    name: basename(command[0]),
    reasoningEffort: identifyConfiguredReasoningEffort(command),
    version:
      versionResult.status === 0
        ? versionResult.stdout.trim() || versionResult.stderr.trim()
        : 'unavailable',
  };
};

/**
 * Prepares copied authentication state and a non-installing npm probe.
 * @param sandboxHome The disposable home mounted inside Bubblewrap.
 * @returns A promise that resolves after the home is ready.
 */
export const prepareCodexEvaluationHome = async (sandboxHome) => {
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
      'const argumentsList = process.argv.slice(2);',
      "if (argumentsList.length === 1 && " +
        "['--version', '-v'].includes(argumentsList[0])) {",
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
const getHostTimeoutMs = () => {
  const configuredTimeout = process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS;
  if (!configuredTimeout) return DEFAULT_HOST_TIMEOUT_MS;

  const timeoutMs = Number(configuredTimeout);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('MOLDEA_EVAL_HOST_TIMEOUT_MS must be a positive integer.');
  }
  return timeoutMs;
};

/** Returns exact public HTTPS hosts exposed through the restricted relay. */
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
  '--bind',
  cwd,
  '/mnt',
  ...readOnlyMounts.flatMap(({ source, target }) => ['--dir', target, '--ro-bind', source, target]),
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
  `socat TCP-LISTEN:${EGRESS_PROXY_PORT},bind=127.0.0.1,reuseaddr,fork ` +
    'UNIX-CONNECT:/home/evaluator/egress-proxy.sock & exec "$@"',
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
      rejectPromise(new Error(`Evaluation egress proxy exited with ${status}: ${stderr.trim()}`));
    });
  });

/**
 * Runs one Codex process with disposable paths and restricted public egress.
 * @param options The command, prompt, workspace, home, and optional read-only mounts.
 * @returns A promise resolving to trimmed host output.
 */
export const runCodexEvaluationHost = async ({
  command,
  cwd,
  prompt,
  readOnlyMounts = [],
  sandboxHome,
}) => {
  validateCodexEvaluationHostCommand(command);
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
    const timeoutMs = getHostTimeoutMs();
    const result = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
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
        timeout: timeoutMs,
      },
    );

    if (result.error) {
      if ('code' in result.error && result.error.code === 'ETIMEDOUT') {
        throw new Error(`Evaluation host exceeded ${timeoutMs} milliseconds.`);
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
