import { lstat, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { isAbsolute, join, relative, sep } from 'node:path';
import semver from 'semver';
import { z } from 'zod';

import { isPathWithin, readRepositoryFile } from './repository-files.ts';

export interface IResolvedRepositoryCli {
  cliBinaryPath: string;
  cliRoot: string;
  cliVersion: string;
  nodeModulesRoot: string;
  repositoryRoot: string;
}

// package identities accepted by this portable skill release
export const EXPECTED_CLI_RANGE = '^8.0.0';
export const SUPPORTED_CORE_RANGE = '^4.0.1';

const MAXIMUM_PACKAGE_MANIFEST_BYTES = 65_536;
const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const CARET_VERSION_PATTERN = /^\^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const ProjectPackageManifestSchema = z.object({
  devDependencies: z.record(z.string(), z.string()).optional(),
});
const CliPackageManifestSchema = z.object({
  bin: z.object({ moldea: z.string() }),
  dependencies: z.record(z.string(), z.string()),
  name: z.string(),
  version: z.string(),
});
const CorePackageManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
});

/** Parses one canonical stable version into numeric components. */
export const parseStableVersion = (version: unknown): [number, number, number] | null => {
  const match = typeof version === 'string' ? STABLE_VERSION_PATTERN.exec(version) : null;
  if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

/** Returns whether a stable version belongs to one supported major from its minimum onward. */
export const isCompatibleStableVersion = (version: unknown, supportedRange: string): boolean => {
  const parsedVersion = parseStableVersion(version);
  const rangeMatch = CARET_VERSION_PATTERN.exec(supportedRange);

  if (
    parsedVersion === null ||
    rangeMatch?.[1] === undefined ||
    rangeMatch[2] === undefined ||
    rangeMatch[3] === undefined
  ) {
    return false;
  }

  const minimum: [number, number, number] = [
    Number(rangeMatch[1]),
    Number(rangeMatch[2]),
    Number(rangeMatch[3]),
  ];
  const [major, minor, patch] = parsedVersion;
  const [minimumMajor, minimumMinor, minimumPatch] = minimum;

  return (
    major === minimumMajor &&
    (minor > minimumMinor || (minor === minimumMinor && patch >= minimumPatch))
  );
};

/** Validates an exact or caret declaration against the installed compatible CLI release. */
export const isSupportedCliDeclaration = (
  declaration: unknown,
  installedVersion: unknown,
): boolean => {
  if (
    typeof declaration !== 'string' ||
    !isCompatibleStableVersion(installedVersion, EXPECTED_CLI_RANGE)
  ) {
    return false;
  }

  if (STABLE_VERSION_PATTERN.test(declaration)) {
    return declaration === installedVersion;
  }

  const match = CARET_VERSION_PATTERN.exec(declaration);

  return (
    match !== null &&
    isCompatibleStableVersion(match.slice(1).join('.'), EXPECTED_CLI_RANGE) &&
    isCompatibleStableVersion(installedVersion, declaration)
  );
};

/** Reads one bounded regular JSON object without following a file-level symbolic link. */
const readBoundedJson = async (repositoryRoot: string, filePath: string): Promise<unknown> => {
  const bytes = await readRepositoryFile(repositoryRoot, filePath, MAXIMUM_PACKAGE_MANIFEST_BYTES);

  return JSON.parse(utf8Decoder.decode(bytes)) as unknown;
};

/** Resolves and validates the repository-bound CLI package and executable. */
export const resolveRepositoryCli = async (
  repositoryRoot: string,
): Promise<IResolvedRepositoryCli> => {
  if (!isAbsolute(repositoryRoot)) {
    throw new Error('The repository root must be absolute.');
  }

  const resolvedRepositoryRoot = await realpath(repositoryRoot);
  const repositoryStat = await lstat(resolvedRepositoryRoot);

  if (!repositoryStat.isDirectory()) {
    throw new Error('The repository root must be a directory.');
  }

  const projectManifest = ProjectPackageManifestSchema.parse(
    await readBoundedJson(resolvedRepositoryRoot, join(resolvedRepositoryRoot, 'package.json')),
  );
  const declaredCliRange = projectManifest.devDependencies?.['@moldea.ai/cli'];
  const nodeModulesRoot = await realpath(join(resolvedRepositoryRoot, 'node_modules'));
  if (
    nodeModulesRoot === resolvedRepositoryRoot ||
    !isPathWithin(resolvedRepositoryRoot, nodeModulesRoot)
  ) {
    throw new Error('The dependency directory escaped the repository.');
  }
  const cliRoot = await realpath(join(nodeModulesRoot, '@moldea.ai', 'cli'));

  if (!isPathWithin(nodeModulesRoot, cliRoot)) {
    throw new Error('The CLI package escaped repository dependencies.');
  }

  const cliManifest = CliPackageManifestSchema.parse(
    await readBoundedJson(cliRoot, join(cliRoot, 'package.json')),
  );
  const cliBinaryDeclaration = cliManifest.bin.moldea;

  if (
    cliManifest.name !== '@moldea.ai/cli' ||
    !isSupportedCliDeclaration(declaredCliRange, cliManifest.version) ||
    cliBinaryDeclaration !== './dist/moldea.js'
  ) {
    throw new Error('The repository declares an unsupported CLI package closure.');
  }

  const cliBinaryPath = await realpath(join(cliRoot, cliBinaryDeclaration));

  if (
    !isPathWithin(cliRoot, cliBinaryPath) ||
    !(await lstat(cliBinaryPath)).isFile() ||
    relative(cliRoot, cliBinaryPath).split(sep).join('/') !== 'dist/moldea.js'
  ) {
    throw new Error('The CLI executable escaped its package.');
  }

  const resolvedCli = {
    cliBinaryPath,
    cliRoot,
    cliVersion: cliManifest.version,
    nodeModulesRoot,
    repositoryRoot: resolvedRepositoryRoot,
  };
  await validateRepositoryCore(resolvedCli, cliManifest.dependencies['@moldea.ai/core']);
  return resolvedCli;
};

/** Returns the first Core package visible to the CLI inside repository dependencies. */
const resolveRepositoryCoreRoot = async (resolvedCli: IResolvedRepositoryCli): Promise<string> => {
  const cliRequire = createRequire(join(resolvedCli.cliRoot, 'package.json'));
  const searchRoots = cliRequire.resolve.paths('@moldea.ai/core') ?? [];

  for (const searchRoot of searchRoots) {
    if (!isPathWithin(resolvedCli.nodeModulesRoot, searchRoot)) {
      continue;
    }

    const candidateRoot = join(searchRoot, '@moldea.ai', 'core');

    try {
      await lstat(candidateRoot);
    } catch (error) {
      if (
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        continue;
      }

      throw error;
    }

    const coreRoot = await realpath(candidateRoot);
    const coreStat = await lstat(coreRoot);

    if (!coreStat.isDirectory() || !isPathWithin(resolvedCli.nodeModulesRoot, coreRoot)) {
      throw new Error('The Core package escaped repository dependencies.');
    }

    return coreRoot;
  }

  throw new Error('The repository-local Core package could not be resolved.');
};

/** Validates the CLI's Core dependency from inert metadata without executing it. */
const validateRepositoryCore = async (
  resolvedCli: IResolvedRepositoryCli,
  declaredCoreRange: string | undefined,
): Promise<void> => {
  if (
    declaredCoreRange === undefined ||
    declaredCoreRange.trim() === '' ||
    semver.validRange(declaredCoreRange) === null
  ) {
    throw new Error('The repository declares an unsupported CLI package closure.');
  }

  const coreRoot = await resolveRepositoryCoreRoot(resolvedCli);
  const coreEntry = await realpath(join(coreRoot, 'dist', 'index.js'));

  if (
    !isPathWithin(resolvedCli.nodeModulesRoot, coreRoot) ||
    !(await lstat(coreEntry)).isFile() ||
    relative(coreRoot, coreEntry).split(sep).join('/') !== 'dist/index.js'
  ) {
    throw new Error('The Core entry escaped repository dependencies.');
  }

  const coreManifest = CorePackageManifestSchema.parse(
    await readBoundedJson(coreRoot, join(coreRoot, 'package.json')),
  );

  if (
    coreManifest.name !== '@moldea.ai/core' ||
    !isCompatibleStableVersion(coreManifest.version, SUPPORTED_CORE_RANGE) ||
    !semver.satisfies(coreManifest.version, declaredCoreRange)
  ) {
    throw new Error('The repository has an unsupported Core package.');
  }
};
