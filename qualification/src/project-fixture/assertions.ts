import { access } from 'node:fs/promises';
import path from 'node:path';

import {
  WorkspaceAssertionResultSchema,
  type IWorkspaceAssertionResult,
  type IWorkspaceFileState,
} from '../contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  collectDirectoryFingerprintEntries,
  resolveContainedPath,
} from '../filesystem/index.ts';
import type { IPreparedQualificationProject } from './types.ts';

const PROJECT_STATE_EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.moldea-qualification',
  'node_modules',
]);

const mapFilesByPath = (
  files: readonly IWorkspaceFileState[],
): ReadonlyMap<string, IWorkspaceFileState> => new Map(files.map((file) => [file.path, file]));

const areFileStatesEqual = (
  before: IWorkspaceFileState | undefined,
  after: IWorkspaceFileState | undefined,
): boolean =>
  before !== undefined &&
  after !== undefined &&
  before.kind === after.kind &&
  before.mode === after.mode &&
  before.sha256 === after.sha256;

const pathExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

/** Evaluates declared preservation, mutation, existence, and internal-integrity requirements. */
export const inspectWorkspaceAssertions = async (
  project: IPreparedQualificationProject,
): Promise<IWorkspaceAssertionResult> => {
  const after = await collectDirectoryFingerprintEntries(project.workspaceDirectory, {
    excludedDirectoryNames: PROJECT_STATE_EXCLUDED_DIRECTORIES,
  });
  const beforeByPath = mapFilesByPath(project.beforeActorFiles);
  const afterByPath = mapFilesByPath(after);
  const allPaths = new Set([...beforeByPath.keys(), ...afterByPath.keys()]);
  const changedPaths = [...allPaths]
    .filter(
      (relativePath) =>
        !areFileStatesEqual(beforeByPath.get(relativePath), afterByPath.get(relativePath)),
    )
    .sort((left, right) => left.localeCompare(right, 'en'));
  const failures: string[] = [];

  if (project.scenario.workspace.expectation === 'unchanged' && changedPaths.length > 0) {
    failures.push(`Expected an unchanged project, but changed: ${changedPaths.join(', ')}.`);
  }

  if (project.scenario.workspace.expectation === 'changed' && changedPaths.length === 0) {
    failures.push('Expected a project mutation, but no project files changed.');
  }

  for (const relativePath of project.scenario.workspace.mustPreservePaths) {
    if (!areFileStatesEqual(beforeByPath.get(relativePath), afterByPath.get(relativePath))) {
      failures.push(`Required preserved path changed: ${relativePath}.`);
    }
  }

  for (const relativePath of project.scenario.workspace.mustChangePaths) {
    if (areFileStatesEqual(beforeByPath.get(relativePath), afterByPath.get(relativePath))) {
      failures.push(`Required mutation was not observed: ${relativePath}.`);
    }
  }

  for (const relativePath of project.scenario.workspace.mustExistPaths) {
    if (!(await pathExists(resolveContainedPath(project.workspaceDirectory, relativePath)))) {
      failures.push(`Required path is missing: ${relativePath}.`);
    }
  }

  for (const relativePath of project.scenario.workspace.mustNotExistPaths) {
    if (await pathExists(resolveContainedPath(project.workspaceDirectory, relativePath))) {
      failures.push(`Path must not exist after the task: ${relativePath}.`);
    }
  }

  const internalDirectory = path.join(project.workspaceDirectory, '.moldea-qualification');

  if ((await calculateDirectoryFingerprint(internalDirectory)) !== project.internalDigest) {
    failures.push('The mounted candidate skill or qualification task was modified.');
  }

  return WorkspaceAssertionResultSchema.parse({
    passed: failures.length === 0,
    failures,
    before: project.beforeActorFiles,
    after,
    changedPaths,
  });
};
