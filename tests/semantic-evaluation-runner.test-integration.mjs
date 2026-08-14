// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildBwrapArguments,
  prepareSandboxHome,
  seedSemanticTooling,
} from './semantic-evaluation-runner.mjs';

test('semantic actors execute the copied published CLI closure', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-published-cli-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  mkdirSync(repositoryPath);

  try {
    await seedSemanticTooling(repositoryPath, { id: 'adopted-relevance-no-change' });
    const packageManifest = JSON.parse(
      readFileSync(join(repositoryPath, 'package.json'), 'utf8'),
    );
    const cliManifest = JSON.parse(
      readFileSync(
        join(repositoryPath, 'node_modules', '@moldea.ai', 'cli', 'package.json'),
        'utf8',
      ),
    );
    const binaryPath = join(repositoryPath, 'node_modules', '.bin', 'moldea');
    const versionResult = spawnSync(binaryPath, ['--version'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const compatibilityResult = spawnSync(binaryPath, ['compatibility', '--json'], {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    const compatibilityEnvelope = JSON.parse(compatibilityResult.stdout);

    assert.deepEqual(packageManifest.devDependencies, { '@moldea.ai/cli': '1.0.1' });
    assert.equal(cliManifest.bin.moldea, './dist/moldea.js');
    assert.equal(versionResult.status, 0, versionResult.stderr);
    assert.equal(versionResult.stdout.trim(), '1.0.1');
    assert.equal(compatibilityResult.status, 0, compatibilityResult.stderr);
    assert.deepEqual(compatibilityEnvelope.result.packages, [
      { name: '@moldea.ai/core', version: '1.0.1' },
      { name: '@moldea.ai/repository', version: '1.0.1' },
      { name: '@moldea.ai/repository-fs', version: '1.0.1' },
    ]);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});

test('sandbox npm probe reports the fixture version and rejects execution commands', async () => {
  const evaluationRoot = mkdtempSync(join(tmpdir(), 'moldea-npm-probe-test-'));
  const repositoryPath = join(evaluationRoot, 'repository');
  const sandboxHome = join(evaluationRoot, 'home');
  mkdirSync(repositoryPath);
  mkdirSync(sandboxHome);
  await prepareSandboxHome(sandboxHome);

  try {
    const result = spawnSync(
      'bwrap',
      buildBwrapArguments({
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
      buildBwrapArguments({
        command: [
          'codex',
          '-c',
          'test -x /opt/codex-code-mode-host && /opt/codex-code-mode-host',
        ],
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
      buildBwrapArguments({
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
      buildBwrapArguments({
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
      buildBwrapArguments({
        command: ['codex', '--eval', probe],
        cwd: repositoryPath,
        hostExecutable: process.execPath,
        readOnlyMounts: [
          { source: relatedRepositoryPath, target: '/related-application' },
        ],
        sandboxHome,
      }),
      { encoding: 'utf8', timeout: 2_000 },
    );
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(evaluationRoot, { force: true, recursive: true });
  }
});
