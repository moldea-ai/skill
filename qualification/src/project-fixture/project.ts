import { lstat, readFile, readdir, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { IQualificationProfileCase } from '../contracts/index.ts';
import { QualificationCaseScenarioSchema } from '../contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  collectDirectoryFingerprintEntries,
  copyDirectory,
  copyFileWithParents,
  ensureDirectory,
  readYamlFile,
  resolveContainedPath,
} from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import type { IPreparedQualificationProject } from './types.ts';

const PROJECT_STATE_EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.moldea-qualification',
  'node_modules',
]);

const collectProjectFiles = async (workspaceDirectory: string) =>
  collectDirectoryFingerprintEntries(workspaceDirectory, {
    excludedDirectoryNames: PROJECT_STATE_EXCLUDED_DIRECTORIES,
  });

const copySkillSnapshot = async (
  skillRepository: string,
  skillState: IGitRepositoryState,
  destinationDirectory: string,
): Promise<void> => {
  await ensureDirectory(destinationDirectory);

  for (const entry of skillState.entries) {
    if (entry.mode === 0) {
      continue;
    }

    const sourcePath = resolveContainedPath(skillRepository, entry.path);
    const destinationPath = resolveContainedPath(destinationDirectory, entry.path);
    const stats = await lstat(sourcePath);

    if (stats.isSymbolicLink()) {
      await ensureDirectory(path.dirname(destinationPath));
      await symlink(await readlink(sourcePath), destinationPath);
      continue;
    }

    await copyFileWithParents(sourcePath, destinationPath);
  }
};

const applyScenarioOverlay = async (
  scenarioDirectory: string,
  workspaceDirectory: string,
  overlayDirectory: string | undefined,
  removePaths: readonly string[],
): Promise<void> => {
  if (overlayDirectory !== undefined) {
    await copyDirectory(
      resolveContainedPath(scenarioDirectory, overlayDirectory),
      workspaceDirectory,
      { overwrite: true },
    );
  }

  for (const relativePath of removePaths) {
    await rm(resolveContainedPath(workspaceDirectory, relativePath), {
      force: true,
      recursive: true,
    });
  }
};

/** Prepares one isolated committed baseline, applies declared dirty state, and mounts the skill copy. */
export const prepareQualificationProject = async (options: {
  attemptDirectory: string;
  profileCase: IQualificationProfileCase;
  profileDirectory: string;
  skillRepository: string;
  skillState: IGitRepositoryState;
  signal?: AbortSignal | undefined;
}): Promise<IPreparedQualificationProject> => {
  const scenarioDirectory = resolveContainedPath(
    options.profileDirectory,
    options.profileCase.projectDirectory,
  );
  const scenario = await readYamlFile(
    resolveContainedPath(scenarioDirectory, options.profileCase.scenarioFile),
    QualificationCaseScenarioSchema,
  );

  if (scenario.id !== options.profileCase.id) {
    throw new Error(`Scenario identity does not match profile case ${options.profileCase.id}.`);
  }

  const workspaceDirectory = path.join(
    options.attemptDirectory,
    'workspaces',
    options.profileCase.id,
  );
  await ensureDirectory(path.dirname(workspaceDirectory));
  await copyDirectory(
    resolveContainedPath(scenarioDirectory, scenario.seedDirectory),
    workspaceDirectory,
  );

  await executeProcess({
    command: 'git',
    args: ['init', '--initial-branch=main'],
    cwd: workspaceDirectory,
    signal: options.signal,
  });
  await executeProcess({
    command: 'git',
    args: ['add', '-A'],
    cwd: workspaceDirectory,
    signal: options.signal,
  });
  await executeProcess({
    command: 'git',
    args: [
      '-c',
      'user.name=Moldea Qualification',
      '-c',
      'user.email=qualification@moldea.local',
      'commit',
      '-m',
      'test: establish qualification fixture baseline',
    ],
    cwd: workspaceDirectory,
    signal: options.signal,
  });
  const baselineCommit = (
    await executeProcess({
      command: 'git',
      args: ['rev-parse', 'HEAD'],
      cwd: workspaceDirectory,
      signal: options.signal,
    })
  ).stdout.trim();

  await applyScenarioOverlay(
    scenarioDirectory,
    workspaceDirectory,
    scenario.overlayDirectory,
    scenario.removePaths,
  );

  const internalDirectory = path.join(workspaceDirectory, '.moldea-qualification');
  const skillDirectory = path.join(internalDirectory, 'skill');
  await copySkillSnapshot(options.skillRepository, options.skillState, skillDirectory);
  const taskPath = path.join(internalDirectory, 'task.md');
  await copyFileWithParents(resolveContainedPath(scenarioDirectory, scenario.taskFile), taskPath);
  await writeFile(
    path.join(workspaceDirectory, '.git', 'info', 'exclude'),
    '.moldea-qualification/\nnode_modules/\n',
    { encoding: 'utf8', flag: 'a' },
  );

  return {
    profileCase: options.profileCase,
    scenario,
    scenarioDirectory,
    workspaceDirectory,
    taskPath,
    baselineCommit,
    beforeActorFiles: await collectProjectFiles(workspaceDirectory),
    internalDigest: await calculateDirectoryFingerprint(internalDirectory),
  };
};

/** Applies the transparent expected fixture state used only by model-free dry runs. */
export const applyExpectedDryRunState = async (
  project: IPreparedQualificationProject,
): Promise<void> => {
  await applyScenarioOverlay(
    project.scenarioDirectory,
    project.workspaceDirectory,
    project.scenario.expectedDirectory,
    project.scenario.expectedRemovePaths,
  );
};

/** Captures the project-visible actor state without Git metadata, dependencies, or mounted inputs. */
export const captureQualificationProjectSnapshot = async (
  project: IPreparedQualificationProject,
  snapshotDirectory: string,
): Promise<void> => {
  await copyDirectory(project.workspaceDirectory, snapshotDirectory, {
    excludedDirectoryNames: new Set(['.git', '.moldea-qualification', 'node_modules']),
  });
};

/** Restores an exact project-visible actor state over one freshly prepared fixture. */
export const restoreQualificationProjectSnapshot = async (
  project: IPreparedQualificationProject,
  snapshotDirectory: string,
): Promise<void> => {
  const entries = await readdir(project.workspaceDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (
      entry.name === '.git' ||
      entry.name === '.moldea-qualification' ||
      entry.name === 'node_modules'
    ) {
      continue;
    }

    await rm(path.join(project.workspaceDirectory, entry.name), { force: true, recursive: true });
  }

  await copyDirectory(snapshotDirectory, project.workspaceDirectory);
};

/** Returns the exact UTF-8 task text copied into the isolated actor workspace. */
export const readQualificationTask = async (
  project: IPreparedQualificationProject,
): Promise<string> => readFile(project.taskPath, 'utf8');
