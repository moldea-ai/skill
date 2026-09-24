// @vitest-environment node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, vi } from 'vitest';

const LAUNCHER_PATH = resolve(import.meta.dirname, '../../moldea/scripts/moldea-cli.mjs');
const SUCCESS_OUTPUT =
  '{"command":"validate","status":"valid","error":null,"result":{"valid":true}}\n';

const stopFixtureChild = (pid: number): void => {
  try {
    process.kill(pid, 'SIGKILL');
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH') throw error;
  }
};

/** Exercises the generated launcher against a real child with controlled termination behavior. */
const runFixture = async (signal?: 'SIGINT' | 'SIGTERM', ignoresSignal = false) => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-launcher-'));
  const cliRoot = join(root, 'node_modules', '@moldea.ai', 'cli');
  const coreRoot = join(root, 'node_modules', '@moldea.ai', 'core');
  const readyPath = join(root, 'ready.json');
  const receivedPath = join(root, 'received-signal.txt');
  mkdirSync(join(cliRoot, 'dist'), { recursive: true });
  mkdirSync(join(coreRoot, 'dist'), { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ devDependencies: { '@moldea.ai/cli': '^8.0.0' } }),
  );
  writeFileSync(
    join(cliRoot, 'package.json'),
    JSON.stringify({
      name: '@moldea.ai/cli',
      version: '8.0.1',
      bin: { moldea: './dist/moldea.js' },
      dependencies: { '@moldea.ai/core': '^4.0.1' },
    }),
  );
  writeFileSync(
    join(coreRoot, 'package.json'),
    JSON.stringify({ name: '@moldea.ai/core', version: '4.0.2' }),
  );
  writeFileSync(join(coreRoot, 'dist', 'index.js'), 'module.exports = {};\n');
  writeFileSync(
    join(cliRoot, 'dist', 'moldea.js'),
    `
const fs = require('node:fs');
const finish = () => { process.stdout.write(${JSON.stringify(SUCCESS_OUTPUT)}); process.exit(0); };
if (${signal !== undefined}) {
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      fs.writeFileSync(${JSON.stringify(receivedPath)}, signal);
      if (!${ignoresSignal}) finish();
    });
  }
  fs.writeFileSync(${JSON.stringify(readyPath)}, JSON.stringify({ pid: process.pid }));
  setInterval(() => {}, 1000);
} else finish();
`,
  );
  const launcher = spawn(
    process.execPath,
    [
      LAUNCHER_PATH,
      '--repository',
      root,
      '--',
      'validate',
      '--json',
      '--max-output-bytes',
      '65536',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let stdout = '';
  let stderr = '';
  launcher.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });
  launcher.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });
  const completion = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolveCompletion, rejectCompletion) => {
      launcher.once('error', rejectCompletion);
      launcher.once('close', (code, signal) => resolveCompletion({ code, signal }));
    },
  );
  const timeout = setTimeout(() => launcher.kill('SIGKILL'), 15_000);
  try {
    if (signal !== undefined) {
      await vi.waitFor(() => assert.equal(existsSync(readyPath), true), { timeout: 5_000 });
      assert.equal(launcher.kill(signal), true);
    }
    const result = await completion;
    const receivedSignal = existsSync(receivedPath) ? readFileSync(receivedPath, 'utf8') : null;
    return { ...result, stdout, stderr, receivedSignal };
  } finally {
    clearTimeout(timeout);
    const needsChildCleanup =
      launcher.signalCode === 'SIGKILL' ||
      (launcher.exitCode === null && launcher.signalCode === null);
    if (needsChildCleanup) launcher.kill('SIGKILL');
    if (needsChildCleanup && existsSync(readyPath)) {
      const { pid } = JSON.parse(readFileSync(readyPath, 'utf8')) as { pid: number };
      stopFixtureChild(pid);
    }
    await completion;
    rmSync(root, { recursive: true, force: true });
  }
};

test('preserves successful output and status without cancellation', async () => {
  assert.deepEqual(await runFixture(), {
    code: 0,
    signal: null,
    stdout: SUCCESS_OUTPUT,
    stderr: '',
    receivedSignal: null,
  });
});

// Windows process.kill terminates the parent directly instead of delivering these POSIX signals.
test.skipIf(process.platform === 'win32').each(['SIGINT', 'SIGTERM'] as const)(
  'returns failure and suppresses stdout after handled %s cancellation',
  async (signal) => {
    assert.deepEqual(await runFixture(signal), {
      code: 3,
      signal: null,
      stdout: '',
      stderr: `moldea CLI terminated by ${signal}.\n`,
      receivedSignal: signal,
    });
  },
);

test.skipIf(process.platform === 'win32')(
  'force-terminates a child that ignores cancellation',
  async () => {
    assert.deepEqual(await runFixture('SIGTERM', true), {
      code: 3,
      signal: null,
      stdout: '',
      stderr: 'moldea CLI terminated by SIGTERM.\n',
      receivedSignal: 'SIGTERM',
    });
  },
);
