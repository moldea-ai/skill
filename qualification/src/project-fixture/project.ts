import { lstat, readFile, readdir, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import type { ICandidateClosure, IQualificationProfileCase } from '../contracts/index.ts';
import { QualificationCaseScenarioSchema } from '../contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  collectDirectoryFingerprintEntries,
  copyDirectory,
  copyFileWithParents,
  ensureDirectory,
  listDirectoryFiles,
  readYamlFile,
  resolveContainedPath,
} from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import {
  MOUNTED_SKILL_RELATIVE_PATH,
  QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES,
} from './constants.ts';
import { inspectProjectTypeScriptInstallation } from './typescript.ts';
import type { IPreparedQualificationProject } from './types.ts';

const PROJECT_STATE_EXCLUDED_DIRECTORIES = new Set<string>(
  QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES,
);
const PROJECT_STATE_EXCLUDED_PATH_PREFIXES = [MOUNTED_SKILL_RELATIVE_PATH];

const collectProjectFiles = async (workspaceDirectory: string) =>
  collectDirectoryFingerprintEntries(workspaceDirectory, {
    excludedDirectoryNames: PROJECT_STATE_EXCLUDED_DIRECTORIES,
    excludedRelativePathPrefixes: PROJECT_STATE_EXCLUDED_PATH_PREFIXES,
  });

const ProjectManifestSchema = z.looseObject({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

const PnpmWorkspaceSchema = z.looseObject({
  overrides: z.record(z.string(), z.string()).optional(),
  preferSymlinkedExecutables: z.boolean().optional(),
});

const InstalledCliManifestSchema = z.object({
  name: z.literal('@moldea.ai/cli'),
  version: z.string().min(1),
});

/** Installs the packed CLI composition as one exact project-local development dependency. */
const installCandidateProjectRuntime = async (
  workspaceDirectory: string,
  attemptDirectory: string,
  candidate: ICandidateClosure,
  signal: AbortSignal | undefined,
): Promise<string> => {
  const cliPackage = candidate.packages.find(({ name }) => name === '@moldea.ai/cli');

  if (cliPackage === undefined) {
    throw new Error('Candidate closure does not contain @moldea.ai/cli.');
  }

  const manifestPath = path.join(workspaceDirectory, 'package.json');
  const manifest = ProjectManifestSchema.parse(
    JSON.parse(await readFile(manifestPath, 'utf8')) as unknown,
  );
  const projectManifest = {
    ...manifest,
    devDependencies: {
      ...manifest.devDependencies,
      '@moldea.ai/cli': cliPackage.version,
    },
  };
  for (const runtimePackage of candidate.runtimePackages ?? []) {
    const declaredVersion =
      manifest.dependencies?.[runtimePackage.name] ??
      manifest.devDependencies?.[runtimePackage.name];

    if (declaredVersion !== runtimePackage.version) {
      throw new Error(
        `Qualification fixture must declare ${runtimePackage.name}@${runtimePackage.version} exactly.`,
      );
    }
  }
  const localPackageOverrides = Object.fromEntries(
    [...candidate.packages, ...(candidate.runtimePackages ?? []), candidate.typeScriptPackage].map(
      (candidatePackage) => [candidatePackage.name, `file:${candidatePackage.tarballPath}`],
    ),
  );
  const serializeManifest = (manifestValue: Record<string, unknown>): string =>
    `${JSON.stringify(manifestValue, null, 2)}\n`;
  const pnpmWorkspacePath = path.join(workspaceDirectory, 'pnpm-workspace.yaml');
  let originalPnpmWorkspace: string | null = null;

  try {
    originalPnpmWorkspace = await readFile(pnpmWorkspacePath, 'utf8');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }

  const pnpmWorkspace =
    originalPnpmWorkspace === null
      ? {}
      : PnpmWorkspaceSchema.parse(parseYaml(originalPnpmWorkspace) as unknown);
  const installationPnpmWorkspace = {
    ...pnpmWorkspace,
    preferSymlinkedExecutables: true,
    overrides: {
      ...pnpmWorkspace.overrides,
      ...localPackageOverrides,
    },
  };

  const projectNodeModules = path.join(workspaceDirectory, 'node_modules');
  await rm(projectNodeModules, { force: true, recursive: true });
  await writeFile(manifestPath, serializeManifest(projectManifest), 'utf8');
  await writeFile(pnpmWorkspacePath, stringifyYaml(installationPnpmWorkspace), 'utf8');

  try {
    await executeProcess({
      command: 'pnpm',
      args: [
        'install',
        '--offline',
        '--ignore-scripts',
        '--lockfile=false',
        '--config.strict-peer-dependencies=true',
        '--store-dir',
        path.join(attemptDirectory, 'pnpm-store'),
      ],
      cwd: workspaceDirectory,
      environment: { ...process.env, CI: 'true' },
      signal,
    });
  } finally {
    if (originalPnpmWorkspace === null) {
      await rm(pnpmWorkspacePath, { force: true });
    } else {
      await writeFile(pnpmWorkspacePath, originalPnpmWorkspace, 'utf8');
    }
  }

  const installedManifest = InstalledCliManifestSchema.parse(
    JSON.parse(
      await readFile(path.join(projectNodeModules, '@moldea.ai', 'cli', 'package.json'), 'utf8'),
    ) as unknown,
  );

  if (installedManifest.version !== cliPackage.version) {
    throw new Error('Project-local CLI version does not match the packed candidate.');
  }

  await inspectProjectTypeScriptInstallation(workspaceDirectory);

  return calculateDirectoryFingerprint(projectNodeModules);
};

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
  candidate: ICandidateClosure;
  profileCase: IQualificationProfileCase;
  profileDirectory: string;
  skillRepository: string;
  skillState: IGitRepositoryState;
  signal?: AbortSignal | undefined;
  workspaceDirectory?: string;
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

  const workspaceDirectory =
    options.workspaceDirectory ??
    path.join(options.attemptDirectory, 'workspaces', options.profileCase.id);
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
  await writeFile(
    path.join(workspaceDirectory, '.git', 'info', 'exclude'),
    '.agents/skills/moldea/\n.moldea-qualification/\nnode_modules/\n',
    { encoding: 'utf8', flag: 'a' },
  );
  const candidateRuntimeDigest = await installCandidateProjectRuntime(
    workspaceDirectory,
    options.attemptDirectory,
    options.candidate,
    options.signal,
  );
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
  const skillDirectory = path.join(workspaceDirectory, MOUNTED_SKILL_RELATIVE_PATH);
  await copySkillSnapshot(options.skillRepository, options.skillState, skillDirectory);
  const taskPath = path.join(internalDirectory, 'task.md');
  await copyFileWithParents(resolveContainedPath(scenarioDirectory, scenario.taskFile), taskPath);

  return {
    profileCase: options.profileCase,
    scenario,
    scenarioDirectory,
    workspaceDirectory,
    taskPath,
    baselineCommit,
    beforeActorFiles: await collectProjectFiles(workspaceDirectory),
    candidateRuntimeDigest,
    internalDigest: await calculateDirectoryFingerprint(internalDirectory),
    skillDigest: await calculateDirectoryFingerprint(skillDirectory),
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

/**
 * Captures project-visible state without Git metadata, dependencies, or runner-owned inputs.
 * @returns A promise resolving after the snapshot is complete.
 */
export const captureQualificationWorkspaceSnapshot = async (
  workspaceDirectory: string,
  snapshotDirectory: string,
): Promise<void> => {
  await copyDirectory(workspaceDirectory, snapshotDirectory, {
    excludedDirectoryNames: new Set(QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES),
    excludedRelativePathPrefixes: PROJECT_STATE_EXCLUDED_PATH_PREFIXES,
  });
};

/**
 * Restores project-visible state while preserving Git metadata and runner-owned inputs.
 * @returns A promise resolving after the workspace is restored.
 */
export const restoreQualificationWorkspaceSnapshot = async (
  workspaceDirectory: string,
  snapshotDirectory: string,
): Promise<void> => {
  const entries = await readdir(workspaceDirectory, { withFileTypes: true });

  for (const entry of entries) {
    if (PROJECT_STATE_EXCLUDED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    if (entry.name === '.agents') {
      const agentsDirectory = path.join(workspaceDirectory, entry.name);
      const visibleAgentPaths = await listDirectoryFiles(agentsDirectory, {
        excludedRelativePathPrefixes: [path.posix.relative('.agents', MOUNTED_SKILL_RELATIVE_PATH)],
      });

      for (const relativePath of visibleAgentPaths) {
        await rm(resolveContainedPath(agentsDirectory, relativePath), {
          force: true,
          recursive: true,
        });
      }
      continue;
    }

    await rm(path.join(workspaceDirectory, entry.name), { force: true, recursive: true });
  }

  await copyDirectory(snapshotDirectory, workspaceDirectory, { overwrite: true });
};

/** Captures the project-visible actor state for checkpoint resume. */
export const captureQualificationProjectSnapshot = async (
  project: IPreparedQualificationProject,
  snapshotDirectory: string,
): Promise<void> => {
  await captureQualificationWorkspaceSnapshot(project.workspaceDirectory, snapshotDirectory);
};

/** Restores an exact project-visible actor state over one freshly prepared fixture. */
export const restoreQualificationProjectSnapshot = async (
  project: IPreparedQualificationProject,
  snapshotDirectory: string,
): Promise<void> => {
  await restoreQualificationWorkspaceSnapshot(project.workspaceDirectory, snapshotDirectory);
};

/** Returns the exact UTF-8 task text copied into the isolated actor workspace. */
export const readQualificationTask = async (
  project: IPreparedQualificationProject,
): Promise<string> => readFile(project.taskPath, 'utf8');
