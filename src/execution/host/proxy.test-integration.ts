// @vitest-environment node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { connect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

/** Waits for relay shutdown while accepting the reset produced by forced socket destruction. */
const waitForClientShutdown = (clientSocket: Socket): Promise<void> =>
  new Promise<void>((resolvePromise, rejectPromise) => {
    clientSocket.once('error', (error) => {
      if ((error as NodeJS.ErrnoException).code !== 'ECONNRESET') rejectPromise(error);
    });
    clientSocket.once('close', () => resolvePromise());
  });

test('relay closes promptly while a client connection is active', async () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'moldea-proxy-shutdown-test-'));
  const socketPath = join(temporaryDirectory, 'proxy.sock');
  const proxyProcess = spawn(
    process.execPath,
    [fileURLToPath(new URL('./proxy.ts', import.meta.url))],
    {
      env: {
        MOLDEA_EVAL_ALLOWED_HOSTS: 'api.openai.com',
        MOLDEA_EVAL_PROXY_SOCKET: socketPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let clientSocket: Socket | undefined;
  let shutdownTimeout: NodeJS.Timeout | undefined;

  try {
    const readyOutput = await new Promise<Buffer>((resolvePromise) => {
      proxyProcess.stdout.once('data', (chunk: Buffer) => resolvePromise(chunk));
    });
    assert.equal(readyOutput.toString('utf8'), 'ready\n');
    clientSocket = connect(socketPath);
    await once(clientSocket, 'connect');
    const clientClosePromise = waitForClientShutdown(clientSocket);
    const proxyClosePromise = once(proxyProcess, 'close');

    proxyProcess.kill('SIGTERM');

    const [exitCode, signalCode] = await Promise.race([
      Promise.all([clientClosePromise, proxyClosePromise]).then(
        ([, closeResult]) => closeResult as [number | null, NodeJS.Signals | null],
      ),
      new Promise<never>((_resolvePromise, rejectPromise) => {
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
