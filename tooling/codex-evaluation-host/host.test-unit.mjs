// @vitest-environment node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildCodexEvaluationBwrapArguments,
  buildCodexEvaluationHostCommand,
  CODEX_EVALUATION_DEFAULT_HOST_TIMEOUT_MS,
  CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CodexEvaluationHostError,
  identifyCodexEvaluationHostConfiguration,
  identifyConfiguredModel,
  identifyConfiguredReasoningEffort,
  isRetryableCodexEvaluationHostError,
  resolveCodeModeHostPath,
  stopCodexEvaluationProxyProcess,
  validateCodexEvaluationHostCommand,
} from './host.mjs';

const BASE_HOST_COMMAND = [
  'codex',
  'exec',
  '--ignore-user-config',
  '--ignore-rules',
  '--ephemeral',
  '--skip-git-repo-check',
  '--dangerously-bypass-approvals-and-sandbox',
  '-c',
  'shell_environment_policy.inherit=none',
  '-',
];
const SAFE_HOST_COMMAND = buildCodexEvaluationHostCommand(BASE_HOST_COMMAND, 'actor');

test('host failures expose stable retryable and terminal categories', () => {
  assert.equal(
    isRetryableCodexEvaluationHostError(
      new CodexEvaluationHostError(
        CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
        'Provider request failed.',
      ),
    ),
    true,
  );
  assert.equal(
    isRetryableCodexEvaluationHostError(
      new CodexEvaluationHostError(
        CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut,
        'Provider request timed out.',
      ),
    ),
    true,
  );
  assert.equal(
    isRetryableCodexEvaluationHostError(
      new CodexEvaluationHostError(
        CODEX_EVALUATION_HOST_FAILURE_KINDS.OutputLimit,
        'Host output exceeded its limit.',
      ),
    ),
    false,
  );
  assert.equal(isRetryableCodexEvaluationHostError(new Error('Unknown failure.')), false);
});

test('host configuration resolves every non-secret execution setting', () => {
  const originalAllowedHosts = process.env.MOLDEA_EVAL_ALLOWED_HOSTS;
  const originalBaseUrl = process.env.OPENAI_BASE_URL;
  const originalSslCertificateFile = process.env.SSL_CERT_FILE;
  const originalTimeout = process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS;
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'moldea-host-configuration-'));
  const certificateFile = join(temporaryDirectory, 'certificate.pem');

  try {
    writeFileSync(certificateFile, 'fixture certificate\n', 'utf8');
    process.env.MOLDEA_EVAL_ALLOWED_HOSTS = 'registry.example.com,api.openai.com';
    process.env.OPENAI_BASE_URL = 'https://gateway.example.com/v1';
    process.env.SSL_CERT_FILE = certificateFile;
    process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS = '240000';

    assert.deepEqual(
      identifyCodexEvaluationHostConfiguration({
        defaultHostTimeoutMs: 300_000,
      }),
      {
        allowedEgressHosts: [
          'api.openai.com',
          'auth.openai.com',
          'chatgpt.com',
          'gateway.example.com',
          'registry.example.com',
        ],
        hostTimeoutMs: 240_000,
        modelEndpoint: {
          origin: 'https://gateway.example.com',
          sha256: '2467c53b1babc443bf5bd26d6e2bf571499a5e6324bae883d466c67157b51c25',
        },
        sslCertificateFileSha256:
          'abffccc2e499fcbd8f543b252e1e7a008c00d333648e38d7d18ea0dad19c2884',
      },
    );
  } finally {
    if (originalAllowedHosts === undefined) delete process.env.MOLDEA_EVAL_ALLOWED_HOSTS;
    else process.env.MOLDEA_EVAL_ALLOWED_HOSTS = originalAllowedHosts;
    if (originalBaseUrl === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = originalBaseUrl;
    if (originalSslCertificateFile === undefined) delete process.env.SSL_CERT_FILE;
    else process.env.SSL_CERT_FILE = originalSslCertificateFile;
    if (originalTimeout === undefined) delete process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS;
    else process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS = originalTimeout;
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});

test('host configuration accepts a workflow-owned default timeout', () => {
  const originalTimeout = process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS;

  try {
    delete process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS;

    assert.equal(CODEX_EVALUATION_DEFAULT_HOST_TIMEOUT_MS, 900_000);
    assert.equal(
      identifyCodexEvaluationHostConfiguration().hostTimeoutMs,
      CODEX_EVALUATION_DEFAULT_HOST_TIMEOUT_MS,
    );
    assert.equal(
      identifyCodexEvaluationHostConfiguration({
        defaultHostTimeoutMs: 600_000,
      }).hostTimeoutMs,
      600_000,
    );
    assert.throws(
      () => identifyCodexEvaluationHostConfiguration({ defaultHostTimeoutMs: 0 }),
      /defaultHostTimeoutMs must be a positive integer/,
    );
  } finally {
    if (originalTimeout === undefined) delete process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS;
    else process.env.MOLDEA_EVAL_HOST_TIMEOUT_MS = originalTimeout;
  }
});

test('host commands use the runner-owned model and role-specific reasoning effort', () => {
  assert.equal(identifyConfiguredModel(SAFE_HOST_COMMAND), 'gpt-5.6-sol');
  assert.equal(identifyConfiguredReasoningEffort(SAFE_HOST_COMMAND), 'high');
  assert.equal(
    identifyConfiguredReasoningEffort(buildCodexEvaluationHostCommand(BASE_HOST_COMMAND, 'judge')),
    'xhigh',
  );
  assert.throws(
    () =>
      validateCodexEvaluationHostCommand(
        SAFE_HOST_COMMAND.map((commandPart) =>
          commandPart === 'model_reasoning_effort=high'
            ? 'model_reasoning_effort=medium'
            : commandPart,
        ),
        'actor',
      ),
    /must use high reasoning effort/,
  );
});

test('host commands carry one neutral runner-owned developer policy and exact digest', () => {
  const assignments = SAFE_HOST_COMMAND.flatMap((commandPart, index) =>
    commandPart === '-c' || commandPart === '--config' ? [SAFE_HOST_COMMAND[index + 1]] : [],
  ).filter((assignment) => assignment?.startsWith('developer_instructions='));

  assert.equal(assignments.length, 1);
  const instruction = JSON.parse(assignments[0].slice('developer_instructions='.length));
  assert.match(instruction, /closed local evaluation workspace/u);
  assert.match(instruction, /Do not use network clients/u);
  assert.match(instruction, /invoke package managers or installers/u);
  assert.match(instruction, /access filesystem paths outside the current workspace/u);
  assert.doesNotMatch(instruction, /moldea|scenario|criterion|adapter/u);
  assert.equal(
    createHash('sha256').update(instruction).digest('hex'),
    CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
  );
  assert.deepEqual(
    buildCodexEvaluationHostCommand(BASE_HOST_COMMAND, 'judge').filter((commandPart) =>
      commandPart.startsWith('developer_instructions='),
    ),
    assignments,
  );
});

test('host commands reject caller-owned model, reasoning, and developer-policy overrides', () => {
  assert.throws(
    () =>
      buildCodexEvaluationHostCommand(
        [...BASE_HOST_COMMAND.slice(0, -1), '--model', 'gpt-example', '-'],
        'actor',
      ),
    /must not override the runner-owned gpt-5\.6-sol model/,
  );
  assert.throws(
    () =>
      buildCodexEvaluationHostCommand(
        [...BASE_HOST_COMMAND.slice(0, -1), '--config=model=gpt-example', '-'],
        'actor',
      ),
    /must not override the runner-owned gpt-5\.6-sol model/,
  );
  assert.throws(
    () =>
      buildCodexEvaluationHostCommand(
        [...BASE_HOST_COMMAND.slice(0, -1), '-c', 'model_reasoning_effort=high', '-'],
        'actor',
      ),
    /must not override the runner-owned reasoning effort/,
  );
  for (const configuredValue of ['"Different policy."', '']) {
    assert.throws(
      () =>
        buildCodexEvaluationHostCommand(
          [
            ...BASE_HOST_COMMAND.slice(0, -1),
            '-c',
            `developer_instructions=${configuredValue}`,
            '-',
          ],
          'actor',
        ),
      /must not override the runner-owned developer instructions/,
    );
  }
  const duplicatedPolicyCommand = [
    ...SAFE_HOST_COMMAND.slice(0, -1),
    '-c',
    SAFE_HOST_COMMAND.find((commandPart) => commandPart.startsWith('developer_instructions=')),
    '-',
  ];
  assert.throws(
    () => validateCodexEvaluationHostCommand(duplicatedPolicyCommand, 'actor'),
    /must use the runner-owned developer instructions/,
  );
});

test('code-mode host resolves only from the Codex executable directory', () => {
  const executableDirectory = mkdtempSync(join(tmpdir(), 'moldea-codex-bundle-test-'));
  const hostExecutable = join(executableDirectory, 'codex');
  const companionExecutable = join(executableDirectory, 'codex-code-mode-host');
  writeFileSync(hostExecutable, 'host');
  writeFileSync(companionExecutable, 'companion');
  chmodSync(companionExecutable, 0o755);

  try {
    assert.equal(resolveCodeModeHostPath(hostExecutable), companionExecutable);
    rmSync(companionExecutable);
    assert.throws(() => resolveCodeModeHostPath(hostExecutable), /code-mode host/);
  } finally {
    rmSync(executableDirectory, { force: true, recursive: true });
  }
});

test('sandbox uses an empty root, isolated network, and restricted relay', () => {
  const argumentsList = buildCodexEvaluationBwrapArguments({
    command: SAFE_HOST_COMMAND,
    cwd: '/tmp/evaluation',
    hostCompanionExecutable: '/runtime/codex-code-mode-host',
    hostExecutable: '/usr/bin/codex',
    nodeExecutable: '/runtime/node',
    sandboxHome: '/tmp/evaluation-home',
  });
  assert.deepEqual(argumentsList.slice(0, 2), ['--die-with-parent', '--new-session']);
  assert.ok(argumentsList.includes('--unshare-net'));
  assert.ok(
    argumentsList.some((part) => part.includes('TCP-LISTEN:3128,bind=127.0.0.1,reuseaddr,fork')),
  );
  assert.ok(
    argumentsList.some((part) => part.includes('UNIX-CONNECT:/home/evaluator/egress-proxy.sock')),
  );
  assert.equal(
    argumentsList.some((part, index) => part === '--ro-bind' && argumentsList[index + 1] === '/'),
    false,
  );
  assert.ok(
    argumentsList.some(
      (part, index) =>
        part === '--ro-bind' &&
        argumentsList[index + 1] === '/runtime/codex-code-mode-host' &&
        argumentsList[index + 2] === '/opt/codex-code-mode-host',
    ),
  );
  assert.ok(
    argumentsList.some(
      (part, index) =>
        part === '--ro-bind' &&
        argumentsList[index + 1] === '/runtime/node' &&
        argumentsList[index + 2] === '/opt/node',
    ),
  );
  const writableHomeMountIndex = argumentsList.findIndex(
    (part, index) =>
      part === '--bind' &&
      argumentsList[index + 1] === '/tmp/evaluation-home' &&
      argumentsList[index + 2] === '/home/evaluator',
  );
  const readOnlyBinaryMountIndex = argumentsList.findIndex(
    (part, index) =>
      part === '--ro-bind' &&
      argumentsList[index + 1] === '/tmp/evaluation-home/bin' &&
      argumentsList[index + 2] === '/home/evaluator/bin',
  );
  assert.notEqual(writableHomeMountIndex, -1);
  assert.ok(readOnlyBinaryMountIndex > writableHomeMountIndex);
  assert.ok(argumentsList.includes('/home/evaluator/bin:/opt:/usr/bin:/bin'));
});

test('sandbox mounts related repositories read-only', () => {
  const argumentsList = buildCodexEvaluationBwrapArguments({
    command: SAFE_HOST_COMMAND,
    cwd: '/tmp/evaluation',
    hostExecutable: '/usr/bin/codex',
    readOnlyMounts: [
      {
        source: '/tmp/related-application',
        target: '/related-application',
      },
    ],
    sandboxHome: '/tmp/evaluation-home',
  });
  const mountIndex = argumentsList.findIndex(
    (part, index) =>
      part === '--ro-bind' && argumentsList[index + 1] === '/tmp/related-application',
  );

  assert.notEqual(mountIndex, -1);
  assert.equal(argumentsList[mountIndex + 2], '/related-application');
  assert.equal(
    argumentsList.some(
      (part, index) => part === '--bind' && argumentsList[index + 1] === '/tmp/related-application',
    ),
    false,
  );
});

test('sandbox overlays selected workspace paths read-only and rejects unsafe paths', () => {
  const argumentsList = buildCodexEvaluationBwrapArguments({
    command: SAFE_HOST_COMMAND,
    cwd: '/tmp/evaluation',
    hostExecutable: '/usr/bin/codex',
    readOnlyWorkspacePaths: ['.git', '.agents/skills/moldea'],
    sandboxHome: '/tmp/evaluation-home',
  });

  for (const path of ['.git', '.agents/skills/moldea']) {
    assert.ok(
      argumentsList.some(
        (part, index) =>
          part === '--ro-bind' &&
          argumentsList[index + 1] === `/tmp/evaluation/${path}` &&
          argumentsList[index + 2] === `/mnt/${path}`,
      ),
    );
  }
  for (const path of ['../outside', '/absolute', '_backup/evidence', 'nested//path']) {
    assert.throws(
      () =>
        buildCodexEvaluationBwrapArguments({
          command: SAFE_HOST_COMMAND,
          cwd: '/tmp/evaluation',
          hostExecutable: '/usr/bin/codex',
          readOnlyWorkspacePaths: [path],
          sandboxHome: '/tmp/evaluation-home',
        }),
      /Invalid read-only workspace path/,
    );
  }
});

test('sandbox can expose the project-local binary directory and mount the workspace read-only', () => {
  const argumentsList = buildCodexEvaluationBwrapArguments({
    command: SAFE_HOST_COMMAND,
    cwd: '/tmp/evaluation',
    hostExecutable: '/usr/bin/codex',
    includeWorkspaceBinaryDirectory: true,
    sandboxHome: '/tmp/evaluation-home',
    workspaceAccess: 'read-only',
  });

  assert.ok(
    argumentsList.includes('/home/evaluator/bin:/opt:/usr/bin:/bin:/mnt/node_modules/.bin'),
  );
  assert.ok(
    argumentsList.some(
      (part, index) =>
        part === '--ro-bind' &&
        argumentsList[index + 1] === '/tmp/evaluation/node_modules' &&
        argumentsList[index + 2] === '/mnt/node_modules',
    ),
  );
  assert.ok(
    argumentsList.some(
      (part, index) =>
        part === '--ro-bind' &&
        argumentsList[index + 1] === '/tmp/evaluation' &&
        argumentsList[index + 2] === '/mnt',
    ),
  );
  assert.equal(
    argumentsList.some(
      (part, index) => part === '--bind' && argumentsList[index + 1] === '/tmp/evaluation',
    ),
    false,
  );
});

test('host command requires externally sandboxed execution mode', () => {
  assert.doesNotThrow(() => validateCodexEvaluationHostCommand(SAFE_HOST_COMMAND, 'actor'));
  assert.throws(
    () =>
      validateCodexEvaluationHostCommand(
        [...SAFE_HOST_COMMAND.slice(0, -1), '--sandbox', 'workspace-write', '-'],
        'actor',
      ),
    /sandbox-weakening/,
  );
});

test('host command rejects writable paths outside the workspace', () => {
  assert.throws(
    () =>
      validateCodexEvaluationHostCommand(
        [...SAFE_HOST_COMMAND.slice(0, -1), '--add-dir', '/host', '-'],
        'actor',
      ),
    /sandbox-weakening/,
  );
});

test('host command rejects missing external-sandbox delegation', () => {
  assert.throws(
    () =>
      validateCodexEvaluationHostCommand(
        SAFE_HOST_COMMAND.filter((part) => part !== '--dangerously-bypass-approvals-and-sandbox'),
        'actor',
      ),
    /outer sandbox/,
  );
});

test('proxy shutdown handles graceful, stubborn, and already-exited children', async () => {
  const gracefulProcess = spawn(
    process.execPath,
    [
      '--eval',
      "process.once('SIGTERM', () => process.exit(0)); process.stdout.write('ready'); setInterval(() => {}, 1_000);",
    ],
    { stdio: ['ignore', 'pipe', 'ignore'] },
  );
  await once(gracefulProcess.stdout, 'data');
  await stopCodexEvaluationProxyProcess(gracefulProcess, 25);
  assert.equal(gracefulProcess.exitCode, 0);

  const stubbornProcess = spawn(
    process.execPath,
    [
      '--eval',
      "process.once('SIGTERM', () => {}); process.stdout.write('ready'); setInterval(() => {}, 1_000);",
    ],
    { stdio: ['ignore', 'pipe', 'ignore'] },
  );
  await once(stubbornProcess.stdout, 'data');
  await stopCodexEvaluationProxyProcess(stubbornProcess, 25);
  assert.equal(stubbornProcess.signalCode, 'SIGKILL');

  const exitedProcess = spawn(process.execPath, ['--eval', 'process.exit(0)']);
  await once(exitedProcess, 'close');
  await stopCodexEvaluationProxyProcess(exitedProcess, 25);
  assert.equal(exitedProcess.exitCode, 0);
});
