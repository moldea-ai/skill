import {
  buildEvaluationReplayPathTree,
  type IEvaluationReplayWorkspaceChange,
  type IEvaluationReplayWorkspaceChangeStatus,
} from '@moldea.ai/website-ui/evaluation-replay-model';

import type { IQualificationProjectEvidenceModel, IWorkspaceAssertionResult } from './types.ts';

const WORKSPACE_CHANGE_STATUSES = ['created', 'modified', 'deleted'] as const;

/** Returns whether two recorded workspace states describe the same entry. */
const isWorkspaceStateEqual = (
  left: IWorkspaceAssertionResult['before'][number],
  right: IWorkspaceAssertionResult['after'][number],
): boolean =>
  left.path === right.path &&
  left.kind === right.kind &&
  left.mode === right.mode &&
  left.sha256 === right.sha256;

/**
 * Builds the bounded public project model from one validated workspace assertion.
 * @param workspace The exact before and after workspace evidence.
 * @returns The complete starting tree and exact created, modified, and deleted groups.
 * @throws
 * - If workspace snapshots contradict the recorded changed paths
 */
export const createQualificationProjectEvidence = (
  workspace: IWorkspaceAssertionResult,
): IQualificationProjectEvidenceModel => {
  const beforeByPath = new Map(workspace.before.map((entry) => [entry.path, entry]));
  const afterByPath = new Map(workspace.after.map((entry) => [entry.path, entry]));
  const changedPaths = new Set(workspace.changedPaths);
  const derivedChangedPaths = new Set(
    [...new Set([...beforeByPath.keys(), ...afterByPath.keys()])].filter((path) => {
      const before = beforeByPath.get(path);
      const after = afterByPath.get(path);

      return before === undefined || after === undefined || !isWorkspaceStateEqual(before, after);
    }),
  );

  if (
    changedPaths.size !== workspace.changedPaths.length ||
    changedPaths.size !== derivedChangedPaths.size ||
    [...changedPaths].some((path) => !derivedChangedPaths.has(path))
  ) {
    throw new Error('Qualification workspace snapshots contradict their changed paths.');
  }

  const changesByStatus: Record<
    IEvaluationReplayWorkspaceChangeStatus,
    IEvaluationReplayWorkspaceChange[]
  > = {
    created: [],
    deleted: [],
    modified: [],
  };
  for (const path of workspace.changedPaths) {
    const before = beforeByPath.get(path);
    const after = afterByPath.get(path);
    if (before === undefined && after !== undefined) {
      changesByStatus.created.push({ path, type: after.kind });
    } else if (before !== undefined && after === undefined) {
      changesByStatus.deleted.push({ path, type: before.kind });
    } else if (before !== undefined && after !== undefined) {
      changesByStatus.modified.push({ path, type: after.kind });
    }
  }

  return {
    changeGroups: WORKSPACE_CHANGE_STATUSES.map((status) => ({
      changes: changesByStatus[status],
      status,
      tree: buildEvaluationReplayPathTree(changesByStatus[status]),
    })),
    startingTree: buildEvaluationReplayPathTree(
      workspace.before.map(({ kind, path }) => ({ path, type: kind })),
    ),
  };
};
