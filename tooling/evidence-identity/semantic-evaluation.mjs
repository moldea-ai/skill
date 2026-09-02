import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createSemanticIdentityReceipt,
  recoverSemanticIdentity,
  writeSemanticIdentityReceipt,
} from './semantic-identity.mjs';

const DEFAULT_REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM'];
const SEMANTIC_EVALUATION_CHILD_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  'semantic-evaluation-child.mjs',
);
const START_MESSAGE = { type: 'start-semantic-evaluation' };

const hasRecordingFlag = (arguments_) =>
  arguments_.includes('--record') || arguments_.includes('--record-checkpoint');

const runSemanticEvaluationChild = async ({
  arguments_,
  beforeStart = null,
  environment,
  repositoryRoot,
  runnerPath,
}) => {
  const hasControlledStart = beforeStart !== null;
  const childArguments = hasControlledStart
    ? ['--experimental-strip-types', SEMANTIC_EVALUATION_CHILD_PATH, runnerPath, ...arguments_]
    : ['--experimental-strip-types', runnerPath, ...arguments_];
  const child = spawn(process.execPath, childArguments, {
    cwd: repositoryRoot,
    env: environment,
    shell: false,
    stdio: hasControlledStart ? ['inherit', 'inherit', 'inherit', 'ipc'] : 'inherit',
  });
  const forwardedSignalHandlers = new Map(
    FORWARDED_SIGNALS.map((signal) => [signal, () => child.kill(signal)]),
  );
  for (const [signal, handler] of forwardedSignalHandlers) process.on(signal, handler);

  const removeSignalHandlers = () => {
    for (const [signal, handler] of forwardedSignalHandlers) process.off(signal, handler);
  };
  const completion = new Promise((resolveCompletion) => {
    child.once('error', (error) => resolveCompletion({ error, outcome: null }));
    child.once('close', (exitCode, signal) =>
      resolveCompletion({ error: null, outcome: { exitCode, signal } }),
    );
  });

  if (hasControlledStart) {
    const spawned = new Promise((resolveSpawn, rejectSpawn) => {
      child.once('spawn', resolveSpawn);
      child.once('error', rejectSpawn);
    });
    try {
      await spawned;
      await beforeStart(child.pid);
      if (child.exitCode === null && child.signalCode === null) {
        await new Promise((resolveSend, rejectSend) => {
          child.send(START_MESSAGE, (error) => {
            if (error === null || error === undefined) resolveSend();
            else rejectSend(error);
          });
        });
      }
    } catch (error) {
      child.kill('SIGTERM');
      await completion;
      removeSignalHandlers();
      throw error;
    }
  }

  const result = await completion;
  removeSignalHandlers();
  if (result.error !== null) throw result.error;
  return result.outcome;
};

/**
 * Runs the unchanged semantic evaluator, adding identity handling only to recording invocations.
 * @param options The repository, runner, process arguments, and inherited environment.
 * @returns A promise resolving to the exact child exit outcome.
 */
export const runSemanticEvaluation = async ({
  arguments_ = process.argv.slice(2),
  environment = process.env,
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  runnerPath = join(repositoryRoot, 'tests', 'semantic-evaluation-runner.mjs'),
} = {}) => {
  if (!hasRecordingFlag(arguments_)) {
    return runSemanticEvaluationChild({
      arguments_,
      environment,
      repositoryRoot,
      runnerPath,
    });
  }

  await recoverSemanticIdentity(repositoryRoot);
  let receipt = createSemanticIdentityReceipt(repositoryRoot, arguments_);
  let hasWrittenReceipt = false;

  let outcome;
  try {
    outcome = await runSemanticEvaluationChild({
      arguments_,
      beforeStart: async (evaluatorProcessId) => {
        receipt = { ...receipt, evaluatorProcessId };
        await writeSemanticIdentityReceipt(repositoryRoot, receipt);
        hasWrittenReceipt = true;
      },
      environment,
      repositoryRoot,
      runnerPath,
    });
  } catch (error) {
    if (hasWrittenReceipt) {
      await recoverSemanticIdentity(repositoryRoot, {
        expectedInvocationId: receipt.invocationId,
      });
    }
    throw error;
  }

  await recoverSemanticIdentity(repositoryRoot, {
    allowExistingAttempt: outcome.signal === null && outcome.exitCode === 0,
    expectedInvocationId: receipt.invocationId,
  });
  return outcome;
};

/** Applies one child outcome to the wrapper process without translating its status. */
export const applySemanticEvaluationOutcome = ({ exitCode, signal }) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }
  if (!Number.isInteger(exitCode) || exitCode < 0) {
    throw new Error('Semantic evaluation child returned an invalid exit status.');
  }

  process.exitCode = exitCode;
};
