import type { IEvaluationReplayModel } from '@moldea.ai/website-ui/evaluation-replay-model';

import type { IProjectAttempt } from '../../lib/project-runs/index.ts';
import type { ISemanticEvaluationWebsiteModel } from '../../lib/semantic-evaluation/index.ts';

const PREVIEW_PATH_COUNT = 4;

/** Selects the same recorded case source as the detailed page, requiring an inspectable replay. */
export const getSemanticPreviewCase = (
  evaluation: Pick<ISemanticEvaluationWebsiteModel, 'currentAssurance' | 'groups'>,
  caseId: string,
) => {
  const cases =
    evaluation.currentAssurance?.cases ?? evaluation.groups.flatMap(({ cases }) => cases);
  const evaluationCase = cases.find(({ id }) => id === caseId);
  return evaluationCase?.replay?.trials.length ? evaluationCase : null;
};

/** Returns the final workspace count and bounded matching paths; missing evidence stays null. */
export const getRecordedWorkspace = (
  replay: IEvaluationReplayModel | null,
  includePath: (path: string) => boolean = () => true,
) => {
  const workspace = replay?.trials.at(-1)?.steps.find((step) => step.kind === 'workspace');
  if (workspace === undefined) return null;
  let changeCount = 0;
  const paths: { path: string; status: 'created' | 'modified' | 'deleted' }[] = [];
  for (const group of workspace.groups) {
    changeCount += group.changes.length;
    for (const change of group.changes) {
      if (paths.length === PREVIEW_PATH_COUNT) break;
      if (!includePath(change.path)) continue;
      paths.push({ path: change.path, status: group.status });
    }
  }
  return { changeCount, paths };
};

/** Selects a bounded set of distinct paths from recorded patches, without inferring a verdict. */
export const getProjectPatchPaths = (attempt: Pick<IProjectAttempt, 'session'>) => {
  const paths = new Map<string, 'Add' | 'Update' | 'Delete'>();
  for (const entry of attempt.session ?? []) {
    for (const target of entry.patchTargets ?? []) {
      if (!paths.has(target.path)) paths.set(target.path, target.action);
      if (paths.size === PREVIEW_PATH_COUNT)
        return [...paths].map(([path, action]) => ({ path, action }));
    }
  }
  return [...paths].map(([path, action]) => ({ path, action }));
};
