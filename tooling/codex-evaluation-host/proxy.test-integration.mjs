// @vitest-environment node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('relay closes promptly while a client connection is active', async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'moldea-proxy-shutdown-test-'));
  const socketPath = join(temporaryDirectory, 'proxy.sock');
  const proxyProcess = spawn(
    process.execPath,
    [fileURLToPath(new URL('./proxy.mjs', import.meta.url))],
    {
      env: {
        MOLDEA_EVAL_ALLOWED_HOSTS: 'api.openai.com',
        MOLDEA_EVAL_PROXY_SOCKET: socketPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let clientSocket;
  let shutdownTimeout;

  try {
    const [readyOutput] = await once(proxyProcess.stdout, 'data');
    assert.equal(readyOutput.toString('utf8'), 'ready\n');
    clientSocket = connect(socketPath);
    await once(clientSocket, 'connect');
    const clientClosePromise = once(clientSocket, 'close');
    const proxyClosePromise = once(proxyProcess, 'close');

    proxyProcess.kill('SIGTERM');

    const [, [exitCode, signalCode]] = await Promise.race([
      Promise.all([clientClosePromise, proxyClosePromise]),
      new Promise((_, rejectPromise) => {
        shutdownTimeout = setTimeout(
          () => rejectPromise(new Error('The active relay did not close within 2 seconds.')),
          2_000,
        );
        shutdownTimeout.unref();
      }),
    ]);
    clearTimeout(shutdownTimeout);
    assert.equal(exitCode, 0);
    assert.equal(signalCode, null);
  } finally {
    clearTimeout(shutdownTimeout);
    clientSocket?.destroy();
    if (proxyProcess.exitCode === null && proxyProcess.signalCode === null) {
      proxyProcess.kill('SIGKILL');
      await once(proxyProcess, 'close');
    }
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
