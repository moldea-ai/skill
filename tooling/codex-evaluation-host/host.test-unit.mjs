// @vitest-environment node
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildCodexEvaluationBwrapArguments,
  buildCodexEvaluationHostCommand,
  identifyCodexEvaluationHostConfiguration,
  identifyConfiguredModel,
  identifyConfiguredReasoningEffort,
  resolveCodeModeHostPath,
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
const SAFE_HOST_COMMAND = buildCodexEvaluationHostCommand(BASE_HOST_COMMAND);

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

    assert.deepEqual(identifyCodexEvaluationHostConfiguration(), {
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
      sslCertificateFileSha256: 'abffccc2e499fcbd8f543b252e1e7a008c00d333648e38d7d18ea0dad19c2884',
    });
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

test('host commands use the runner-owned model and reasoning effort', () => {
  assert.equal(identifyConfiguredModel(SAFE_HOST_COMMAND), 'gpt-5.6-terra');
  assert.equal(identifyConfiguredReasoningEffort(SAFE_HOST_COMMAND), 'medium');
  assert.throws(
    () =>
      validateCodexEvaluationHostCommand(
        SAFE_HOST_COMMAND.map((commandPart) =>
          commandPart === 'model_reasoning_effort=medium'
            ? 'model_reasoning_effort=high'
            : commandPart,
        ),
      ),
    /must use medium reasoning effort/,
  );
});

test('host commands reject caller-owned model and reasoning overrides', () => {
  assert.throws(
    () =>
      buildCodexEvaluationHostCommand([
        ...BASE_HOST_COMMAND.slice(0, -1),
        '--model',
        'gpt-example',
        '-',
      ]),
    /must not override the runner-owned gpt-5\.6-terra model/,
  );
  assert.throws(
    () =>
      buildCodexEvaluationHostCommand([
        ...BASE_HOST_COMMAND.slice(0, -1),
        '--config=model=gpt-example',
        '-',
      ]),
    /must not override the runner-owned gpt-5\.6-terra model/,
  );
  assert.throws(
    () =>
      buildCodexEvaluationHostCommand([
        ...BASE_HOST_COMMAND.slice(0, -1),
        '-c',
        'model_reasoning_effort=high',
        '-',
      ]),
    /must not override the runner-owned reasoning effort/,
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
    argumentsList.includes('/mnt/node_modules/.bin:/home/evaluator/bin:/opt:/usr/bin:/bin'),
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
  assert.doesNotThrow(() => validateCodexEvaluationHostCommand(SAFE_HOST_COMMAND));
  assert.throws(
    () =>
      validateCodexEvaluationHostCommand([
        ...SAFE_HOST_COMMAND.slice(0, -1),
        '--sandbox',
        'workspace-write',
        '-',
      ]),
    /sandbox-weakening/,
  );
});

test('host command rejects writable paths outside the workspace', () => {
  assert.throws(
    () =>
      validateCodexEvaluationHostCommand([
        ...SAFE_HOST_COMMAND.slice(0, -1),
        '--add-dir',
        '/host',
        '-',
      ]),
    /sandbox-weakening/,
  );
});

test('host command rejects missing external-sandbox delegation', () => {
  assert.throws(
    () =>
      validateCodexEvaluationHostCommand(
        SAFE_HOST_COMMAND.filter((part) => part !== '--dangerously-bypass-approvals-and-sandbox'),
      ),
    /outer sandbox/,
  );
});
