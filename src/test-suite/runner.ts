import { resolve } from 'node:path';

import { resolvePackageManagerCommand, startProcess, stopProcessTree } from 'jg-process';

import type { ITestSuiteRun } from './types.ts';

// matches the platform's graceful test-runner interruption budget
const INTERRUPT_GRACE_MS = 30_000;

/**
 * Runs one npm command with inherited output and awaited owned teardown.
 * @returns The child status, or failure after interruption.
 * @throws
 * - PACKAGE_MANAGER_NOT_FOUND: The package manager's executable couldn't be found.
 * - PROCESS_TREE_SURVIVED: The process tree is still running after it was force-stopped
 */
const runCommand = async (
  args: string[],
  env: NodeJS.ProcessEnv,
  signal?: AbortSignal,
): Promise<number> => {
  if (signal?.aborted) return 1;
  const cwd = resolve(import.meta.dirname, '../..');
  // preserve Windows' native environment lookup; the copied environment is for the child
  const command = resolvePackageManagerCommand(args, { packageManager: 'npm', cwd });
  const child = startProcess({ ...command, cwd, env, stdio: 'inherit' });
  const exited = new Promise<number>((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolveExit(code ?? 1));
  });
  let teardown: Promise<void> | undefined;
  const stop = (): Promise<void> => (teardown ??= stopProcessTree(child));
  let interrupt: () => void = () => {};
  let interruptedWork: Promise<void> | undefined;
  const interrupted = new Promise<number>((resolveInterrupt, reject) => {
    interrupt = () => {
      interruptedWork = (async () => {
        if (
          process.platform !== 'win32' &&
          child.pid !== undefined &&
          child.exitCode === null &&
          child.signalCode === null
        ) {
          try {
            process.kill(-child.pid, 'SIGINT');
          } catch (error) {
            if (!(error instanceof Error) || !('code' in error) || error.code !== 'ESRCH')
              throw error;
          }
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([
              exited,
              new Promise<void>((resolveGrace) => {
                timer = setTimeout(resolveGrace, INTERRUPT_GRACE_MS);
              }),
            ]);
          } finally {
            clearTimeout(timer);
          }
        }
        await stop();
      })();
      void interruptedWork.then(() => resolveInterrupt(1), reject);
    };
    signal?.addEventListener('abort', interrupt, { once: true });
    if (signal?.aborted) interrupt();
  });
  const finishCleanup = async (): Promise<void> => {
    try {
      try {
        await interruptedWork;
      } finally {
        await stop();
      }
    } catch (error) {
      process.stderr.write(
        `Test command ${args.join(' ')} (root PID ${child.pid ?? 'unavailable'}) needs cleanup verification.\n`,
      );
      throw error;
    }
  };
  try {
    const code = await Promise.race([exited, interrupted]);
    return signal?.aborted ? 1 : code;
  } finally {
    signal?.removeEventListener('abort', interrupt);
    await finishCleanup();
  }
};

/**
 * Runs the selected correctness stages, omitting full-only evaluator and website setup in essential.
 * @returns Zero after every selected stage succeeds, otherwise its first failure.
 * @throws
 * - PACKAGE_MANAGER_NOT_FOUND: The package manager's executable couldn't be found.
 * - PROCESS_TREE_SURVIVED: The process tree is still running after it was force-stopped
 */
export const runTestSuite = async (run: ITestSuiteRun, signal?: AbortSignal): Promise<number> => {
  const env = { ...process.env, MOLDEA_TEST_SUITE: run.suite };
  const commands: string[][] = [];
  if (run.suite === 'full' && run.stages.some((stage) => stage !== 'e2e'))
    commands.push(['run', 'runtime:build']);
  for (const stage of run.stages) {
    if (stage !== 'e2e') commands.push(['run', `test:${stage}`]);
    if (run.suite === 'full')
      commands.push(
        stage === 'e2e' ? ['run', 'test:e2e'] : ['--workspace', 'website', 'run', `test:${stage}`],
      );
  }
  for (const command of commands) {
    const code = await runCommand(command, env, signal);
    if (code !== 0 || signal?.aborted) return code || 1;
  }
  return 0;
};
