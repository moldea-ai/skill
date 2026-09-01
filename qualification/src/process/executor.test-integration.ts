// @vitest-environment node
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, expect, test } from 'vitest';

import { MAX_PROCESS_OUTPUT_BYTES } from '../constants/index.ts';
import { executeProcess } from './executor.ts';

/** Reads a process-owned readiness file once the child has created it. */
const readReadinessFile = async (path: string): Promise<string> => {
  const deadline = Date.now() + 2_000;

  while (Date.now() < deadline) {
    try {
      return await readFile(path, 'utf8');
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }

    await delay(20);
  }

  throw new Error(`Process readiness file was not created: ${path}`);
};

/** Returns whether an exact process can still receive a signal. */
const isProcessRunning = (processId: number): boolean => {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
    throw error;
  }
};

/** Stops a test process that survived an assertion failure. */
const killTestProcess = (processId: number): void => {
  try {
    process.kill(processId, 'SIGKILL');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error;
  }
};

describe('executeProcess', () => {
  test('retains command identity and stdout diagnostics for a failed child process', async () => {
    await expect(
      executeProcess({
        command: process.execPath,
        args: ['-e', "process.stdout.write('candidate build failed'); process.exit(2);"],
        cwd: process.cwd(),
      }),
    ).rejects.toThrow(
      `${process.execPath} -e process.stdout.write('candidate build failed'); process.exit(2); exited with exit code 2: stdout:\ncandidate build failed`,
    );
  });

  test.skipIf(process.platform === 'win32')(
    'terminates a stubborn child process group before rejecting cancellation',
    async () => {
      const temporaryRoot = await mkdtemp(join(tmpdir(), 'moldea-process-cancellation-'));
      const readinessPath = join(temporaryRoot, 'processes.json');
      const abortController = new AbortController();
      let processIds: number[] = [];

      try {
        const execution = executeProcess({
          command: process.execPath,
          args: [
            '-e',
            `const { spawn } = require('node:child_process');
const { writeFileSync } = require('node:fs');
process.on('SIGTERM', () => {});
const descendant = spawn(process.execPath, ['-e', "process.on('SIGTERM', () => {}); process.stdout.write('ready'); setInterval(() => {}, 1_000);"], { stdio: ['ignore', 'pipe', 'ignore'] });
descendant.stdout.once('data', () => writeFileSync(process.argv[1], JSON.stringify([process.pid, descendant.pid])));
setInterval(() => {}, 1_000);`,
            readinessPath,
          ],
          cwd: temporaryRoot,
          signal: abortController.signal,
        });
        processIds = JSON.parse(await readReadinessFile(readinessPath)) as number[];

        abortController.abort();

        await expect(execution).rejects.toThrow('Process execution was aborted.');
        expect(processIds.every((processId) => !isProcessRunning(processId))).toBe(true);
      } finally {
        for (const processId of processIds) {
          if (isProcessRunning(processId)) killTestProcess(processId);
        }
        await rm(temporaryRoot, { force: true, recursive: true });
      }
    },
  );

  test('waits for output-bound termination before rejecting', async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), 'moldea-process-output-bound-'));
    const readinessPath = join(temporaryRoot, 'process.pid');
    const terminationPath = join(temporaryRoot, 'terminated.txt');
    let processId: number | null = null;

    try {
      const execution = executeProcess({
        command: process.execPath,
        args: [
          '-e',
          `const { writeFileSync } = require('node:fs');
writeFileSync(process.argv[1], String(process.pid));
process.on('SIGTERM', () => setTimeout(() => { writeFileSync(process.argv[2], 'terminated'); process.exit(0); }, 50));
process.stdout.write(Buffer.alloc(Number(process.argv[3])));
setInterval(() => {}, 1_000);`,
          readinessPath,
          terminationPath,
          String(MAX_PROCESS_OUTPUT_BYTES + 1),
        ],
        cwd: temporaryRoot,
      });
      processId = Number(await readReadinessFile(readinessPath));

      await expect(execution).rejects.toThrow(
        `Command output exceeded ${MAX_PROCESS_OUTPUT_BYTES} bytes and was stopped.`,
      );
      await expect(readFile(terminationPath, 'utf8')).resolves.toBe('terminated');
      expect(isProcessRunning(processId)).toBe(false);
    } finally {
      if (processId !== null && isProcessRunning(processId)) killTestProcess(processId);
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });
});
