import {
  type IEvaluationReplayCommandStep,
  type IEvaluationReplayModel,
  type IEvaluationReplayStep,
} from '@moldea.ai/website-ui/evaluation-replay-model';

import { createQualificationProjectEvidence } from './project-transformers.ts';
import type { IQualificationAttemptTrialModel, IQualificationCurrentCaseResult } from './types.ts';

/** Converts recorded command outcomes into concise activity without inventing command text. */
const createCommandSteps = (
  trial: IQualificationAttemptTrialModel,
): IEvaluationReplayCommandStep[] => {
  const { actorCommandPolicy, actorExecutionEvents } = trial;
  if (actorExecutionEvents.length !== actorCommandPolicy.completedCommandCount) {
    throw new Error(
      `Qualification replay trial ${trial.result.trialId} contradicts its completed command count.`,
    );
  }

  if (actorExecutionEvents.length === 0) {
    return [
      {
        commandCount: 0,
        exitCode: null,
        isAggregate: true,
        kind: 'command',
        operation: 'No completed commands recorded',
        results: ['This trial contains no completed command events.'],
        status: 'passed',
      },
    ];
  }

  for (const event of actorExecutionEvents) {
    if ((event.status === 'completed') !== (event.exitCode === 0)) {
      throw new Error(
        `Qualification replay trial ${trial.result.trialId} contains contradictory command evidence.`,
      );
    }
  }

  const successfulCommandCount = actorExecutionEvents.filter(
    ({ status }) => status === 'completed',
  ).length;
  const failedCommandCount = actorExecutionEvents.length - successfulCommandCount;
  const steps: IEvaluationReplayCommandStep[] = [];
  if (successfulCommandCount > 0) {
    steps.push({
      commandCount: successfulCommandCount,
      exitCode: null,
      isAggregate: true,
      kind: 'command',
      operation: `${successfulCommandCount} completed ${successfulCommandCount === 1 ? 'command' : 'commands'}`,
      results: ['Exact command text and output were intentionally not retained.'],
      status: 'passed',
    });
  }
  if (failedCommandCount > 0) {
    steps.push({
      commandCount: failedCommandCount,
      exitCode: null,
      isAggregate: true,
      kind: 'command',
      operation: `${failedCommandCount} ${failedCommandCount === 1 ? 'command' : 'commands'} returned a non-zero exit code`,
      results: [
        'The coding agent continued working. Exact command text and output were intentionally not retained.',
      ],
      status: 'failed',
    });
  }

  return steps;
};

/** Creates the shared replay workspace step from exact qualification snapshots. */
const createWorkspaceStep = (
  workspace: IQualificationAttemptTrialModel['workspaceAssertions'],
): Extract<IEvaluationReplayStep, { kind: 'workspace' }> => {
  const projectEvidence = createQualificationProjectEvidence(workspace);

  return {
    groups: projectEvidence.changeGroups,
    kind: 'workspace',
  };
};

/** Creates the Markdown message shown for the recorded coding-agent result. */
const createActorMessage = (trial: IQualificationAttemptTrialModel): string => {
  const sections = [trial.actor.summary];
  if (trial.actor.observations.length > 0) {
    sections.push(
      `**What the agent established**\n\n${trial.actor.observations.map((observation) => `- ${observation}`).join('\n')}`,
    );
  }
  if (trial.actor.unresolved.length > 0) {
    sections.push(
      `**Remaining uncertainty**\n\n${trial.actor.unresolved.map((item) => `- ${item}`).join('\n')}`,
    );
  }

  return sections.join('\n\n');
};

/** Creates a concise derived account of the runner-owned post-actor verification. */
const createDeterministicMessage = (trial: IQualificationAttemptTrialModel): string => {
  if (trial.deterministicAfter.passed && trial.workspaceAssertions.passed) {
    return 'The deterministic verifier confirmed the repository structure, Core behavior, CLI integration, workspace contract, and typecheck after the coding agent finished.';
  }

  const failures = [...trial.deterministicAfter.failures, ...trial.workspaceAssertions.failures];
  return failures.length === 0
    ? 'The deterministic verifier recorded a failed post-agent verification.'
    : `The deterministic verifier recorded these failures:\n\n${failures.map((failure) => `- ${failure}`).join('\n')}`;
};

/** Creates the final recorded or derived rationale for one qualification trial. */
const createVerdictStep = (
  trial: IQualificationAttemptTrialModel,
): Extract<IEvaluationReplayStep, { kind: 'verdict' }> => {
  const recordedRationale = trial.judge?.summary ?? trial.judgeSkipped?.reason;
  const failureDetails = trial.result.failures;
  const rationale = [
    recordedRationale ?? 'No semantic judge rationale was recorded.',
    ...(failureDetails.length === 0
      ? []
      : [`**Recorded failures**\n\n${failureDetails.map((failure) => `- ${failure}`).join('\n')}`]),
  ].join('\n\n');
  const isRecordedJudgeVerdict =
    trial.judge !== null &&
    failureDetails.length === 0 &&
    (trial.judge.verdict === 'pass') === trial.result.passed;

  return {
    kind: 'verdict',
    rationale,
    role: trial.judge === null ? 'deterministic-verifier' : 'independent-judge',
    source: isRecordedJudgeVerdict ? 'recorded' : 'derived',
    status: trial.result.passed ? 'passed' : 'failed',
  };
};

/**
 * Builds a truthful public replay from one validated qualification case.
 * @param result The ordered case result stored by the qualification runner.
 * @param trials The validated trial artifacts loaded for the case.
 * @returns The shared replay model consumed by the public website component.
 * @throws
 * - If command evidence, workspace snapshots, or trial ordering contradict the recorded result
 */
export const createQualificationReplay = (
  result: IQualificationCurrentCaseResult,
  trials: IQualificationAttemptTrialModel[],
): IEvaluationReplayModel => {
  if (
    trials.length !== result.trials.length ||
    trials.some((trial, index) => trial.result.trialId !== result.trials[index]?.trialId)
  ) {
    throw new Error(`Qualification replay case ${result.caseId} contradicts its trial history.`);
  }

  return {
    trials: trials.map((trial) => {
      const confirmationIndex =
        trial.result.confirmationIndex === 1 || trial.result.confirmationIndex === 2
          ? trial.result.confirmationIndex
          : null;
      const steps: IEvaluationReplayStep[] = [
        {
          content: trial.developerTask,
          kind: 'message',
          role: 'developer',
          source: 'recorded',
        },
        ...createCommandSteps(trial),
        createWorkspaceStep(trial.workspaceAssertions),
        {
          content: createActorMessage(trial),
          kind: 'message',
          role: 'coding-agent',
          source: 'recorded',
        },
        {
          content: createDeterministicMessage(trial),
          kind: 'message',
          role: 'deterministic-verifier',
          source: 'derived',
        },
        createVerdictStep(trial),
      ];

      return {
        confirmationIndex,
        evaluatedAt: trial.result.judgeEvidenceCreatedAt ?? trial.result.actorEvidenceCreatedAt,
        id: trial.result.trialId,
        kind: trial.result.kind,
        steps,
        title:
          trial.result.kind === 'initial'
            ? 'Initial trial'
            : `Confirmation ${trial.result.confirmationIndex}`,
      };
    }),
  };
};
