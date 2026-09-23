import { createRequire } from 'node:module';
import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { QUALIFICATION_ROOT } from '../constants/index.ts';
import { readJsonFile } from '../../../src/filesystem/index.ts';
import {
  executeProcess,
  type IProcessExecutionOptions,
  type IProcessExecutionResult,
} from '../../../src/process/index.ts';

const ExactVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/u);
const QualificationManifestSchema = z.object({
  dependencies: z.object({ pnpm: ExactVersionSchema }),
});
const PnpmManifestSchema = z.object({
  name: z.literal('pnpm'),
  version: ExactVersionSchema,
  bin: z.object({ pnpm: z.string().min(1) }),
});

// the exact installed tool selected by the qualification workspace
export type IQualificationPnpmTool = {
  binPath: string;
  version: string;
};

/**
 * Resolves the qualification workspace's installed pnpm without consulting PATH or an ancestor checkout.
 * @param qualificationRoot The workspace root, overridable for isolated filesystem tests.
 * @returns The verified executable path and exact declared version.
 * @throws If pnpm is missing, installed outside this repository, or does not match the workspace pin.
 */
export const resolveQualificationPnpmTool = async (
  qualificationRoot: string = QUALIFICATION_ROOT,
): Promise<IQualificationPnpmTool> => {
  const workspaceRoot = path.resolve(qualificationRoot);
  const repositoryRoot = path.dirname(workspaceRoot);
  const workspaceManifestPath = path.join(workspaceRoot, 'package.json');
  const workspaceManifest = await readJsonFile(workspaceManifestPath, QualificationManifestSchema);
  let packageManifestPath: string;

  try {
    packageManifestPath = createRequire(workspaceManifestPath).resolve('pnpm');
  } catch (error) {
    throw new Error('Qualification pnpm is missing. Run npm ci --ignore-scripts.', {
      cause: error,
    });
  }

  const [actualPackageRoot, actualRepositoryRoot] = await Promise.all([
    realpath(path.dirname(packageManifestPath)),
    realpath(repositoryRoot),
  ]);
  const relativePackageRoot = path.relative(actualRepositoryRoot, actualPackageRoot);
  if (
    relativePackageRoot !== path.join('node_modules', 'pnpm') &&
    relativePackageRoot !== path.join('qualification', 'node_modules', 'pnpm')
  ) {
    throw new Error('Qualification pnpm must be installed inside this repository.');
  }

  const packageManifest = await readJsonFile(packageManifestPath, PnpmManifestSchema);
  if (packageManifest.version !== workspaceManifest.dependencies.pnpm) {
    throw new Error(
      `Qualification pnpm ${packageManifest.version} does not match the workspace pin ${workspaceManifest.dependencies.pnpm}.`,
    );
  }

  const relativeBinPath = packageManifest.bin.pnpm;
  if (
    path.isAbsolute(relativeBinPath) ||
    path.win32.isAbsolute(relativeBinPath) ||
    /^[A-Za-z]:/u.test(relativeBinPath) ||
    relativeBinPath.split(/[\\/]/u).includes('..')
  ) {
    throw new Error('Qualification pnpm declares a bin outside its installed package.');
  }

  const binPath = await realpath(path.resolve(actualPackageRoot, relativeBinPath));
  const relativeBin = path.relative(actualPackageRoot, binPath);
  if (
    relativeBin === '' ||
    relativeBin.startsWith(`..${path.sep}`) ||
    relativeBin === '..' ||
    path.isAbsolute(relativeBin) ||
    !(await stat(binPath)).isFile()
  ) {
    throw new Error('Qualification pnpm declares a bin outside its installed package.');
  }

  return { binPath, version: packageManifest.version };
};

const executePnpmTool = (
  tool: IQualificationPnpmTool,
  options: Omit<IProcessExecutionOptions, 'command'>,
): Promise<IProcessExecutionResult> =>
  executeProcess({
    ...options,
    command: process.execPath,
    args: [tool.binPath, '--pm-on-fail=error', ...options.args],
  });

/** Runs the exact installed pnpm through Node with version switching disabled. */
export const executeQualificationPnpm = async (
  options: Omit<IProcessExecutionOptions, 'command'>,
): Promise<IProcessExecutionResult> =>
  executePnpmTool(await resolveQualificationPnpmTool(), options);

/** Returns the actual selected pnpm version only when it matches the workspace declaration. */
export const getQualificationPnpmVersion = async (): Promise<string> => {
  const tool = await resolveQualificationPnpmTool();
  const result = await executePnpmTool(tool, { args: ['--version'], cwd: QUALIFICATION_ROOT });
  const actualVersion = result.stdout.trim();
  if (actualVersion !== tool.version) {
    throw new Error(
      `Qualification pnpm reported ${actualVersion || 'no version'} instead of ${tool.version}.`,
    );
  }

  return actualVersion;
};
