import { lstat, readFile, readlink, realpath } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import type { IProjectTypeScriptInstallation } from './types.ts';

const ExactVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/u);

const ProjectManifestSchema = z.object({
  devDependencies: z.record(z.string(), z.string()).optional(),
});

const InstalledTypeScriptManifestSchema = z.object({
  name: z.literal('typescript'),
  version: ExactVersionSchema,
});

const isContainedPath = (parentPath: string, candidatePath: string): boolean => {
  const relativePath = path.relative(parentPath, candidatePath);
  return relativePath !== '' && !relativePath.startsWith(`..${path.sep}`) && relativePath !== '..';
};

/**
 * Resolves and validates the exact project-owned TypeScript compiler exposed to the actor.
 * @returns A promise resolving to the installed compiler identity and executable path.
 * @throws If TypeScript is undeclared, floating, mismatched, or not exposed by a safe local shim.
 */
export const inspectProjectTypeScriptInstallation = async (
  workspaceDirectory: string,
): Promise<IProjectTypeScriptInstallation> => {
  const projectManifest = ProjectManifestSchema.parse(
    JSON.parse(await readFile(path.join(workspaceDirectory, 'package.json'), 'utf8')) as unknown,
  );
  const declaredVersion = projectManifest.devDependencies?.['typescript'];
  const declaredVersionResult = ExactVersionSchema.safeParse(declaredVersion);

  if (!declaredVersionResult.success) {
    throw new Error(
      'Qualification fixtures must declare TypeScript as an exact development dependency.',
    );
  }

  const nodeModulesDirectory = path.join(workspaceDirectory, 'node_modules');
  const installedPackageDirectory = path.join(nodeModulesDirectory, 'typescript');
  const installedManifest = InstalledTypeScriptManifestSchema.parse(
    JSON.parse(
      await readFile(path.join(installedPackageDirectory, 'package.json'), 'utf8'),
    ) as unknown,
  );

  if (installedManifest.version !== declaredVersionResult.data) {
    throw new Error('Installed TypeScript does not match the exact fixture declaration.');
  }

  const localShimPath = path.join(nodeModulesDirectory, '.bin', 'tsc');
  const localShimStats = await lstat(localShimPath);

  if (!localShimStats.isSymbolicLink()) {
    throw new Error('The project-local TypeScript executable must be a relative symlink.');
  }

  const localShimTarget = await readlink(localShimPath);

  if (path.isAbsolute(localShimTarget)) {
    throw new Error('The project-local TypeScript executable must be a relative symlink.');
  }

  const compilerPath = path.join(installedPackageDirectory, 'bin', 'tsc');
  const [
    resolvedWorkspaceDirectory,
    resolvedNodeModulesDirectory,
    resolvedPackageDirectory,
    resolvedCompilerPath,
    resolvedShimPath,
  ] = await Promise.all([
    realpath(workspaceDirectory),
    realpath(nodeModulesDirectory),
    realpath(installedPackageDirectory),
    realpath(compilerPath),
    realpath(localShimPath),
  ]);

  if (
    !isContainedPath(resolvedWorkspaceDirectory, resolvedNodeModulesDirectory) ||
    !isContainedPath(resolvedNodeModulesDirectory, resolvedPackageDirectory) ||
    resolvedShimPath !== resolvedCompilerPath ||
    !isContainedPath(resolvedPackageDirectory, resolvedCompilerPath)
  ) {
    throw new Error('The project-local TypeScript executable has an unexpected provider.');
  }

  return {
    executablePath: compilerPath,
    version: installedManifest.version,
  };
};
