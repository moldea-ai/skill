import {
  buildEvaluationReplayPathTree,
  type IEvaluationReplayCommandStep,
  type IEvaluationReplayModel,
  type IEvaluationReplayStep,
  type IEvaluationReplayWorkspaceChange,
  type IEvaluationReplayWorkspaceChangeStatus,
  type IEvaluationReplayWorkspaceStep,
} from '@moldea.ai/website-ui/evaluation-replay-model';

import { createSemanticCaseDefinitionDigest } from '../../../../tooling/semantic-evaluation/index.mjs';

import type { ISemanticCaseDefinition } from './types.ts';
import type {
  ISemanticAttemptRecord,
  ISemanticReplayCandidate,
  ISemanticReplayCommand,
  ISemanticReplayTrial,
} from './validations.ts';

type ISemanticReplayConfirmation = ISemanticReplayCandidate['confirmations'][number];
type ISemanticReplaySourceTrial = ISemanticReplayConfirmation | ISemanticReplayTrial;

interface ICommandPresentation {
  operation: string;
  results: string[];
}

// immutable case identity and safe replay selected from one recorded attempt
export interface ISemanticEvaluationReplayProjection {
  caseDefinitionDigest: string;
  developerDirection: string | null;
  replay: IEvaluationReplayModel;
}

// truthful replacement when an older artifact did not retain developer-direction evidence
const UNAVAILABLE_DEVELOPER_DIRECTION =
  'The exact developer direction was not retained in this recorded artifact.';

/** Returns the deterministic public label and short result for one projected command fact. */
const createCommandPresentation = (
  command: ISemanticReplayCommand,
): ICommandPresentation | null => {
  const fact = command.item.outputEvidence.facts[0];
  if (fact === undefined) return null;

  return {
    operation: `moldea ${fact.command}`,
    results: [`CLI ${fact.cliVersion} returned ${fact.status}.`],
  };
};

/** Returns whether one completed command represents a failed operation. */
const isFailedCommand = (command: ISemanticReplayCommand): boolean =>
  command.item.status === 'failed' || command.item.exitCode !== 0;

/** Converts ordered safe command evidence into meaningful cards and accounted aggregates. */
const createCommandSteps = (commands: ISemanticReplayCommand[]): IEvaluationReplayCommandStep[] => {
  if (commands.length === 0) {
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

  const steps: IEvaluationReplayCommandStep[] = [];
  let successfulUnprojectedCount = 0;
  const flushSuccessfulAggregate = (): void => {
    if (successfulUnprojectedCount === 0) return;
    steps.push({
      commandCount: successfulUnprojectedCount,
      exitCode: null,
      isAggregate: true,
      kind: 'command',
      operation: `${successfulUnprojectedCount} completed ${successfulUnprojectedCount === 1 ? 'command' : 'commands'}`,
      results: ['Exact command text and output were intentionally not retained.'],
      status: 'passed',
    });
    successfulUnprojectedCount = 0;
  };

  for (const command of commands) {
    const presentation = createCommandPresentation(command);
    const hasFailed = isFailedCommand(command);
    if (presentation === null && !hasFailed) {
      successfulUnprojectedCount += 1;
      continue;
    }

    flushSuccessfulAggregate();
    steps.push({
      commandCount: 1,
      exitCode: command.item.exitCode,
      isAggregate: false,
      kind: 'command',
      operation: presentation?.operation ?? 'Recorded command',
      results: presentation?.results ?? [
        'The command failed. Exact command text and output were intentionally not retained.',
      ],
      status: hasFailed ? 'failed' : 'passed',
    });
  }
  flushSuccessfulAggregate();

  return steps;
};

/** Selects public path and entry-type fields from one workspace-change group. */
const createWorkspaceChanges = (
  trial: ISemanticReplaySourceTrial,
  status: IEvaluationReplayWorkspaceChangeStatus,
): IEvaluationReplayWorkspaceChange[] => {
  if (status === 'modified') {
    return trial.workspaceChanges.modified.map(({ after, path }) => ({ path, type: after.type }));
  }

  return trial.workspaceChanges[status].map(({ path, state }) => ({ path, type: state.type }));
};

/** Creates one path-only workspace step and rejects contradictory status membership. */
const createWorkspaceStep = (trial: ISemanticReplaySourceTrial): IEvaluationReplayWorkspaceStep => {
  const statuses = ['created', 'modified', 'deleted'] as const;
  const seenPaths = new Set<string>();
  const groups = statuses.map((status) => {
    const changes = createWorkspaceChanges(trial, status);
    for (const { path } of changes) {
      if (seenPaths.has(path)) {
        throw new Error(`Semantic replay workspace path ${JSON.stringify(path)} changed twice.`);
      }
      seenPaths.add(path);
    }

    return {
      changes,
      status,
      tree: buildEvaluationReplayPathTree(changes),
    };
  });

  return { groups, kind: 'workspace' };
};

/** Creates the exact summary projection used to correlate immutable evidence to its attempt. */
const createTrialSummary = (
  trial: ISemanticReplaySourceTrial,
  kind: 'confirmation' | 'initial',
  confirmationIndex: 1 | 2 | null,
): ISemanticAttemptRecord['cases'][number]['trials'][number] => ({
  actorCommandPolicyEvidence: trial.actorCommandPolicyEvidence,
  actorResourceEvidence: trial.actorResourceEvidence,
  actorHost: trial.actorHost,
  confirmationIndex,
  evaluatedAt: trial.evaluatedAt,
  forbidden: trial.forbidden,
  judgeHost: trial.judgeHost,
  kind,
  observed: trial.observed,
  passed: trial.passed,
  rationale: trial.rationale,
});

/** Returns raw initial and confirmation evidence in immutable trial order. */
const getSourceTrials = (
  candidate: ISemanticReplayCandidate,
  caseId: string,
): Array<{
  confirmationIndex: 1 | 2 | null;
  kind: 'confirmation' | 'initial';
  source: ISemanticReplaySourceTrial;
}> => {
  const initialMatches = candidate.results.filter(({ id }) => id === caseId);
  if (initialMatches.length !== 1 || initialMatches[0]?.caseId !== caseId) {
    throw new Error(`Semantic replay case ${caseId} must have one matching initial trial.`);
  }
  const confirmations = candidate.confirmations
    .filter(({ id }) => id === caseId)
    .sort((left, right) => left.confirmationIndex - right.confirmationIndex);
  if (
    confirmations.some(
      (confirmation, index) =>
        confirmation.caseId !== caseId || confirmation.confirmationIndex !== index + 1,
    )
  ) {
    throw new Error(`Semantic replay case ${caseId} has an invalid confirmation sequence.`);
  }

  return [
    { confirmationIndex: null, kind: 'initial', source: initialMatches[0] },
    ...confirmations.map((source) => ({
      confirmationIndex: source.confirmationIndex,
      kind: 'confirmation' as const,
      source,
    })),
  ];
};

/**
 * Builds one safe replay from exact immutable semantic evidence and its derived summary.
 * @param caseDefinition Current case definition when the case id still exists.
 * @param attemptCase Derived immutable attempt summary for the case.
 * @param candidate Public-safe fields selected from the immutable evidence artifact.
 * @returns The recorded case identity and ordered evidence-grounded replay.
 * @throws
 * - If replay evidence contradicts the attempt summary, recorded case identity, command counts, or workspace paths
 */
export const createSemanticEvaluationReplay = (
  caseDefinition: ISemanticCaseDefinition | null,
  attemptCase: ISemanticAttemptRecord['cases'][number],
  candidate: ISemanticReplayCandidate,
): ISemanticEvaluationReplayProjection => {
  const sourceTrials = getSourceTrials(candidate, attemptCase.id);
  if (sourceTrials.length !== attemptCase.trials.length) {
    throw new Error(`Semantic replay case ${attemptCase.id} contradicts its trial count.`);
  }
  const caseDefinitionDigests = new Set(
    sourceTrials.map(({ source }) => source.caseDefinitionDigest),
  );
  const recordedDeveloperDirections = new Set(
    sourceTrials
      .map(({ source }) => source.developerDirection)
      .filter((developerDirection): developerDirection is string => developerDirection !== null),
  );
  if (caseDefinitionDigests.size !== 1 || recordedDeveloperDirections.size > 1) {
    throw new Error(`Semantic replay case ${attemptCase.id} contradicts its recorded definition.`);
  }
  const caseDefinitionDigest = sourceTrials[0]?.source.caseDefinitionDigest;
  if (caseDefinitionDigest === undefined) {
    throw new Error(`Semantic replay case ${attemptCase.id} has no recorded definition.`);
  }
  const hasCurrentCaseDefinition =
    caseDefinition !== null &&
    createSemanticCaseDefinitionDigest(caseDefinition) === caseDefinitionDigest;
  const recordedDeveloperDirection = [...recordedDeveloperDirections][0] ?? null;
  if (
    hasCurrentCaseDefinition &&
    recordedDeveloperDirection !== null &&
    recordedDeveloperDirection !== caseDefinition.input.developerDirection
  ) {
    throw new Error(`Semantic replay case ${attemptCase.id} contradicts its developer direction.`);
  }
  const developerDirection =
    recordedDeveloperDirection ??
    (hasCurrentCaseDefinition ? caseDefinition.input.developerDirection : null);

  const trials = sourceTrials.map(({ confirmationIndex, kind, source }, index) => {
    const sourceSummary = createTrialSummary(source, kind, confirmationIndex);
    if (JSON.stringify(sourceSummary) !== JSON.stringify(attemptCase.trials[index])) {
      throw new Error(`Semantic replay case ${attemptCase.id} contradicts trial ${index + 1}.`);
    }
    if (
      source.actorExecutionEvidence.length !==
      source.actorCommandPolicyEvidence.completedCommandCount
    ) {
      throw new Error(
        `Semantic replay case ${attemptCase.id} contradicts the completed command count for trial ${index + 1}.`,
      );
    }

    const steps: IEvaluationReplayStep[] = [
      {
        content: developerDirection ?? UNAVAILABLE_DEVELOPER_DIRECTION,
        kind: 'message',
        role: 'developer',
        source: developerDirection === null ? 'derived' : 'recorded',
      },
      ...createCommandSteps(source.actorExecutionEvidence),
      createWorkspaceStep(source),
      {
        content: source.actorResponse,
        kind: 'message',
        role: 'coding-agent',
        source: 'recorded',
      },
      {
        kind: 'verdict',
        rationale: source.rationale,
        role: 'independent-judge',
        source: 'recorded',
        status: source.passed ? 'passed' : 'failed',
      },
    ];

    return {
      confirmationIndex,
      evaluatedAt: source.evaluatedAt,
      id: kind === 'initial' ? 'initial' : `confirmation-${confirmationIndex}`,
      kind,
      steps,
      title: kind === 'initial' ? 'Initial trial' : `Confirmation ${confirmationIndex}`,
    };
  });

  return { caseDefinitionDigest, developerDirection, replay: { trials } };
};
