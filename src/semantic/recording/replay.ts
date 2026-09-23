import type {
  IEvaluationReplayModel,
  IEvaluationReplayPathTreeNode,
  IEvaluationReplayStep,
  IEvaluationReplayWorkspaceChange,
} from '@moldea.ai/website-ui/evaluation-replay-model';

import type { ISemanticRecordedCase, ISemanticRecordedTrial } from './types.ts';

const createFlatTree = (
  changes: readonly IEvaluationReplayWorkspaceChange[],
): IEvaluationReplayPathTreeNode[] =>
  changes.map(({ path, type }) => ({
    changeCount: 1,
    children: [],
    kind: type,
    name: path.split('/').at(-1) ?? path,
    path,
  }));

const createWorkspaceStep = (
  recordedTrial: ISemanticRecordedTrial,
): Extract<IEvaluationReplayStep, { kind: 'workspace' }> => {
  const groups = (
    [
      ['created', recordedTrial.workspaceChanges.created],
      ['modified', recordedTrial.workspaceChanges.modified],
      ['deleted', recordedTrial.workspaceChanges.deleted],
    ] as const
  ).map(([status, entries]) => {
    const changes: IEvaluationReplayWorkspaceChange[] = entries.map(({ path, ...entry }) => ({
      path,
      type:
        ('state' in entry ? entry.state.type : entry.after.type) === 'symlink' ? 'symlink' : 'file',
    }));
    return { changes, status, tree: createFlatTree(changes) };
  });
  return { groups, kind: 'workspace' };
};

/** Creates the public replay for one recorded semantic case without retaining command text. */
export const createSemanticReplay = (
  recordedCase: ISemanticRecordedCase,
): IEvaluationReplayModel => ({
  trials: recordedCase.trials.map((recordedTrial) => {
    const { trial } = recordedTrial;
    const commandCount = trial.actorCommandPolicyEvidence.completedCommandCount;
    const steps: IEvaluationReplayStep[] = [
      {
        content: recordedTrial.developerDirection,
        kind: 'message',
        role: 'developer',
        source: 'recorded',
      },
      {
        commandCount,
        exitCode: null,
        isAggregate: true,
        kind: 'command',
        operation:
          commandCount === 0
            ? 'No completed commands recorded'
            : `${commandCount} completed ${commandCount === 1 ? 'command' : 'commands'}`,
        results: ['Exact command text and raw output were intentionally not retained.'],
        status: trial.dimensions.commandPolicy ? 'passed' : 'failed',
      },
      createWorkspaceStep(recordedTrial),
      {
        content: recordedTrial.actorResponse,
        kind: 'message',
        role: 'coding-agent',
        source: 'recorded',
      },
      {
        kind: 'verdict',
        rationale: trial.rationale,
        role: 'independent-judge',
        source: 'recorded',
        status: trial.passed ? 'passed' : 'failed',
      },
    ];
    return {
      confirmationIndex: trial.confirmationIndex,
      evaluatedAt: trial.evaluatedAt,
      id: trial.kind === 'initial' ? 'initial' : `confirmation-${String(trial.confirmationIndex)}`,
      kind: trial.kind,
      steps,
      title:
        trial.kind === 'initial'
          ? 'Initial trial'
          : `Confirmation ${String(trial.confirmationIndex)}`,
    };
  }),
});
