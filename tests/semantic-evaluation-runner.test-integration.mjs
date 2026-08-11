// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { buildBwrapArguments } from './semantic-evaluation-runner.mjs';

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
