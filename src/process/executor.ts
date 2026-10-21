import { runProcess } from 'jg-process';

import { MAX_PROCESS_OUTPUT_BYTES } from './constants.ts';
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
 * @throws
 * - PROCESS_START_FAILED: Unable to start the command
 * - PROCESS_OUTPUT_TOO_LARGE: The process wrote more output than allowed
 * - PROCESS_TREE_SURVIVED: The process tree is still running after it was force-stopped
 * - The signal's reason when the signal aborts.
 * - If the process exits with an unaccepted code or without one.
 */
export const executeProcess = async (
  options: IProcessExecutionOptions,
): Promise<IProcessExecutionResult> => {
  const result = await runProcess({
    command: options.command,
    args: [...options.args],
    cwd: options.cwd,
    maxOutputBytes: MAX_PROCESS_OUTPUT_BYTES,
    encoding: 'buffer',
    ...(options.environment === undefined ? {} : { env: options.environment }),
    ...(options.input === undefined ? {} : { input: options.input }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
  const stdout = result.stdout.toString('utf8');
  const stderr = result.stderr.toString('utf8');

  if (result.exitCode === null || !(options.expectedExitCodes ?? [0]).includes(result.exitCode)) {
    throw createProcessError(options, result.exitCode, stdout, stderr);
  }

  return { exitCode: result.exitCode, stdout, stderr, durationMs: result.durationMs };
};
