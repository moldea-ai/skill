import { lstat, readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { isAbsolute, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// package identities accepted by this portable skill release
export const EXPECTED_CLI_RANGE = '^7.0.0';
export const EXPECTED_CORE_RANGE = '^3.0.0';

const MAXIMUM_PACKAGE_MANIFEST_BYTES = 65_536;
const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const CARET_VERSION_PATTERN = /^\^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;

/** Parses one canonical stable version into numeric components. */
export const parseStableVersion = (version) => {
  const match = typeof version === 'string' ? STABLE_VERSION_PATTERN.exec(version) : null;
  return match === null ? null : match.slice(1).map(Number);
};

/** Returns whether a stable version belongs to one supported major from its minimum onward. */
export const isCompatibleStableVersion = (version, supportedRange) => {
  const parsedVersion = parseStableVersion(version);
  const rangeMatch = CARET_VERSION_PATTERN.exec(supportedRange);

  if (parsedVersion === null || rangeMatch === null) {
    return false;
  }

  const minimum = rangeMatch.slice(1).map(Number);
  const [major, minor, patch] = parsedVersion;
  const [minimumMajor, minimumMinor, minimumPatch] = minimum;

  return (
    major === minimumMajor &&
    (minor > minimumMinor || (minor === minimumMinor && patch >= minimumPatch))
  );
};

/** Validates an exact or caret declaration against the installed compatible CLI release. */
export const isSupportedCliDeclaration = (declaration, installedVersion) => {
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

/** Returns whether a resolved path remains inside the trusted root. */
export const isPathWithin = (trustedRoot, candidatePath) => {
  const relativePath = relative(trustedRoot, candidatePath);

  return (
    relativePath === '' ||
    (!relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !isAbsolute(relativePath))
  );
};

/** Reads one bounded regular JSON object without following a file-level symbolic link. */
export const readBoundedJsonObject = async (filePath) => {
  const fileStat = await lstat(filePath);

  if (!fileStat.isFile() || fileStat.size > MAXIMUM_PACKAGE_MANIFEST_BYTES) {
    throw new Error('Package metadata is not a bounded regular file.');
  }

  const bytes = await readFile(filePath);

  if (bytes.byteLength > MAXIMUM_PACKAGE_MANIFEST_BYTES) {
    throw new Error('Package metadata exceeds its byte limit.');
  }

  const parsed = JSON.parse(utf8Decoder.decode(bytes));

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Package metadata must be a JSON object.');
  }

  return parsed;
};

/** Resolves and validates the repository-bound CLI package and executable. */
export const resolveRepositoryCli = async (repositoryRoot) => {
  if (!isAbsolute(repositoryRoot)) {
    throw new Error('The repository root must be absolute.');
  }

  const resolvedRepositoryRoot = await realpath(repositoryRoot);
  const repositoryStat = await lstat(resolvedRepositoryRoot);

  if (!repositoryStat.isDirectory()) {
    throw new Error('The repository root must be a directory.');
  }

  const projectManifest = await readBoundedJsonObject(join(resolvedRepositoryRoot, 'package.json'));
  const declaredCliRange = projectManifest.devDependencies?.['@moldea.ai/cli'];
  const nodeModulesRoot = await realpath(join(resolvedRepositoryRoot, 'node_modules'));
  const cliRoot = await realpath(join(nodeModulesRoot, '@moldea.ai', 'cli'));

  if (!isPathWithin(nodeModulesRoot, cliRoot)) {
    throw new Error('The CLI package escaped repository dependencies.');
  }

  const cliManifest = await readBoundedJsonObject(join(cliRoot, 'package.json'));
  const cliBinaryDeclaration = cliManifest.bin?.moldea;

  if (
    cliManifest.name !== '@moldea.ai/cli' ||
    !isSupportedCliDeclaration(declaredCliRange, cliManifest.version) ||
    cliManifest.dependencies?.['@moldea.ai/core'] !== EXPECTED_CORE_RANGE ||
    cliBinaryDeclaration !== './dist/moldea.js'
  ) {
    throw new Error('The repository declares an unsupported CLI package closure.');
  }

  const cliBinaryPath = await realpath(join(cliRoot, cliBinaryDeclaration));

  if (
    !isPathWithin(cliRoot, cliBinaryPath) ||
    relative(cliRoot, cliBinaryPath).split(sep).join('/') !== 'dist/moldea.js'
  ) {
    throw new Error('The CLI executable escaped its package.');
  }

  return {
    cliBinaryPath,
    cliRoot,
    cliVersion: cliManifest.version,
    nodeModulesRoot,
    repositoryRoot: resolvedRepositoryRoot,
  };
};

/** Returns the first Core package visible to the CLI inside repository dependencies. */
const resolveRepositoryCoreRoot = async (resolvedCli) => {
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
      if (error?.code === 'ENOENT') {
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

/** Loads the repository-root Core implementation declared by the validated CLI closure. */
export const loadRepositoryCore = async (repositoryRoot) => {
  const resolvedCli = await resolveRepositoryCli(repositoryRoot);
  const coreRoot = await resolveRepositoryCoreRoot(resolvedCli);
  const coreEntry = await realpath(join(coreRoot, 'dist', 'index.js'));

  if (
    !isPathWithin(resolvedCli.nodeModulesRoot, coreRoot) ||
    relative(coreRoot, coreEntry).split(sep).join('/') !== 'dist/index.js'
  ) {
    throw new Error('The Core entry escaped repository dependencies.');
  }

  const coreManifest = await readBoundedJsonObject(join(coreRoot, 'package.json'));

  if (
    coreManifest.name !== '@moldea.ai/core' ||
    !isCompatibleStableVersion(coreManifest.version, EXPECTED_CORE_RANGE)
  ) {
    throw new Error('The repository has an unsupported Core package.');
  }

  const coreModule = await import(pathToFileURL(coreEntry).href);

  if (typeof coreModule.createCore !== 'function') {
    throw new Error('The Core package has an invalid public entry.');
  }

  return coreModule.createCore();
};
