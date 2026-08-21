// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildCodexEvaluationBwrapArguments,
  buildCodexEvaluationHostCommand,
  prepareCodexEvaluationHome,
  runCodexEvaluationHost,
} from './host.mjs';

test('sandbox npm probe reports the fixture version and rejects execution commands', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-npm-probe-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(sandboxHome);
  await prepareCodexEvaluationHome(sandboxHome);

  try {
    const result = spawnSync(
      'bwrap',
      buildCodexEvaluationBwrapArguments({
        command: [
          'codex',
          '-c',
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

test('Bubblewrap exposes the Codex code-mode companion beside the host executable', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-code-mode-host-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(sandboxHome);

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
  mkdirSync(sandboxHome);

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
  mkdirSync(sandboxHome);
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
  mkdirSync(sandboxHome);
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

test('Bubblewrap can mount the primary evaluation workspace read-only for judges', () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-read-only-judge-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(sandboxHome);
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

test('shared host cancellation stops the outer Bubblewrap execution', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-host-cancellation-test-'));
  const executableDirectory = join(evaluationRoot, 'bin');
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  const codexPath = join(executableDirectory, 'codex');
  const companionPath = join(executableDirectory, 'codex-code-mode-host');
  mkdirSync(executableDirectory);
  mkdirSync(repositoryPath);
  mkdirSync(sandboxHome);
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
        command: buildCodexEvaluationHostCommand([
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
        ]),
        cwd: repositoryPath,
        prompt: 'test cancellation',
        sandboxHome,
        signal: abortController.signal,
      }),
      /execution was aborted/,
    );
  } finally {
    clearTimeout(abortTimeout);
    if (originalPath === undefined) delete process.env.PATH;
    else process.env.PATH = originalPath;
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});
