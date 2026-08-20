import { spawn } from 'node:child_process';

import { MAX_PROCESS_OUTPUT_BYTES } from '../constants/index.ts';
import type { IProcessExecutionOptions, IProcessExecutionResult } from './types.ts';

const createProcessError = (
  options: IProcessExecutionOptions,
  exitCode: number | null,
  stdout: string,
  stderr: string,
): Error => {
  const exitDescription = exitCode === null ? 'without an exit code' : `with exit code ${exitCode}`;
  const diagnostic = [
    stdout.trim() === '' ? null : `stdout:\n${stdout.trim()}`,
    stderr.trim() === '' ? null : `stderr:\n${stderr.trim()}`,
  ]
    .filter((stream): stream is string => stream !== null)
    .join('\n');
  const command = [options.command, ...options.args].join(' ');

  return new Error(
    `Command ${command} exited ${exitDescription}${diagnostic === '' ? '' : `: ${diagnostic}`}`,
  );
};

/**
 * Executes one shell-free child process with cancellation and bounded output capture.
 * @returns A promise resolving to exact UTF-8 output for an accepted exit code.
 * @throws If the process cannot start, is aborted, exceeds the output bound, or exits unexpectedly.
 */
export const executeProcess = async (
  options: IProcessExecutionOptions,
): Promise<IProcessExecutionResult> => {
  const startedAt = performance.now();
  const expectedExitCodes = options.expectedExitCodes ?? [0];

  return new Promise<IProcessExecutionResult>((resolve, reject) => {
    const childProcess = spawn(options.command, [...options.args], {
      cwd: options.cwd,
      env: options.environment,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let outputBytes = 0;
    let hasSettled = false;

    const settleWithError = (error: unknown): void => {
      if (hasSettled) {
        return;
      }

      hasSettled = true;
      options.signal?.removeEventListener('abort', abortProcess);
      reject(
        error instanceof Error
          ? error
          : new Error('Unknown process execution failure.', { cause: error }),
      );
    };

    const abortProcess = (): void => {
      childProcess.kill('SIGTERM');
      settleWithError(new Error('Process execution was aborted.'));
    };

    const captureChunk = (chunks: Buffer[], chunk: Buffer): void => {
      outputBytes += chunk.byteLength;

      if (outputBytes > MAX_PROCESS_OUTPUT_BYTES) {
        childProcess.kill('SIGTERM');
        settleWithError(
          new Error(`Command output exceeded ${MAX_PROCESS_OUTPUT_BYTES} bytes and was stopped.`),
        );
        return;
      }

      chunks.push(chunk);
    };

    childProcess.stdout.on('data', (chunk: Buffer) => captureChunk(stdoutChunks, chunk));
    childProcess.stderr.on('data', (chunk: Buffer) => captureChunk(stderrChunks, chunk));
    childProcess.once('error', settleWithError);
    childProcess.once('close', (exitCode) => {
      if (hasSettled) {
        return;
      }

      hasSettled = true;
      options.signal?.removeEventListener('abort', abortProcess);
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');

      if (exitCode === null || !expectedExitCodes.includes(exitCode)) {
        reject(createProcessError(options, exitCode, stdout, stderr));
        return;
      }

      resolve({
        exitCode,
        stdout,
        stderr,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      });
    });

    if (options.signal?.aborted === true) {
      abortProcess();
      return;
    }

    options.signal?.addEventListener('abort', abortProcess, { once: true });

    if (options.input === undefined) {
      childProcess.stdin.end();
    } else {
      childProcess.stdin.end(options.input, 'utf8');
    }
  });
};
