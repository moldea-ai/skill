import { spawn } from 'node:child_process';

import {
  MAX_PROCESS_OUTPUT_BYTES,
  PROCESS_TERMINATION_GRACE_PERIOD_MS,
} from '../constants/index.ts';
import type { IProcessExecutionOptions, IProcessExecutionResult } from './types.ts';

/** Creates the diagnostic error for one completed command with an unexpected exit. */
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
      detached: process.platform !== 'win32',
      env: options.environment,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let outputBytes = 0;
    let hasSettled = false;
    let hasClosed = false;
    let hasForcedTermination = false;
    let pendingError: Error | null = null;
    let terminationTimeout: NodeJS.Timeout | undefined;

    /** Rejects once and releases process lifecycle resources. */
    const settleWithError = (error: unknown): void => {
      if (hasSettled) {
        return;
      }

      hasSettled = true;
      clearTimeout(terminationTimeout);
      options.signal?.removeEventListener('abort', abortProcess);
      reject(
        error instanceof Error
          ? error
          : new Error('Unknown process execution failure.', { cause: error }),
      );
    };

    /** Checks whether the owned POSIX process group can still execute. */
    const isProcessGroupRunning = (): boolean => {
      if (process.platform === 'win32' || childProcess.pid === undefined) {
        return !hasClosed;
      }

      try {
        process.kill(-childProcess.pid, 0);
        return true;
      } catch (error) {
        return !(error instanceof Error && 'code' in error && error.code === 'ESRCH');
      }
    };

    /** Signals the owned POSIX process group or the exact child on other platforms. */
    const signalProcess = (signal: NodeJS.Signals): boolean => {
      if (process.platform !== 'win32' && childProcess.pid !== undefined) {
        try {
          process.kill(-childProcess.pid, signal);
          return true;
        } catch (error) {
          if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) {
            return childProcess.kill(signal);
          }
        }
      }

      return childProcess.kill(signal);
    };

    /** Rejects a terminated execution only after its owned processes are no longer active. */
    const settleTerminatedProcess = (): void => {
      if (
        pendingError !== null &&
        hasClosed &&
        (hasForcedTermination || !isProcessGroupRunning())
      ) {
        settleWithError(pendingError);
      }
    };

    /** Starts graceful process-group termination with forced escalation. */
    const terminateProcess = (error: Error): void => {
      if (pendingError !== null || hasSettled) return;

      pendingError = error;
      signalProcess('SIGTERM');
      terminationTimeout = setTimeout(() => {
        hasForcedTermination = signalProcess('SIGKILL');

        if (hasClosed && (hasForcedTermination || !isProcessGroupRunning())) {
          settleWithError(pendingError);
        }
      }, PROCESS_TERMINATION_GRACE_PERIOD_MS);
    };

    /** Cancels the active process for the caller's abort signal. */
    const abortProcess = (): void => {
      terminateProcess(new Error('Process execution was aborted.'));
    };

    /** Captures one output chunk without exceeding the shared process bound. */
    const captureChunk = (chunks: Buffer[], chunk: Buffer): void => {
      if (pendingError !== null) return;

      outputBytes += chunk.byteLength;

      if (outputBytes > MAX_PROCESS_OUTPUT_BYTES) {
        terminateProcess(
          new Error(`Command output exceeded ${MAX_PROCESS_OUTPUT_BYTES} bytes and was stopped.`),
        );
        return;
      }

      chunks.push(chunk);
    };

    childProcess.stdout.on('data', (chunk: Buffer) => captureChunk(stdoutChunks, chunk));
    childProcess.stderr.on('data', (chunk: Buffer) => captureChunk(stderrChunks, chunk));
    childProcess.stdin.on('error', () => {
      // process close owns termination and command failure reporting
    });
    childProcess.once('error', (error) => settleWithError(pendingError ?? error));
    childProcess.once('close', (exitCode) => {
      if (hasSettled) {
        return;
      }

      hasClosed = true;

      if (pendingError !== null) {
        settleTerminatedProcess();
        return;
      }

      hasSettled = true;
      clearTimeout(terminationTimeout);
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
