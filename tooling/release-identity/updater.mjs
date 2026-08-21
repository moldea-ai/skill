import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { CLI_PACKAGE_NAME, CLI_VERSION_TEXT_PATHS, RELEASE_PATHS } from './constants.mjs';
import { assertReleaseIdentity, parseStableVersion } from './identity.mjs';

const NPM_EXECUTABLE = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const parsePublishedManifest = (stdout, requestedVersion) => {
  const manifest = JSON.parse(stdout);
  if (manifest.version !== requestedVersion) {
    throw new Error(
      `The npm registry returned ${String(manifest.version)}, expected ${requestedVersion}.`,
    );
  }
  if (
    !manifest.dependencies ||
    typeof manifest.dependencies !== 'object' ||
    Array.isArray(manifest.dependencies) ||
    !Object.values(manifest.dependencies).every((version) => typeof version === 'string')
  ) {
    throw new Error(`The npm registry returned invalid dependencies for ${CLI_PACKAGE_NAME}.`);
  }

  return manifest;
};

/** Resolves one exact stable CLI manifest from the public npm registry. */
export const resolvePublishedCliManifest = (version) => {
  parseStableVersion(version);
  const result = spawnSync(
    NPM_EXECUTABLE,
    ['view', `${CLI_PACKAGE_NAME}@${version}`, 'version', 'dependencies', '--json'],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error(
      [`Unable to resolve ${CLI_PACKAGE_NAME}@${version}.`, result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n'),
    );
  }

  return parsePublishedManifest(result.stdout, version);
};

const createUpdatedRootManifests = ({ packageLock, packageManifest, version }) => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-release-cli-'));

  try {
    writeFileSync(
      join(temporaryRoot, RELEASE_PATHS.packageManifest),
      `${JSON.stringify(packageManifest, null, 2)}\n`,
      'utf8',
    );
    writeFileSync(join(temporaryRoot, RELEASE_PATHS.packageLock), packageLock, 'utf8');
    const result = spawnSync(
      NPM_EXECUTABLE,
      [
        'install',
        '--package-lock-only',
        '--ignore-scripts',
        '--save-dev',
        '--save-exact',
        `${CLI_PACKAGE_NAME}@${version}`,
      ],
      {
        cwd: temporaryRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          npm_config_audit: 'false',
          npm_config_fund: 'false',
          npm_config_update_notifier: 'false',
        },
      },
    );

    if (result.status !== 0) {
      throw new Error(
        ['Unable to create the updated package lock.', result.stdout, result.stderr]
          .filter(Boolean)
          .join('\n'),
      );
    }

    return {
      packageLock: readFileSync(join(temporaryRoot, RELEASE_PATHS.packageLock), 'utf8'),
      packageManifest: readFileSync(join(temporaryRoot, RELEASE_PATHS.packageManifest), 'utf8'),
    };
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

/** Creates the complete in-memory file update for one exact CLI release. */
export const createCliReleaseUpdate = ({
  currentFiles,
  previousCliVersion,
  publishedManifest,
  updatedRootManifests,
}) => {
  const version = parseStableVersion(publishedManifest.version);
  const updatedFiles = new Map(currentFiles);

  for (const relativePath of CLI_VERSION_TEXT_PATHS) {
    const currentContent = currentFiles.get(relativePath);
    if (typeof currentContent !== 'string') {
      throw new Error(`Missing release identity source ${relativePath}.`);
    }
    updatedFiles.set(relativePath, currentContent.replaceAll(previousCliVersion, version));
  }

  const semanticCliManifest = JSON.parse(currentFiles.get(RELEASE_PATHS.semanticCliManifest));
  updatedFiles.set(RELEASE_PATHS.packageManifest, updatedRootManifests.packageManifest);
  updatedFiles.set(RELEASE_PATHS.packageLock, updatedRootManifests.packageLock);
  updatedFiles.set(
    RELEASE_PATHS.semanticCliManifest,
    `${JSON.stringify(
      {
        ...semanticCliManifest,
        version,
        dependencies: publishedManifest.dependencies,
      },
      null,
      2,
    )}\n`,
  );

  return updatedFiles;
};

const writeFileAtomically = (path, content, mode) => {
  const temporaryPath = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${Date.now()}.temporary`,
  );
  writeFileSync(temporaryPath, content, { encoding: 'utf8', mode });
  renameSync(temporaryPath, path);
};

/** Updates every release-owned CLI identity after validating the published package. */
export const updateCliRelease = ({
  repositoryRoot,
  version,
  resolveManifest = resolvePublishedCliManifest,
  updateRootManifests = createUpdatedRootManifests,
}) => {
  parseStableVersion(version);
  const publishedManifest = resolveManifest(version);
  const managedPaths = [
    ...new Set([
      ...CLI_VERSION_TEXT_PATHS,
      RELEASE_PATHS.packageManifest,
      RELEASE_PATHS.packageLock,
      RELEASE_PATHS.semanticCliManifest,
    ]),
  ];
  const currentFiles = new Map(
    managedPaths.map((relativePath) => [
      relativePath,
      readFileSync(join(repositoryRoot, relativePath), 'utf8'),
    ]),
  );
  const packageManifest = JSON.parse(currentFiles.get(RELEASE_PATHS.packageManifest));
  const previousCliVersion = parseStableVersion(
    packageManifest.devDependencies?.[CLI_PACKAGE_NAME],
  );
  const nextPackageManifest = {
    ...packageManifest,
    devDependencies: {
      ...packageManifest.devDependencies,
      [CLI_PACKAGE_NAME]: version,
    },
  };
  const updatedRootManifests = updateRootManifests({
    packageLock: currentFiles.get(RELEASE_PATHS.packageLock),
    packageManifest: nextPackageManifest,
    version,
  });
  const updatedFiles = createCliReleaseUpdate({
    currentFiles,
    previousCliVersion,
    publishedManifest,
    updatedRootManifests,
  });

  for (const [relativePath, originalContent] of currentFiles) {
    const currentContent = readFileSync(join(repositoryRoot, relativePath), 'utf8');
    if (currentContent !== originalContent) {
      throw new Error(`${relativePath} changed while the CLI update was being prepared.`);
    }
  }

  const fileModes = new Map(
    managedPaths.map((relativePath) => [
      relativePath,
      statSync(join(repositoryRoot, relativePath)).mode & 0o777,
    ]),
  );
  try {
    for (const [relativePath, content] of updatedFiles) {
      writeFileAtomically(join(repositoryRoot, relativePath), content, fileModes.get(relativePath));
    }
    assertReleaseIdentity(repositoryRoot);
  } catch (error) {
    for (const [relativePath, content] of currentFiles) {
      writeFileAtomically(join(repositoryRoot, relativePath), content, fileModes.get(relativePath));
    }
    throw error;
  }

  return assertReleaseIdentity(repositoryRoot);
};
