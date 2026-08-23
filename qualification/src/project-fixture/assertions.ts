import { access } from 'node:fs/promises';
import path from 'node:path';

import {
  WorkspaceAssertionResultSchema,
  type IActorOutput,
  type IWorkspaceAssertionResult,
  type IWorkspaceFileState,
} from '../contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  collectDirectoryFingerprintEntries,
  resolveContainedPath,
} from '../filesystem/index.ts';
import {
  MOUNTED_SKILL_RELATIVE_PATH,
  QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES,
} from './constants.ts';
import type { IPreparedQualificationProject } from './types.ts';
import { matchesWorkspacePathContract } from './validations.ts';

const PROJECT_STATE_EXCLUDED_DIRECTORIES = new Set<string>(
  QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES,
);

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

const calculateCandidateProjectRuntimeDigest = (
  project: IPreparedQualificationProject,
): Promise<string> =>
  calculateDirectoryFingerprint(path.join(project.workspaceDirectory, 'node_modules'));

/**
 * Verifies that the project-local packages still match the prepared candidate runtime.
 * @returns A promise that resolves after the runtime identity is confirmed.
 * @throws
 * - If the project-local candidate runtime was modified after preparation
 */
export const assertCandidateProjectRuntimeIntegrity = async (
  project: IPreparedQualificationProject,
): Promise<void> => {
  if ((await calculateCandidateProjectRuntimeDigest(project)) !== project.candidateRuntimeDigest) {
    throw new Error('The project-local candidate runtime was modified after preparation.');
  }
};

/** Verifies that actor execution preserved every runner-owned project input. */
export const assertQualificationProjectInputIntegrity = async (
  project: IPreparedQualificationProject,
): Promise<void> => {
  await assertCandidateProjectRuntimeIntegrity(project);
  const internalDirectory = path.join(project.workspaceDirectory, '.moldea-qualification');

  if ((await calculateDirectoryFingerprint(internalDirectory)) !== project.internalDigest) {
    throw new Error('The mounted qualification task was modified after preparation.');
  }

  const skillDirectory = path.join(project.workspaceDirectory, MOUNTED_SKILL_RELATIVE_PATH);

  if ((await calculateDirectoryFingerprint(skillDirectory)) !== project.skillDigest) {
    throw new Error('The installed candidate skill was modified after preparation.');
  }
};

/** Evaluates declared preservation, mutation, existence, and internal-integrity requirements. */
export const inspectWorkspaceAssertions = async (
  project: IPreparedQualificationProject,
  actorOutput?: IActorOutput,
): Promise<IWorkspaceAssertionResult> => {
  const after = await collectDirectoryFingerprintEntries(project.workspaceDirectory, {
    excludedDirectoryNames: PROJECT_STATE_EXCLUDED_DIRECTORIES,
    excludedRelativePathPrefixes: [MOUNTED_SKILL_RELATIVE_PATH],
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

  const unexpectedChangePaths = changedPaths.filter(
    (relativePath) =>
      !matchesWorkspacePathContract(
        relativePath,
        project.scenario.workspace.allowedChangePaths,
        project.scenario.workspace.allowedChangePathPatterns,
      ),
  );
  if (unexpectedChangePaths.length > 0) {
    failures.push(`Changes escaped the declared allowlist: ${unexpectedChangePaths.join(', ')}.`);
  }

  if (actorOutput !== undefined) {
    if (actorOutput.outcome !== project.scenario.expectedActorOutcome) {
      failures.push(
        `Actor outcome was ${actorOutput.outcome}; expected ${project.scenario.expectedActorOutcome}.`,
      );
    }
    const reportedChangePaths = [...actorOutput.changedFiles].sort((left, right) =>
      left.localeCompare(right, 'en'),
    );
    if (JSON.stringify(reportedChangePaths) !== JSON.stringify(changedPaths)) {
      failures.push(
        `Actor changed-file report differed from the workspace: reported ${reportedChangePaths.join(', ') || 'none'}; observed ${changedPaths.join(', ') || 'none'}.`,
      );
    }
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

  for (const requiredPattern of project.scenario.workspace.mustChangePathPatterns) {
    if (
      !changedPaths.some((relativePath) =>
        matchesWorkspacePathContract(relativePath, [], [requiredPattern]),
      )
    ) {
      failures.push(`Required mutation pattern was not observed: ${requiredPattern}.`);
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
    failures.push('The mounted qualification task was modified.');
  }

  const skillDirectory = path.join(project.workspaceDirectory, MOUNTED_SKILL_RELATIVE_PATH);

  if ((await calculateDirectoryFingerprint(skillDirectory)) !== project.skillDigest) {
    failures.push('The installed candidate skill was modified.');
  }

  if ((await calculateCandidateProjectRuntimeDigest(project)) !== project.candidateRuntimeDigest) {
    failures.push('The project-local candidate runtime was modified.');
  }

  return WorkspaceAssertionResultSchema.parse({
    passed: failures.length === 0,
    failures,
    before: project.beforeActorFiles,
    after,
    changedPaths,
  });
};
