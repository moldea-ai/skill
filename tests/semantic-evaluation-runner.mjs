import { createHash } from 'node:crypto';
import {
  accessSync,
  constants,
  readdirSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import {
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
import { basename, delimiter, dirname, join, relative, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTABLE_SKILL_ROOT = join(REPOSITORY_ROOT, 'moldea');
const CASES_PATH = join(REPOSITORY_ROOT, 'fixtures', 'conformance-cases.json');
const RESULT_PATH = join(REPOSITORY_ROOT, 'fixtures', 'semantic-evaluation-result.json');
const FAKE_CLI_ROOT = join(REPOSITORY_ROOT, 'fixtures', 'tooling', 'fake-cli');
const EGRESS_PROXY_PATH = join(REPOSITORY_ROOT, 'tests', 'semantic-evaluation-proxy.mjs');
const EXCLUDED_SNAPSHOT_NAMES = new Set(['.agents', '.git']);
const DEFAULT_HOST_TIMEOUT_MS = 120_000;
const DEFAULT_ALLOWED_EGRESS_HOSTS = ['api.openai.com', 'auth.openai.com', 'chatgpt.com'];
const EGRESS_PROXY_PORT = 3128;
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

/** Copies only authentication state into the disposable host home. */
const prepareSandboxHome = async (sandboxHome) => {
  const sandboxCodexHome = join(sandboxHome, '.codex');
  await mkdir(sandboxCodexHome, { recursive: true, mode: 0o700 });

  const sourceCodexHome = process.env.CODEX_HOME ?? join(homedir(), '.codex');
  try {
    await copyFile(join(sourceCodexHome, 'auth.json'), join(sandboxCodexHome, 'auth.json'));
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }
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
export const buildBwrapArguments = ({ command, cwd, hostExecutable, sandboxHome }) => [
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
  '/opt:/usr/bin:/bin',
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
const runHost = async (command, prompt, cwd, sandboxHome) => {
  validateHostCommand(command);
  const hostExecutable = resolveExecutablePath(command[0]);
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
      buildBwrapArguments({ command, cwd, hostExecutable, sandboxHome }),
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

/** Installs the exact deterministic CLI fixture without lifecycle scripts. */
const seedLocalTooling = async (repositoryPath) => {
  await writeScenarioFile(
    repositoryPath,
    'package.json',
    `${JSON.stringify(
      {
        devDependencies: { '@moldea.ai/cli': '1.0.0' },
        packageManager: 'npm@11.12.1',
        private: true,
      },
      null,
      2,
    )}\n`,
  );
  const installedCliPath = join(repositoryPath, 'node_modules', '@moldea.ai', 'cli');
  await mkdir(dirname(installedCliPath), { recursive: true });
  await cp(FAKE_CLI_ROOT, installedCliPath, { recursive: true });
  const binDirectory = join(repositoryPath, 'node_modules', '.bin');
  await mkdir(binDirectory, { recursive: true });
  await symlink('../@moldea.ai/cli/bin/moldea.js', join(binDirectory, 'moldea'));
};

/** Seeds the minimum adopted project state used by semantic cases. */
const seedAdoptedProject = async (repositoryPath) => {
  await seedLocalTooling(repositoryPath);
  await writeScenarioFile(
    repositoryPath,
    'README.md',
    '# Evaluation repository\n\n<!-- moldea:start -->\nThis repository uses moldea.\n<!-- moldea:end -->\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'moldea/moldea.yaml',
    'schemaVersion: 1\nproject:\n  name: Evaluation Project\n  context: project.md\naffectedBy:\n  - src/**\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'moldea/project.md',
    '# Evaluation Project\n\nThe current implementation and declared agent behavior must remain aligned.\n',
  );
};

/** Seeds one canonical instruction and its declared exact mirrors. */
const seedRefundAgent = async (repositoryPath, instruction) => {
  await writeScenarioFile(
    repositoryPath,
    'moldea/agents/refund-agent/description.md',
    '# Refund agent\n\nHandles refund authorization requests.\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'moldea/agents/refund-agent/agent.yaml',
    'name: refund-agent\ninstruction: instruction.md\nmirrors:\n  - runtime/refund-agent.md\n  - docs/refund-agent.md\n',
  );
  for (const relativePath of [
    'moldea/agents/refund-agent/instruction.md',
    'runtime/refund-agent.md',
    'docs/refund-agent.md',
  ]) {
    await writeScenarioFile(repositoryPath, relativePath, instruction);
  }
};

/** Materializes scenario claims as repository evidence before the baseline commit. */
const seedScenarioRepository = async (repositoryPath, caseDefinition) => {
  if (
    !caseDefinition.scenario ||
    [
      'pnpm-pnp-local-cli-provider',
      'unadopted-relevance-no-initialization',
      'yarn-conflicting-cli-provider',
    ].includes(caseDefinition.id)
  ) {
    await writeScenarioFile(
      repositoryPath,
      'src/http-client.js',
      'export const request = async (url) => fetch(url);\n',
    );
    return;
  }

  await seedAdoptedProject(repositoryPath);

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
        '# Instructions\n\nRefunds above 1000 units are processed automatically.\n',
      );
      await writeScenarioFile(
        repositoryPath,
        'src/refund-policy.js',
        'export const requiresApproval = () => false;\n',
      );
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
        '# Instructions\n\nOnly an administrator may approve a refund.\n',
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
        'moldea/unresolved/pending-capability.md',
        '# Pending capability\n\nRemain unresolved until both provider support and integration coverage exist.\n',
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
        '# Instructions\n\nEscalate a refund after three failed processing attempts.\n',
      );
      break;
    case 'provider-hosted-capability':
      await seedRefundAgent(
        repositoryPath,
        '# Instructions\n\nUse repository-local capabilities declared in the agent manifest.\n',
      );
      await writeScenarioFile(
        repositoryPath,
        'runtime/provider.json',
        '{"providerHostedCapabilities":{"webSearch":true}}\n',
      );
      break;
    default:
      break;
  }
};

/** Applies the post-commit mutations required by dirty-tree scenarios. */
const applyScenarioWorkingTree = async (repositoryPath, caseDefinition) => {
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

  return repositoryPath;
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

/** Hashes every distributed path and byte in deterministic relative-path order. */
export const createPortableSkillDigest = () => {
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
    hash.update(relative(PORTABLE_SKILL_ROOT, absolutePath).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(readFileSync(absolutePath));
    hash.update('\0');
  }

  return hash.digest('hex');
};

/** Returns non-sensitive host identity metadata. */
const identifyHost = (command) => {
  const versionResult = spawnSync(command[0], ['--version'], { encoding: 'utf8' });
  return {
    name: basename(command[0]),
    version:
      versionResult.status === 0
        ? versionResult.stdout.trim() || versionResult.stderr.trim()
        : 'unavailable',
  };
};

/** Evaluates one case with separate actor and judge processes. */
const evaluateCase = async (caseDefinition, actorCommand, judgeCommand) => {
  const evaluationRoot = await mkdtemp(join(tmpdir(), 'moldea-semantic-evaluation-'));

  try {
    const actorRepository = await createActorRepository(evaluationRoot, caseDefinition);
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

/** Runs blind forward evaluation and optionally records the digest-bound result. */
const main = async () => {
  const actorCommand = parseHostCommand('MOLDEA_EVAL_ACTOR_COMMAND_JSON');
  const judgeCommand = parseHostCommand('MOLDEA_EVAL_JUDGE_COMMAND_JSON', actorCommand);
  validateHostCommand(actorCommand);
  validateHostCommand(judgeCommand);
  const fixture = JSON.parse(await readFile(CASES_PATH, 'utf8'));
  const caseArgumentIndex = process.argv.indexOf('--case');
  const requestedCaseId =
    caseArgumentIndex === -1 ? undefined : process.argv[caseArgumentIndex + 1];
  const caseDefinitions = requestedCaseId
    ? fixture.semanticCases.filter(({ id }) => id === requestedCaseId)
    : fixture.semanticCases;
  if (caseDefinitions.length === 0) {
    throw new Error(`Unknown semantic evaluation case: ${requestedCaseId}`);
  }
  const results = [];

  for (const caseDefinition of caseDefinitions) {
    results.push(await evaluateCase(caseDefinition, actorCommand, judgeCommand));
  }

  const artifactDigest = createPortableSkillDigest();
  const actorHost = identifyHost(actorCommand);
  const judgeHost = identifyHost(judgeCommand);
  const evaluatedAt = new Date().toISOString();
  const record = {
    actorHost,
    artifact: { sha256: artifactDigest },
    artifactDigest,
    artifactSha256: artifactDigest,
    cases: results.map((result) => ({
      actorResponse: result.actorResponse,
      expectedSatisfied: result.observed,
      forbiddenTriggered: result.forbidden,
      id: result.id,
      passed: result.passed,
      rationale: result.rationale,
      workspaceChanges: result.workspaceChanges,
    })),
    evaluationProtocolVersion: 2,
    evaluatedAt,
    generatedAt: evaluatedAt,
    host: actorHost,
    judgeHost,
    results,
    schemaVersion: 1,
    skillDigest: artifactDigest,
  };

  if (process.argv.includes('--record')) {
    await writeFile(RESULT_PATH, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  } else {
    process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  }

  if (results.some((result) => !result.passed)) process.exitCode = 1;
};

const isDirectExecution =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
