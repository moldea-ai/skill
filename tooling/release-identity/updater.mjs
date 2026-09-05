import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import {
  CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
  CLI_PACKAGE_NAME,
  CLI_VERSION_RANGE_TEXT_PATHS,
  RELEASE_PATHS,
} from './constants.mjs';
import {
  assertReleaseIdentity,
  createCompatibleMajorRange,
  parseCompatibleMajorRange,
  parseStableVersion,
} from './identity.mjs';

const NPM_EXECUTABLE = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const createDifferentStableVersion = (version) => {
  const [major] = version.split('.').map(Number);
  return `${major + 1}.0.0`;
};

/** Replaces only portable CLI/Core major-range references. */
const replaceCompatibleRangeReferences = ({
  content,
  nextCliRange,
  nextCoreRange,
  previousCliRange,
  previousCoreRange,
}) => {
  const previousCliMajor = previousCliRange.slice(1).split('.')[0];
  const nextCliMajor = nextCliRange.slice(1).split('.')[0];

  return content
    .split('\n')
    .map((line) => {
      let updatedLine = line;
      if (
        line.includes('@moldea.ai/cli') ||
        line.includes('cliVersionRange') ||
        line.includes('EXPECTED_CLI_RANGE') ||
        line.includes('CLI ')
      ) {
        updatedLine = updatedLine
          .replaceAll(previousCliRange, nextCliRange)
          .replaceAll(`CLI ${previousCliMajor}`, `CLI ${nextCliMajor}`);
      }
      if (line.includes('@moldea.ai/core') || line.includes('EXPECTED_CORE_RANGE')) {
        updatedLine = updatedLine.replaceAll(previousCoreRange, nextCoreRange);
      }
      return updatedLine;
    })
    .join('\n');
};

const updateConformanceCases = ({
  nextCliRange,
  content,
  previousCliRange,
  previousCliJsonSchemaVersion,
  previousCliVersion,
  publishedManifest,
}) => {
  const fixture = JSON.parse(content);
  const nextCliVersion = publishedManifest.version;
  const nextCliJsonSchemaVersion = publishedManifest.jsonSchemaVersion;
  const replaceScenarioVersion = (scenario) =>
    typeof scenario === 'string'
      ? scenario.replaceAll(previousCliVersion, nextCliVersion)
      : scenario;

  for (const packageManagerCase of fixture.packageManagerCases ?? []) {
    packageManagerCase.scenario = replaceScenarioVersion(packageManagerCase.scenario);
    const cli = packageManagerCase.input?.cli;
    if (cli?.declaration === previousCliVersion) cli.declaration = nextCliVersion;
    if (cli?.declaration === previousCliRange) cli.declaration = nextCliRange;
    if (cli?.installedVersion === previousCliVersion) cli.installedVersion = nextCliVersion;
  }

  for (const envelopeCase of fixture.cliEnvelopeCases ?? []) {
    envelopeCase.scenario = replaceScenarioVersion(envelopeCase.scenario);
    const input = envelopeCase.input;
    if (input?.declaredCliVersion === previousCliVersion) {
      input.declaredCliVersion = nextCliVersion;
    }
    if (input?.installedCliVersion === previousCliVersion) {
      input.installedCliVersion = nextCliVersion;
    }
    if (input?.output && typeof input.output === 'object') {
      if (input.output.cliVersion === previousCliVersion) {
        input.output.cliVersion = nextCliVersion;
      }
      if (input.output.schemaVersion === previousCliJsonSchemaVersion) {
        input.output.schemaVersion = nextCliJsonSchemaVersion;
      }
    }
  }

  const schemaMismatch = fixture.cliEnvelopeCases?.find(({ id }) => id === 'schema-mismatch');
  if (!schemaMismatch?.input?.output) {
    throw new Error('The conformance fixture is missing schema-mismatch.');
  }
  const incompatibleSchemaVersion = nextCliJsonSchemaVersion === 1 ? 2 : 1;
  schemaMismatch.input.output.schemaVersion = incompatibleSchemaVersion;
  schemaMismatch.scenario = `Inspect returns an otherwise plausible envelope using unsupported machine schema version ${incompatibleSchemaVersion}.`;

  const versionMismatch = fixture.cliEnvelopeCases?.find(({ id }) => id === 'version-mismatch');
  if (!versionMismatch?.input?.output) {
    throw new Error('The conformance fixture is missing version-mismatch.');
  }
  const incompatibleCliVersion = createDifferentStableVersion(nextCliVersion);
  versionMismatch.input.output.cliVersion = incompatibleCliVersion;
  versionMismatch.scenario = `The machine envelope reports unsupported CLI ${incompatibleCliVersion} while the declared and installed root package is ${nextCliVersion}.`;

  return `${JSON.stringify(fixture, null, 2)}\n`;
};

const parseCliJsonSchemaVersion = (stdout, requestedVersion) => {
  let envelope;
  try {
    envelope = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Unable to parse ${CLI_PACKAGE_NAME}@${requestedVersion} composition output.`, {
      cause: error,
    });
  }

  if (
    envelope?.cliVersion !== requestedVersion ||
    envelope?.command !== 'composition' ||
    envelope?.status !== 'valid' ||
    !Number.isInteger(envelope?.schemaVersion) ||
    envelope.schemaVersion < 1
  ) {
    throw new Error(
      `${CLI_PACKAGE_NAME}@${requestedVersion} returned an invalid composition envelope.`,
    );
  }

  return envelope.schemaVersion;
};

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
    [
      'view',
      `${CLI_PACKAGE_NAME}@${version}`,
      'version',
      'dependencies',
      'dist.integrity',
      'dist.shasum',
      '--json',
    ],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error(
      [`Unable to resolve ${CLI_PACKAGE_NAME}@${version}.`, result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n'),
    );
  }

  const publishedManifest = parsePublishedManifest(result.stdout, version);
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-release-cli-probe-'));

  try {
    const probe = spawnSync(
      NPM_EXECUTABLE,
      [
        'exec',
        '--yes',
        `--package=${CLI_PACKAGE_NAME}@${version}`,
        '--',
        'moldea',
        'composition',
        '--json',
        '--no-color',
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
    if (probe.status !== 0) {
      throw new Error(
        [
          `Unable to probe ${CLI_PACKAGE_NAME}@${version} composition output.`,
          probe.stdout,
          probe.stderr,
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }

    return {
      ...publishedManifest,
      jsonSchemaVersion: parseCliJsonSchemaVersion(probe.stdout, version),
    };
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
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
  if (!Number.isInteger(publishedManifest.jsonSchemaVersion)) {
    throw new Error('The published CLI manifest is missing its JSON schema version.');
  }
  const updatedFiles = new Map(currentFiles);
  const currentPackageManifest = JSON.parse(currentFiles.get(RELEASE_PATHS.packageManifest));
  const semanticCliManifest = JSON.parse(currentFiles.get(RELEASE_PATHS.semanticCliManifest));
  const previousCliRange = createCompatibleMajorRange(previousCliVersion);
  const nextCliRange = createCompatibleMajorRange(version);
  const previousCoreRange = parseCompatibleMajorRange(
    semanticCliManifest.dependencies?.['@moldea.ai/core'],
  );
  const nextCoreRange = parseCompatibleMajorRange(
    publishedManifest.dependencies?.['@moldea.ai/core'],
  );

  for (const relativePath of CLI_VERSION_RANGE_TEXT_PATHS) {
    const currentContent = currentFiles.get(relativePath);
    if (typeof currentContent !== 'string') {
      throw new Error(`Missing release identity source ${relativePath}.`);
    }
    updatedFiles.set(
      relativePath,
      replaceCompatibleRangeReferences({
        content: currentContent,
        nextCliRange,
        nextCoreRange,
        previousCliRange,
        previousCoreRange,
      }),
    );
  }
  const previousCliJsonSchemaVersion = currentPackageManifest.moldeaRelease?.cliJsonSchemaVersion;
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    const currentContent = currentFiles.get(relativePath);
    if (typeof currentContent !== 'string') {
      throw new Error(`Missing release identity source ${relativePath}.`);
    }
    updatedFiles.set(
      relativePath,
      updatedFiles
        .get(relativePath)
        .replaceAll(
          `cliJsonSchemaVersion: ${previousCliJsonSchemaVersion}`,
          `cliJsonSchemaVersion: ${publishedManifest.jsonSchemaVersion}`,
        )
        .replaceAll(
          `CLI JSON schema \`${previousCliJsonSchemaVersion}\``,
          `CLI JSON schema \`${publishedManifest.jsonSchemaVersion}\``,
        )
        .replaceAll(
          `CLI JSON schema: \`${previousCliJsonSchemaVersion}\``,
          `CLI JSON schema: \`${publishedManifest.jsonSchemaVersion}\``,
        )
        .replaceAll(
          `schemaVersion\` is integer \`${previousCliJsonSchemaVersion}\``,
          `schemaVersion\` is integer \`${publishedManifest.jsonSchemaVersion}\``,
        )
        .replaceAll(
          `schema \`${previousCliJsonSchemaVersion}\``,
          `schema \`${publishedManifest.jsonSchemaVersion}\``,
        )
        .replaceAll(
          `schema ${previousCliJsonSchemaVersion}`,
          `schema ${publishedManifest.jsonSchemaVersion}`,
        )
        .replaceAll(
          `version \`${previousCliJsonSchemaVersion}\` envelope`,
          `version \`${publishedManifest.jsonSchemaVersion}\` envelope`,
        ),
    );
  }

  const conformanceCases = currentFiles.get(RELEASE_PATHS.conformanceCases);
  if (typeof conformanceCases !== 'string') {
    throw new Error(`Missing release identity source ${RELEASE_PATHS.conformanceCases}.`);
  }
  updatedFiles.set(
    RELEASE_PATHS.conformanceCases,
    updateConformanceCases({
      content: conformanceCases,
      nextCliRange,
      previousCliRange,
      previousCliJsonSchemaVersion,
      previousCliVersion,
      publishedManifest,
    }),
  );

  updatedFiles.set(RELEASE_PATHS.packageManifest, updatedRootManifests.packageManifest);
  updatedFiles.set(RELEASE_PATHS.packageLock, updatedRootManifests.packageLock);
  updatedFiles.set(
    RELEASE_PATHS.semanticCliManifest,
    `${JSON.stringify(
      {
        ...semanticCliManifest,
        version,
        moldeaRelease: {
          ...semanticCliManifest.moldeaRelease,
          cliJsonSchemaVersion: publishedManifest.jsonSchemaVersion,
        },
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
      ...CLI_VERSION_RANGE_TEXT_PATHS,
      ...CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
      RELEASE_PATHS.conformanceCases,
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
    moldeaRelease: {
      ...packageManifest.moldeaRelease,
      cliJsonSchemaVersion: publishedManifest.jsonSchemaVersion,
    },
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
