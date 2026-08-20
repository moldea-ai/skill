import { CodexCliHost, FakeCodexHost, type ICodexHost } from '../codex-host/index.ts';
import type { IQualificationCommand } from '../command-line/index.ts';
import {
  listQualificationImplementations,
  resolveQualificationTarget,
} from '../compatibility/index.ts';
import type { IQualificationSelection } from '../contracts/index.ts';
import {
  getLocalAttemptDirectory,
  listLocalAttemptCheckpoints,
  recordIncompleteAttempt,
  runQualification,
} from '../execution/index.ts';
import { readAttemptCheckpoint } from '../checkpoint/index.ts';
import {
  confirmPaidQualificationExecution,
  promptQualificationAction,
} from '../interactive/index.ts';
import {
  formatImplementationList,
  formatQualificationResult,
  formatQualificationStatus,
  formatVerificationResult,
  presentQualificationOutput,
} from '../presentation/index.ts';
import { listLatestQualificationResults, verifyQualificationResults } from '../result/index.ts';

const requirePaidExecutionApproval = async (options: {
  hasConfirmedPaidExecution: boolean;
  isJson: boolean;
  selection: IQualificationSelection;
}): Promise<void> => {
  if (options.hasConfirmedPaidExecution) {
    return;
  }

  if (options.isJson || process.stdin.isTTY !== true) {
    throw new Error(
      'Paid qualification requires --confirm-paid-execution in JSON or non-interactive mode.',
    );
  }

  const target = await resolveQualificationTarget(options.selection);
  const modelCallCount = target.profile.cases.length * 2;

  if (!(await confirmPaidQualificationExecution(modelCallCount))) {
    throw new Error('Paid qualification was not approved.');
  }
};

const createHost = (isDryRun: boolean): ICodexHost =>
  isDryRun ? new FakeCodexHost() : new CodexCliHost();

const presentRunOutcome = (
  outcome: Awaited<ReturnType<typeof runQualification>>,
  isJson: boolean,
): number => {
  presentQualificationOutput(
    {
      attemptDirectory: outcome.attemptDirectory,
      result: outcome.result,
      wasRecorded: outcome.wasRecorded,
    },
    isJson,
    formatQualificationResult(outcome.result, outcome.attemptDirectory, outcome.wasRecorded),
  );

  if (outcome.result.status === 'passed') {
    return 0;
  }

  return outcome.result.status === 'incomplete' ? 130 : 2;
};

/** Executes one parsed local qualification command and returns its process exit code. */
export const executeQualificationCommand = async (
  command: IQualificationCommand,
  signal?: AbortSignal,
): Promise<number> => {
  switch (command.kind) {
    case 'list': {
      const implementations = await listQualificationImplementations();
      presentQualificationOutput(
        { implementations },
        command.isJson,
        formatImplementationList(implementations),
      );
      return 0;
    }
    case 'status': {
      const [allAttempts, latestResults] = await Promise.all([
        listLocalAttemptCheckpoints(),
        listLatestQualificationResults(),
      ]);
      const attempts = command.isAll
        ? allAttempts
        : allAttempts.filter(({ status }) => status === 'incomplete');
      const status = { attempts, latestResults };
      presentQualificationOutput(status, command.isJson, formatQualificationStatus(status));
      return 0;
    }
    case 'verify': {
      const verification = await verifyQualificationResults();
      presentQualificationOutput(
        verification,
        command.isJson,
        formatVerificationResult(verification),
      );
      return verification.passed ? 0 : 2;
    }
    case 'record': {
      const result = await recordIncompleteAttempt(command.attemptId);
      presentQualificationOutput(
        result,
        command.isJson,
        `Recorded incomplete attempt ${result.attemptId}.`,
      );
      return 0;
    }
    case 'run': {
      if (!command.isDryRun) {
        await requirePaidExecutionApproval({ ...command, selection: command.selection });
      }

      const outcome = await runQualification({
        host: createHost(command.isDryRun),
        selection: command.selection,
        ...(command.skillRepository === undefined
          ? {}
          : { skillRepository: command.skillRepository }),
        isDryRun: command.isDryRun,
        useCache: command.useCache,
        signal,
      });
      return presentRunOutcome(outcome, command.isJson);
    }
    case 'resume': {
      const checkpoint = await readAttemptCheckpoint(getLocalAttemptDirectory(command.attemptId));

      if (!checkpoint.isDryRun) {
        await requirePaidExecutionApproval({ ...command, selection: checkpoint.selection });
      }

      const outcome = await runQualification({
        host: createHost(checkpoint.isDryRun),
        resumeAttemptId: checkpoint.attemptId,
        signal,
      });
      return presentRunOutcome(outcome, command.isJson);
    }
    case 'retry': {
      const checkpoint = await readAttemptCheckpoint(getLocalAttemptDirectory(command.attemptId));

      if (checkpoint.status === 'running' || checkpoint.status === 'incomplete') {
        throw new Error(`Attempt ${checkpoint.attemptId} is resumable and cannot be retried yet.`);
      }

      if (!checkpoint.isDryRun) {
        await requirePaidExecutionApproval({ ...command, selection: checkpoint.selection });
      }

      const outcome = await runQualification({
        host: createHost(checkpoint.isDryRun),
        selection: checkpoint.selection,
        skillRepository: checkpoint.skillRepository,
        isDryRun: checkpoint.isDryRun,
        useCache: checkpoint.useCache,
        parentAttemptId: checkpoint.attemptId,
        signal,
      });
      return presentRunOutcome(outcome, command.isJson);
    }
  }
};

/** Runs the no-argument guided workflow using the same command execution boundaries. */
export const executeInteractiveQualification = async (signal?: AbortSignal): Promise<number> => {
  const action = await promptQualificationAction();

  if (action.kind === 'status') {
    return executeQualificationCommand({ kind: 'status', isAll: false, isJson: false }, signal);
  }

  if (action.kind === 'verify') {
    return executeQualificationCommand({ kind: 'verify', isJson: false }, signal);
  }

  if (action.kind === 'resume') {
    return executeQualificationCommand(
      {
        kind: 'resume',
        attemptId: action.attemptId,
        hasConfirmedPaidExecution: false,
        isJson: false,
      },
      signal,
    );
  }

  return executeQualificationCommand(
    {
      kind: 'run',
      selection: {
        adapterId: action.adapterId,
        implementationId: action.implementationId,
      },
      isDryRun: false,
      useCache: true,
      hasConfirmedPaidExecution: false,
      isJson: false,
    },
    signal,
  );
};
