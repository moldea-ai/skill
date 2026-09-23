import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { z } from 'zod';

import {
  CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
  CLI_PACKAGE_NAME,
  CLI_VERSION_RANGE_TEXT_PATHS,
  CORE_VERSION_RANGE_TEXT_PATHS,
  RELEASE_PATHS,
} from './constants.ts';
import { assertReleaseIdentity } from './identity.ts';
import type { IReleaseIdentity, IReleasePackageManifest } from './types.ts';
import {
  createCompatibleMajorRange,
  parseCompatibleStableRange,
  parseStableVersion,
} from './versions.ts';

const NPM_EXECUTABLE = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const StringRecordSchema = z.record(z.string(), z.string());
const PublishedRegistryManifestSchema = z.object({
  dependencies: StringRecordSchema,
  version: z.string(),
});
const PublishedCliManifestSchema = PublishedRegistryManifestSchema.extend({
  jsonSchemaVersion: z.number().int().positive(),
});
const RootPackageManifestSchema = z.object({
  devDependencies: StringRecordSchema.default({}),
  moldeaRelease: z.object({
    cliJsonSchemaVersion: z.number().int().positive(),
    coreVersionRange: z.string(),
  }),
  version: z.string().optional(),
});
const SemanticCliManifestSchema = z
  .object({
    dependencies: StringRecordSchema,
    moldeaRelease: z.object({ cliJsonSchemaVersion: z.number().int().positive() }),
    version: z.string(),
  })
  .passthrough();
const PackageManagerCaseSchema = z.object({
  input: z.object({
    cli: z.object({ declaration: z.string(), installedVersion: z.string() }),
  }),
  scenario: z.string(),
});
const CliEnvelopeCaseSchema = z
  .object({
    id: z.string(),
    input: z.object({
      declaredCliVersion: z.string().optional(),
      installedCliVersion: z.string().optional(),
      output: z
        .object({ cliVersion: z.string(), schemaVersion: z.number().int() })
        .passthrough()
        .optional(),
    }),
    scenario: z.string().optional(),
  })
  .passthrough();
const ConformanceFixtureSchema = z
  .object({
    packageManagerCases: z.array(PackageManagerCaseSchema).optional(),
    cliEnvelopeCases: z.array(CliEnvelopeCaseSchema),
  })
  .passthrough();
const CliCompositionEnvelopeSchema = z.object({
  cliVersion: z.string(),
  command: z.literal('composition'),
  schemaVersion: z.number().int().positive(),
  status: z.literal('valid'),
});

type IPublishedRegistryManifest = z.infer<typeof PublishedRegistryManifestSchema>;
type IPublishedCliManifest = z.infer<typeof PublishedCliManifestSchema>;
type IUpdatedRootManifests = { packageLock: string; packageManifest: string };
type IReleaseFiles = ReadonlyMap<string, string>;

const parseJson = (source: string, label: string): unknown => {
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error(`${label} is not valid JSON.`, { cause: error });
  }
};

const requireFile = (files: IReleaseFiles, relativePath: string): string => {
  const content = files.get(relativePath);
  if (content === undefined) throw new Error(`Missing release identity source ${relativePath}.`);
  return content;
};

const createDifferentStableVersion = (version: string): string => {
  const [major] = version.split('.').map(Number);
  return `${(major ?? 0) + 1}.0.0`;
};

/** Preserves a safe Core minimum within one major and resets it for a new CLI Core major. */
const resolveNextCoreVersionRange = ({
  nextCliCoreRange,
  previousCliCoreRange,
  previousRange,
}: {
  nextCliCoreRange: string;
  previousCliCoreRange: string;
  previousRange: string;
}): string =>
  nextCliCoreRange.split('.')[0] === previousCliCoreRange.split('.')[0]
    ? parseCompatibleStableRange(previousRange)
    : nextCliCoreRange;

/** Replaces only portable CLI/Core major-range references. */
const replaceCompatibleRangeReferences = ({
  content,
  nextCliRange,
  nextCoreRange,
  previousCliRange,
  previousCoreRange,
}: {
  content: string;
  nextCliRange: string;
  nextCoreRange: string;
  previousCliRange: string;
  previousCoreRange: string;
}): string => {
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
      if (line.includes('@moldea.ai/core')) {
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
}: {
  content: string;
  nextCliRange: string;
  previousCliJsonSchemaVersion: number;
  previousCliRange: string;
  previousCliVersion: string;
  publishedManifest: IPublishedCliManifest;
}): string => {
  const fixture = ConformanceFixtureSchema.parse(parseJson(content, 'Conformance fixture'));
  const nextCliVersion = publishedManifest.version;
  const nextCliJsonSchemaVersion = publishedManifest.jsonSchemaVersion;
  const replaceScenarioVersion = (scenario: string): string =>
    scenario.replaceAll(previousCliVersion, nextCliVersion);

  for (const packageManagerCase of fixture.packageManagerCases ?? []) {
    packageManagerCase.scenario = replaceScenarioVersion(packageManagerCase.scenario);
    const cli = packageManagerCase.input?.cli;
    if (cli?.declaration === previousCliVersion) cli.declaration = nextCliVersion;
    if (cli?.declaration === previousCliRange) cli.declaration = nextCliRange;
    if (cli?.installedVersion === previousCliVersion) cli.installedVersion = nextCliVersion;
  }

  for (const envelopeCase of fixture.cliEnvelopeCases ?? []) {
    if (envelopeCase.scenario !== undefined) {
      envelopeCase.scenario = replaceScenarioVersion(envelopeCase.scenario);
    }
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

  const schemaMismatch = fixture.cliEnvelopeCases.find(({ id }) => id === 'schema-mismatch');
  if (!schemaMismatch?.input?.output) {
    throw new Error('The conformance fixture is missing schema-mismatch.');
  }
  const incompatibleSchemaVersion = nextCliJsonSchemaVersion === 1 ? 2 : 1;
  schemaMismatch.input.output.schemaVersion = incompatibleSchemaVersion;
  schemaMismatch.scenario = `Inspect returns an otherwise plausible envelope using unsupported machine schema version ${incompatibleSchemaVersion}.`;

  const versionMismatch = fixture.cliEnvelopeCases.find(({ id }) => id === 'version-mismatch');
  if (!versionMismatch?.input?.output) {
    throw new Error('The conformance fixture is missing version-mismatch.');
  }
  const incompatibleCliVersion = createDifferentStableVersion(nextCliVersion);
  versionMismatch.input.output.cliVersion = incompatibleCliVersion;
  versionMismatch.scenario = `The machine envelope reports unsupported CLI ${incompatibleCliVersion} while the declared and installed root package is ${nextCliVersion}.`;

  return `${JSON.stringify(fixture, null, 2)}\n`;
};

const parseCliJsonSchemaVersion = (stdout: string, requestedVersion: string): number => {
  const envelope = CliCompositionEnvelopeSchema.parse(
    parseJson(stdout, `${CLI_PACKAGE_NAME}@${requestedVersion} composition output`),
  );

  if (
    envelope?.cliVersion !== requestedVersion ||
    envelope?.command !== 'composition' ||
    envelope?.status !== 'valid' ||
    envelope.status !== 'valid'
  ) {
    throw new Error(
      `${CLI_PACKAGE_NAME}@${requestedVersion} returned an invalid composition envelope.`,
    );
  }

  return envelope.schemaVersion;
};

const parsePublishedManifest = (
  stdout: string,
  requestedVersion: string,
): IPublishedRegistryManifest => {
  const manifest = PublishedRegistryManifestSchema.parse(
    parseJson(stdout, `${CLI_PACKAGE_NAME}@${requestedVersion} registry response`),
  );
  if (manifest.version !== requestedVersion) {
    throw new Error(
      `The npm registry returned ${String(manifest.version)}, expected ${requestedVersion}.`,
    );
  }
  return manifest;
};

/** Resolves one exact stable CLI manifest from the public npm registry. */
export const resolvePublishedCliManifest = (version: string): IPublishedCliManifest => {
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

    return PublishedCliManifestSchema.parse({
      ...publishedManifest,
      jsonSchemaVersion: parseCliJsonSchemaVersion(probe.stdout, version),
    });
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

const createUpdatedRootManifests = ({
  packageLock,
  packageManifest,
  version,
}: {
  packageLock: string;
  packageManifest: IReleasePackageManifest;
  version: string;
}): IUpdatedRootManifests => {
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
}: {
  currentFiles: IReleaseFiles;
  previousCliVersion: string;
  publishedManifest: IPublishedCliManifest;
  updatedRootManifests: IUpdatedRootManifests;
}): Map<string, string> => {
  const version = parseStableVersion(publishedManifest.version);
  if (!Number.isInteger(publishedManifest.jsonSchemaVersion)) {
    throw new Error('The published CLI manifest is missing its JSON schema version.');
  }
  const updatedFiles = new Map(currentFiles);
  const currentPackageManifest = RootPackageManifestSchema.parse(
    parseJson(
      requireFile(currentFiles, RELEASE_PATHS.packageManifest),
      RELEASE_PATHS.packageManifest,
    ),
  );
  const semanticCliManifest = SemanticCliManifestSchema.parse(
    parseJson(
      requireFile(currentFiles, RELEASE_PATHS.semanticCliManifest),
      RELEASE_PATHS.semanticCliManifest,
    ),
  );
  const previousCliRange = createCompatibleMajorRange(previousCliVersion);
  const nextCliRange = createCompatibleMajorRange(version);
  const previousCoreRange = parseCompatibleStableRange(
    semanticCliManifest.dependencies?.['@moldea.ai/core'],
  );
  const nextCoreRange = parseCompatibleStableRange(
    publishedManifest.dependencies?.['@moldea.ai/core'],
  );
  const previousSupportedCoreRange = parseCompatibleStableRange(
    currentPackageManifest.moldeaRelease?.coreVersionRange,
  );
  const nextSupportedCoreRange = resolveNextCoreVersionRange({
    nextCliCoreRange: nextCoreRange,
    previousCliCoreRange: previousCoreRange,
    previousRange: previousSupportedCoreRange,
  });

  for (const relativePath of CLI_VERSION_RANGE_TEXT_PATHS) {
    const currentContent = requireFile(currentFiles, relativePath);
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
  for (const relativePath of CORE_VERSION_RANGE_TEXT_PATHS) {
    const currentContent = requireFile(updatedFiles, relativePath);
    updatedFiles.set(
      relativePath,
      currentContent.replaceAll(previousSupportedCoreRange, nextSupportedCoreRange),
    );
  }
  const previousCliJsonSchemaVersion = currentPackageManifest.moldeaRelease?.cliJsonSchemaVersion;
  for (const relativePath of CLI_JSON_SCHEMA_VERSION_TEXT_PATHS) {
    let currentContent = requireFile(updatedFiles, relativePath);
    if (relativePath === RELEASE_PATHS.skill) {
      const previousMetadata = `cliJsonSchemaVersion: '${previousCliJsonSchemaVersion}'`;
      if (currentContent.split(previousMetadata).length !== 2) {
        throw new Error('The skill JSON schema metadata must be one quoted string value.');
      }
      currentContent = currentContent.replace(
        previousMetadata,
        `cliJsonSchemaVersion: '${publishedManifest.jsonSchemaVersion}'`,
      );
    }
    updatedFiles.set(
      relativePath,
      currentContent
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

  const conformanceCases = requireFile(currentFiles, RELEASE_PATHS.conformanceCases);
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

const writeFileAtomically = (path: string, content: string, mode: number | undefined): void => {
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
}: {
  repositoryRoot: string;
  resolveManifest?: (version: string) => IPublishedCliManifest;
  updateRootManifests?: (options: {
    packageLock: string;
    packageManifest: IReleasePackageManifest;
    version: string;
  }) => IUpdatedRootManifests;
  version: string;
}): IReleaseIdentity => {
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
  const packageManifest = RootPackageManifestSchema.parse(
    parseJson(
      requireFile(currentFiles, RELEASE_PATHS.packageManifest),
      RELEASE_PATHS.packageManifest,
    ),
  );
  const previousCliVersion = parseStableVersion(
    packageManifest.devDependencies?.[CLI_PACKAGE_NAME],
  );
  const semanticCliManifest = SemanticCliManifestSchema.parse(
    parseJson(
      requireFile(currentFiles, RELEASE_PATHS.semanticCliManifest),
      RELEASE_PATHS.semanticCliManifest,
    ),
  );
  const previousCliCoreRange = parseCompatibleStableRange(
    semanticCliManifest.dependencies?.['@moldea.ai/core'],
  );
  const nextCliCoreRange = parseCompatibleStableRange(
    publishedManifest.dependencies?.['@moldea.ai/core'],
  );
  const nextCoreVersionRange = resolveNextCoreVersionRange({
    nextCliCoreRange,
    previousCliCoreRange,
    previousRange: packageManifest.moldeaRelease?.coreVersionRange,
  });
  const nextPackageManifest = {
    ...packageManifest,
    moldeaRelease: {
      ...packageManifest.moldeaRelease,
      cliJsonSchemaVersion: publishedManifest.jsonSchemaVersion,
      coreVersionRange: nextCoreVersionRange,
    },
    devDependencies: {
      ...packageManifest.devDependencies,
      [CLI_PACKAGE_NAME]: version,
    },
  };
  const updatedRootManifests = updateRootManifests({
    packageLock: requireFile(currentFiles, RELEASE_PATHS.packageLock),
    packageManifest: RootPackageManifestSchema.parse(
      nextPackageManifest,
    ) as IReleasePackageManifest,
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

  const fileModes = new Map<string, number>(
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
