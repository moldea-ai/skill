// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CodexEvaluationHostError,
  buildCodexEvaluationBwrapArguments,
  buildCodexEvaluationHostCommand,
  prepareCodexEvaluationHome,
  runCodexEvaluationHost,
} from './host.mjs';

const HOST_COMMAND = buildCodexEvaluationHostCommand([
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
]);

// exact helper-suppressed status shape accepted by the evaluator Git boundary
const APPROVED_GIT_STATUS_ARGUMENTS = [
  '-c',
  'core.fsmonitor=false',
  '-c',
  'core.pager=cat',
  '-c',
  'core.attributesFile=/dev/null',
  '-c',
  'filter.lfs.clean=',
  '-c',
  'filter.lfs.process=',
  '-c',
  'filter.lfs.smudge=',
  '-c',
  'filter.lfs.required=false',
  '--no-pager',
  'status',
  '--porcelain=v2',
  '-z',
  '--ignore-submodules=all',
];

const runSystemGit = (repositoryPath, argumentsList) => {
  const result = spawnSync('/usr/bin/git', argumentsList, {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
};

test('sandbox npm probe is immutable, reports the fixture version, and rejects execution', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-npm-probe-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(join(sandboxHome, 'bin'), { recursive: true });
  await prepareCodexEvaluationHome(sandboxHome);

  try {
    const result = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: [
          'codex',
          '-c',
          'test "$(npm --version)" = "11.12.1" && ' +
            "! sed -i '2c modified' /home/evaluator/bin/npm 2>/dev/null && " +
            'test "$(npm --version)" = "11.12.1" && ! npm install example-package',
        ],
        cwd: repositoryPath,
        hostExecutable: realpathSync('/bin/sh'),
        nodeExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('qualification actor PATH enforces the Git boundary over repository helpers', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-qualification-git-boundary-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  const fsmonitorSentinelPath = join(repositoryPath, 'git-fsmonitor-ran.txt');
  const filterSentinelPath = join(repositoryPath, 'git-filter-ran.txt');
  mkdirSync(repositoryPath);
  mkdirSync(join(repositoryPath, 'node_modules'));
  runSystemGit(repositoryPath, ['init', '--quiet']);
  writeFileSync(
    join(repositoryPath, 'git-fsmonitor.sh'),
    '#!/bin/sh\nprintf "executed\\n" > git-fsmonitor-ran.txt\n',
    'utf8',
  );
  writeFileSync(
    join(repositoryPath, 'git-filter.sh'),
    '#!/bin/sh\nprintf "executed\\n" > git-filter-ran.txt\ncat\n',
    'utf8',
  );
  chmodSync(join(repositoryPath, 'git-fsmonitor.sh'), 0o755);
  chmodSync(join(repositoryPath, 'git-filter.sh'), 0o755);
  runSystemGit(repositoryPath, ['config', 'core.fsmonitor', './git-fsmonitor.sh']);
  runSystemGit(repositoryPath, ['config', 'filter.execution-trap.clean', './git-filter.sh']);
  await prepareCodexEvaluationHome(sandboxHome);

  try {
    const approvedResult = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: [
          'codex',
          '-c',
          `test "$(command -v git)" = "/home/evaluator/bin/git" && git ${APPROVED_GIT_STATUS_ARGUMENTS.join(' ')}`,
        ],
        cwd: repositoryPath,
        hostExecutable: realpathSync('/bin/sh'),
        includeWorkspaceBinaryDirectory: true,
        nodeExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );

    assert.equal(approvedResult.status, 0, approvedResult.stderr);
    assert.equal(existsSync(fsmonitorSentinelPath), false);

    writeFileSync(join(repositoryPath, '.gitattributes'), '*.js filter=execution-trap\n', 'utf8');
    const blockedResult = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: ['codex', '-c', `git ${APPROVED_GIT_STATUS_ARGUMENTS.join(' ')}`],
        cwd: repositoryPath,
        hostExecutable: realpathSync('/bin/sh'),
        includeWorkspaceBinaryDirectory: true,
        nodeExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );

    assert.equal(blockedResult.status, 2);
    assert.match(blockedResult.stderr, /repository attribute safety was not established/u);
    assert.equal(existsSync(filterSentinelPath), false);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('shared host aligns the Git traversal budget with its read-only dependency mount', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-host-dependency-boundary-test-'));
  const executableDirectory = join(evaluationRoot, 'bin');
  const repositoryPath = join(evaluationRoot, 'repository');
  const dependencyDirectoryPath = join(repositoryPath, 'node_modules');
  const sandboxHome = join(evaluationRoot, 'home');
  const codexPath = join(executableDirectory, 'codex');
  const companionPath = join(executableDirectory, 'codex-code-mode-host');
  mkdirSync(executableDirectory);
  mkdirSync(dependencyDirectoryPath, { recursive: true });
  runSystemGit(repositoryPath, ['init', '--quiet']);
  for (let entryIndex = 0; entryIndex < 4_097; entryIndex += 1) {
    writeFileSync(join(dependencyDirectoryPath, `entry-${entryIndex}`), '');
  }
  writeFileSync(
    codexPath,
    `#!/bin/sh\ngit ${APPROVED_GIT_STATUS_ARGUMENTS.join(' ')} >/dev/null\nprintf "host success\\n"\n`,
  );
  writeFileSync(companionPath, '#!/bin/sh\nexit 0\n');
  chmodSync(codexPath, 0o755);
  chmodSync(companionPath, 0o755);
  await prepareCodexEvaluationHome(sandboxHome);
  const originalPath = process.env.PATH;
  process.env.PATH = `${executableDirectory}:${originalPath ?? ''}`;

  try {
    assert.equal(
      await runCodexEvaluationHost({
        command: HOST_COMMAND,
        cwd: repositoryPath,
        includeWorkspaceBinaryDirectory: true,
        prompt: 'test dependency boundary',
        sandboxHome,
      }),
      'host success',
    );
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('shared host permits the installed release CLI selected scope inventory', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-host-cli-scope-test-'));
  const executableDirectory = join(evaluationRoot, 'bin');
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  const codexPath = join(executableDirectory, 'codex');
  const companionPath = join(executableDirectory, 'codex-code-mode-host');
  mkdirSync(executableDirectory);
  mkdirSync(join(repositoryPath, 'moldea'), { recursive: true });
  mkdirSync(join(repositoryPath, 'src'));
  writeFileSync(join(repositoryPath, 'README.md'), '# Evaluation repository\n');
  writeFileSync(
    join(repositoryPath, 'moldea', 'moldea.yaml'),
    'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/project-state.js\n',
  );
  writeFileSync(join(repositoryPath, 'moldea', 'project.md'), '# Evaluation project\n');
  writeFileSync(join(repositoryPath, 'src', 'project-state.js'), 'export const state = true;\n');
  runSystemGit(repositoryPath, ['init', '--quiet']);
  runSystemGit(repositoryPath, ['add', '--all']);
  runSystemGit(repositoryPath, [
    '-c',
    'user.name=moldea evaluation',
    '-c',
    'user.email=evaluation@invalid.example',
    'commit',
    '--quiet',
    '-m',
    'test: initialize selected scope fixture',
  ]);
  writeFileSync(
    codexPath,
    '#!/bin/sh\nprintf "/src/project-state.js\\0" | /dependencies/node_modules/.bin/moldea scope --paths-stdin --json --max-output-bytes 65536\n',
  );
  writeFileSync(companionPath, '#!/bin/sh\nexit 0\n');
  chmodSync(codexPath, 0o755);
  chmodSync(companionPath, 0o755);
  await prepareCodexEvaluationHome(sandboxHome);
  const originalPath = process.env.PATH;
  process.env.PATH = `${executableDirectory}:${originalPath ?? ''}`;

  try {
    const output = await runCodexEvaluationHost({
      command: HOST_COMMAND,
      cwd: repositoryPath,
      prompt: 'test installed release CLI scope',
      readOnlyMounts: [
        {
          source: join(process.cwd(), 'node_modules'),
          target: '/dependencies/node_modules',
        },
      ],
      sandboxHome,
    });
    const envelope = JSON.parse(output);

    assert.equal(envelope.cliVersion, '7.0.0');
    assert.equal(envelope.command, 'scope');
    assert.equal(envelope.error, null);
    assert.equal(envelope.result.relevant, true);
    assert.equal(envelope.status, 'valid');
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('evaluator and system commands precede immutable workspace binaries on sandbox PATH', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-path-precedence-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const workspaceBinDirectory = join(repositoryPath, 'node_modules', '.bin');
  const sandboxHome = join(evaluationRoot, 'home');
  const evaluatorBinDirectory = join(sandboxHome, 'bin');
  mkdirSync(workspaceBinDirectory, { recursive: true });
  mkdirSync(evaluatorBinDirectory, { recursive: true });

  const executableName = 'path-precedence-probe';
  const workspaceExecutablePath = join(workspaceBinDirectory, executableName);
  const evaluatorExecutablePath = join(evaluatorBinDirectory, executableName);
  const workspaceSedPath = join(workspaceBinDirectory, 'sed');
  writeFileSync(workspaceExecutablePath, '#!/bin/sh\nexit 10\n', 'utf8');
  writeFileSync(evaluatorExecutablePath, '#!/bin/sh\nexit 0\n', 'utf8');
  writeFileSync(workspaceSedPath, '#!/bin/sh\nexit 11\n', 'utf8');
  chmodSync(workspaceExecutablePath, 0o755);
  chmodSync(evaluatorExecutablePath, 0o755);
  chmodSync(workspaceSedPath, 0o755);

  try {
    const result = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: [
          'codex',
          '-c',
          `${executableName} && sed --version >/dev/null && ` +
            "! /usr/bin/sed -i '2c exit 0' /mnt/node_modules/.bin/sed 2>/dev/null",
        ],
        cwd: repositoryPath,
        hostExecutable: realpathSync('/bin/sh'),
        includeWorkspaceBinaryDirectory: true,
        nodeExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('Bubblewrap exposes the Codex code-mode companion beside the host executable', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-code-mode-host-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(join(sandboxHome, 'bin'), { recursive: true });

  try {
    const result = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: ['codex', '-c', 'test -x /opt/codex-code-mode-host && /opt/codex-code-mode-host'],
        cwd: repositoryPath,
        hostCompanionExecutable: realpathSync('/bin/true'),
        hostExecutable: realpathSync('/bin/sh'),
        nodeExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('Bubblewrap exposes the exact host Node runtime through its isolated PATH', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-node-runtime-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(join(sandboxHome, 'bin'), { recursive: true });

  const probe = `
    const { spawnSync } = require('node:child_process');
    const result = spawnSync('node', [
      '--eval',
      'if (process.execPath !== "/opt/node") process.exit(10)',
    ]);
    if (result.error) process.exit(11);
    process.exit(result.status ?? 12);
  `;

  try {
    const result = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: ['codex', '--eval', probe],
        cwd: repositoryPath,
        hostExecutable: process.execPath,
        nodeExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('Bubblewrap cannot observe host state or connect to host localhost', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-sandbox-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  const hostMarkerRoot = mkdtempSync('/var/tmp/moldea-host-marker-');
  const hostMarkerPath = join(hostMarkerRoot, 'marker');
  mkdirSync(repositoryPath);
  mkdirSync(join(sandboxHome, 'bin'), { recursive: true });
  writeFileSync(hostMarkerPath, 'host-only');

  const server = createServer();
  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  const probe = `
    const { existsSync } = require('node:fs');
    const { connect } = require('node:net');
    if (existsSync(${JSON.stringify(hostMarkerPath)})) process.exit(10);
    const socket = connect({ host: '127.0.0.1', port: ${address.port} });
    socket.setTimeout(500);
    socket.once('connect', () => process.exit(11));
    socket.once('error', () => process.exit(0));
    socket.once('timeout', () => process.exit(0));
  `;

  try {
    const result = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: ['codex', '--eval', probe],
        cwd: repositoryPath,
        hostExecutable: process.execPath,
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    await new Promise((resolvePromise, rejectPromise) =>
      server.close((error) => (error ? rejectPromise(error) : resolvePromise())),
    );
    rmSync(evaluationRoot, { force: true, recursive: true });
    rmSync(hostMarkerRoot, { force: true, recursive: true });
  }
});

test('Bubblewrap exposes related repositories without write authority', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-related-repository-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const relatedRepositoryPath = join(evaluationRoot, 'related-application');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(relatedRepositoryPath);
  mkdirSync(join(sandboxHome, 'bin'), { recursive: true });
  writeFileSync(join(relatedRepositoryPath, 'marker'), 'related');

  const probe = `
    const { readFileSync, writeFileSync } = require('node:fs');
    if (readFileSync('/related-application/marker', 'utf8') !== 'related') process.exit(10);
    try {
      writeFileSync('/related-application/created', 'unexpected');
      process.exit(11);
    } catch (error) {
      if (!['EACCES', 'EROFS'].includes(error.code)) process.exit(12);
    }
  `;

  try {
    const result = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: ['codex', '--eval', probe],
        cwd: repositoryPath,
        hostExecutable: process.execPath,
        readOnlyMounts: [{ source: relatedRepositoryPath, target: '/related-application' }],
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('Bubblewrap keeps the workspace writable except for evaluator-owned control paths', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-control-overlay-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(join(repositoryPath, '.git'), { recursive: true });
  mkdirSync(join(repositoryPath, '.agents', 'skills', 'moldea'), {
    recursive: true,
  });
  mkdirSync(join(sandboxHome, 'bin'), { recursive: true });
  writeFileSync(join(repositoryPath, '.git', 'config'), 'protected');
  writeFileSync(join(repositoryPath, '.agents', 'skills', 'moldea', 'SKILL.md'), 'protected');
  writeFileSync(join(repositoryPath, 'editable.txt'), 'before');

  const probe = `
    printf 'after' > editable.txt
    if printf 'unexpected' > .git/config 2>/dev/null; then exit 10; fi
    if printf 'unexpected' > .agents/skills/moldea/SKILL.md 2>/dev/null; then exit 11; fi
    test "$(cat editable.txt)" = "after"
  `;

  try {
    const result = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: ['codex', '-c', probe],
        cwd: repositoryPath,
        hostExecutable: realpathSync('/bin/sh'),
        nodeExecutable: process.execPath,
        readOnlyWorkspacePaths: ['.git', '.agents/skills/moldea'],
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('Bubblewrap can mount the primary evaluation workspace read-only for judges', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-read-only-judge-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(join(sandboxHome, 'bin'), { recursive: true });
  writeFileSync(join(repositoryPath, 'marker'), 'judge input');

  const probe = `
    if printf 'unexpected' > marker 2>/dev/null; then
      exit 10
    fi
    test "$(cat marker)" = "judge input"
  `;

  try {
    const result = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: ['codex', '-c', probe],
        cwd: repositoryPath,
        hostExecutable: realpathSync('/bin/sh'),
        nodeExecutable: process.execPath,
        sandboxHome,
        workspaceAccess: 'read-only',
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('shared host closes its relay after successful and failed executions', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-host-completion-test-'));
  const executableDirectory = join(evaluationRoot, 'bin');
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  const codexPath = join(executableDirectory, 'codex');
  const companionPath = join(executableDirectory, 'codex-code-mode-host');
  mkdirSync(executableDirectory);
  mkdirSync(repositoryPath);
  mkdirSync(join(sandboxHome, 'bin'), { recursive: true });
  writeFileSync(companionPath, '#!/bin/sh\nexit 0\n');
  chmodSync(companionPath, 0o755);
  await prepareCodexEvaluationHome(sandboxHome);
  const originalPath = process.env.PATH;
  process.env.PATH = `${executableDirectory}:${originalPath ?? ''}`;

  try {
    writeFileSync(codexPath, '#!/bin/sh\nprintf "host success\\n"\n');
    chmodSync(codexPath, 0o755);
    assert.equal(
      await runCodexEvaluationHost({
        command: HOST_COMMAND,
        cwd: repositoryPath,
        prompt: 'test success',
        sandboxHome,
      }),
      'host success',
    );

    writeFileSync(codexPath, '#!/bin/sh\nprintf "host failure\\n" >&2\nexit 7\n');
    await assert.rejects(
      runCodexEvaluationHost({
        command: HOST_COMMAND,
        cwd: repositoryPath,
        prompt: 'test failure',
        sandboxHome,
      }),
      (error) =>
        error instanceof CodexEvaluationHostError &&
        error.kind === CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed &&
        /Evaluation host failed with exit code 7: host failure/.test(error.message),
    );
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('shared host cancellation stops the outer Bubblewrap execution', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-host-cancellation-test-'));
  const executableDirectory = join(evaluationRoot, 'bin');
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  const codexPath = join(executableDirectory, 'codex');
  const companionPath = join(executableDirectory, 'codex-code-mode-host');
  mkdirSync(executableDirectory);
  mkdirSync(repositoryPath);
  mkdirSync(join(sandboxHome, 'bin'), { recursive: true });
  writeFileSync(codexPath, '#!/bin/sh\nsleep 10\n');
  writeFileSync(companionPath, '#!/bin/sh\nexit 0\n');
  chmodSync(codexPath, 0o755);
  chmodSync(companionPath, 0o755);
  await prepareCodexEvaluationHome(sandboxHome);
  const originalPath = process.env.PATH;
  process.env.PATH = `${executableDirectory}:${originalPath ?? ''}`;
  const abortController = new AbortController();
  const abortTimeout = setTimeout(() => abortController.abort(), 50);

  try {
    await assert.rejects(
      runCodexEvaluationHost({
        command: HOST_COMMAND,
        cwd: repositoryPath,
        prompt: 'test cancellation',
        sandboxHome,
        signal: abortController.signal,
      }),
      (error) =>
        error instanceof CodexEvaluationHostError &&
        error.kind === CODEX_EVALUATION_HOST_FAILURE_KINDS.Aborted &&
        /execution was aborted/.test(error.message),
    );
  } finally {
    clearTimeout(abortTimeout);
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('shared host enforces a workflow-owned default timeout', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-host-timeout-test-'));
  const executableDirectory = join(evaluationRoot, 'bin');
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  const codexPath = join(executableDirectory, 'codex');
  const companionPath = join(executableDirectory, 'codex-code-mode-host');
  mkdirSync(executableDirectory);
  mkdirSync(repositoryPath);
  mkdirSync(join(sandboxHome, 'bin'), { recursive: true });
  writeFileSync(codexPath, '#!/bin/sh\nsleep 10\n');
  writeFileSync(companionPath, '#!/bin/sh\nexit 0\n');
  chmodSync(codexPath, 0o755);
  chmodSync(companionPath, 0o755);
  await prepareCodexEvaluationHome(sandboxHome);
  const originalPath = process.env.PATH;
  process.env.PATH = `${executableDirectory}:${originalPath ?? ''}`;

  try {
    await assert.rejects(
      runCodexEvaluationHost({
        command: HOST_COMMAND,
        cwd: repositoryPath,
        defaultHostTimeoutMs: 50,
        prompt: 'test timeout',
        sandboxHome,
      }),
      (error) =>
        error instanceof CodexEvaluationHostError &&
        error.kind === CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut &&
        /Evaluation host exceeded 50 milliseconds/.test(error.message),
    );
  } finally {
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});
