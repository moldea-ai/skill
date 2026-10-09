import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { z } from 'zod';

import { PORTABLE_ARTIFACT_PATHS } from '../portable/index.ts';
import { executeProcess } from '../process/index.ts';
import {
  assertReleaseIdentity,
  CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
  CLI_VERSION_RANGE_TEXT_PATHS,
  parseStableVersion,
  RELEASE_PATHS,
  updateCliRelease,
} from '../release/index.ts';

import { createCandidateRegistry, loadCandidateArtifacts } from './artifacts.ts';

const CandidateCliSchema = z.object({
  dependencies: z.record(z.string(), z.string()),
  version: z.string(),
});
const CompositionEnvelopeSchema = z.object({
  cliVersion: z.string(),
  command: z.literal('composition'),
  schemaVersion: z.number().int().positive(),
  status: z.literal('valid'),
});
const EXCLUDED_DIRECTORIES = new Set(['_archive', '_archives', '_backup', '_backups']);

/** Resolves existing ancestors before creating an output path, including directory aliases. */
const resolveOutputPath = (outputDirectory: string): string => {
  let ancestor = resolve(outputDirectory);
  const missingSegments: string[] = [];
  while (!existsSync(ancestor)) {
    missingSegments.unshift(basename(ancestor));
    ancestor = dirname(ancestor);
  }
  return resolve(realpathSync(ancestor), ...missingSegments);
};

/**
 * Prepares a full isolated skill through the ordinary updater and a real candidate registry.
 * @returns A promise that resolves after the complete candidate is installed and verified.
 * @throws If identity, output containment, preparation, or installation verification fails.
 */
export const prepareSkillCandidate = async (options: {
  artifactDirectory: string;
  outputDirectory: string;
  releaseVersion?: string;
  repositoryRoot: string;
}): Promise<void> => {
  const currentIdentity = assertReleaseIdentity(options.repositoryRoot);
  const canonicalOutputPath = resolveOutputPath(options.outputDirectory);
  const outputRelativePath = relative(realpathSync(options.repositoryRoot), canonicalOutputPath);
  assert.ok(
    isAbsolute(outputRelativePath) ||
      outputRelativePath === '..' ||
      outputRelativePath.startsWith(`..${sep}`),
    'Skill candidate output must be outside the source repository.',
  );
  const npmCliPath = process.env['npm_execpath'];
  assert.ok(npmCliPath, 'Run candidate preparation through npm run candidate:prepare.');
  const candidate = loadCandidateArtifacts(options.artifactDirectory);
  const cli = CandidateCliSchema.parse(candidate.artifacts.get('@moldea.ai/cli')?.manifest);
  const releaseVersion = parseStableVersion(
    options.releaseVersion ?? currentIdentity.releaseVersion,
  );
  mkdirSync(options.outputDirectory, { recursive: true });
  assert.equal(
    realpathSync(options.outputDirectory),
    canonicalOutputPath,
    'Skill candidate output changed during preparation.',
  );
  assert.equal(
    readdirSync(options.outputDirectory).length,
    0,
    'Skill candidate output must be empty.',
  );
  const paths = new Set([
    ...Object.values(RELEASE_PATHS),
    ...CLI_VERSION_RANGE_TEXT_PATHS,
    ...CLI_JSON_SCHEMA_VERSION_TEXT_PATHS,
    ...PORTABLE_ARTIFACT_PATHS,
    'docs/compatibility-and-local-tooling.md',
    'qualification/package.json',
    'website/package.json',
    'fixtures/tooling/semantic-cli/bin/moldea.js',
  ]);
  for (const relativePath of paths) {
    const destination = join(options.outputDirectory, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(options.repositoryRoot, relativePath), destination);
  }
  for (const relativePath of ['moldea', 'src/portable', 'src/filesystem/atomic-bytes']) {
    cpSync(
      join(options.repositoryRoot, relativePath),
      join(options.outputDirectory, relativePath),
      {
        recursive: true,
        filter: (sourcePath) => !EXCLUDED_DIRECTORIES.has(basename(sourcePath)),
      },
    );
  }
  const manifestPath = join(options.outputDirectory, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version: string };
  manifest.version = releaseVersion;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const lockPath = join(options.outputDirectory, 'package-lock.json');
  const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as {
    version: string;
    packages: Record<string, { version: string }>;
  };
  assert.ok(lock.packages['']);
  lock.version = releaseVersion;
  lock.packages[''].version = releaseVersion;
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  for (const relativePath of [
    RELEASE_PATHS.skill,
    RELEASE_PATHS.readme,
    RELEASE_PATHS.gettingStarted,
    RELEASE_PATHS.skillLocalTooling,
    'docs/compatibility-and-local-tooling.md',
  ]) {
    const filePath = join(options.outputDirectory, relativePath);
    writeFileSync(
      filePath,
      readFileSync(filePath, 'utf8').replaceAll(currentIdentity.releaseVersion, releaseVersion),
    );
  }

  const registry = await createCandidateRegistry(candidate.artifacts);
  const registryConfigPath = join(options.outputDirectory, '.npmrc');
  const environment = { ...process.env, npm_config_userconfig: registryConfigPath };
  const runNpm = async (cwd: string, args: string[]): Promise<void> => {
    await executeProcess({
      command: process.execPath,
      args: [npmCliPath, ...args],
      cwd,
      environment,
    });
  };
  try {
    writeFileSync(registryConfigPath, `@moldea.ai:registry=${registry.registryUrl}/\n`);
    const probeRoot = mkdtempSync(join(tmpdir(), 'moldea-candidate-probe-'));
    let cliJsonSchemaVersion: number;
    try {
      writeFileSync(
        join(probeRoot, 'package.json'),
        JSON.stringify({
          private: true,
          devDependencies: { '@moldea.ai/cli': cli.version },
        }),
      );
      await runNpm(probeRoot, ['install', '--ignore-scripts', '--no-audit', '--no-fund']);
      const result = await executeProcess({
        command: process.execPath,
        args: [
          join(probeRoot, 'node_modules/@moldea.ai/cli/dist/moldea.js'),
          'composition',
          '--json',
        ],
        cwd: probeRoot,
        environment,
      });
      const composition = CompositionEnvelopeSchema.parse(JSON.parse(result.stdout) as unknown);
      assert.equal(composition.cliVersion, cli.version);
      cliJsonSchemaVersion = composition.schemaVersion;
    } finally {
      rmSync(probeRoot, { force: true, recursive: true });
    }
    await updateCliRelease({
      repositoryRoot: options.outputDirectory,
      version: cli.version,
      resolveManifest: () => ({
        dependencies: cli.dependencies,
        jsonSchemaVersion: cliJsonSchemaVersion,
        version: cli.version,
      }),
      updateRootManifests: async ({ packageLock, packageManifest }) => {
        const temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-candidate-lock-'));
        try {
          writeFileSync(
            join(temporaryRoot, 'package.json'),
            `${JSON.stringify(packageManifest, null, 2)}\n`,
          );
          writeFileSync(join(temporaryRoot, 'package-lock.json'), packageLock);
          for (const relativePath of ['qualification/package.json', 'website/package.json']) {
            mkdirSync(dirname(join(temporaryRoot, relativePath)), { recursive: true });
            cpSync(join(options.outputDirectory, relativePath), join(temporaryRoot, relativePath));
          }
          await runNpm(temporaryRoot, [
            'install',
            '--package-lock-only',
            '--ignore-scripts',
            '--no-audit',
            '--no-fund',
          ]);
          return {
            packageLock: readFileSync(join(temporaryRoot, 'package-lock.json'), 'utf8'),
            packageManifest: readFileSync(join(temporaryRoot, 'package.json'), 'utf8'),
          };
        } finally {
          rmSync(temporaryRoot, { force: true, recursive: true });
        }
      },
      installDependencies: async (temporaryRoot) =>
        runNpm(temporaryRoot, ['ci', '--ignore-scripts', '--no-audit', '--no-fund']),
    });
    await runNpm(options.outputDirectory, ['ci', '--ignore-scripts', '--no-audit', '--no-fund']);
    assertReleaseIdentity(options.outputDirectory);
  } finally {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      registry.server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
      registry.server.closeIdleConnections();
    });
  }
};

const run = async (): Promise<void> => {
  const argumentsList = process.argv.slice(2);
  assert.ok(
    argumentsList.length === 4 || argumentsList.length === 6,
    'Usage: skill-candidate.ts --artifacts <directory> --output <directory> [--release-version <version>]',
  );
  const argumentsMap = new Map<string, string>();
  for (let index = 0; index < argumentsList.length; index += 2) {
    const name = argumentsList[index];
    const argument = argumentsList[index + 1];
    assert.ok(
      name &&
        ['--artifacts', '--output', '--release-version'].includes(name) &&
        argument &&
        !argumentsMap.has(name),
      'Invalid skill candidate arguments.',
    );
    argumentsMap.set(name, argument);
  }
  const artifactDirectory = argumentsMap.get('--artifacts');
  const outputDirectory = argumentsMap.get('--output');
  const releaseVersion = argumentsMap.get('--release-version');
  assert.ok(artifactDirectory && outputDirectory);
  await prepareSkillCandidate({
    artifactDirectory: resolve(artifactDirectory),
    outputDirectory: resolve(outputDirectory),
    ...(releaseVersion === undefined ? {} : { releaseVersion }),
    repositoryRoot: resolve(import.meta.dirname, '../..'),
  });
  process.stdout.write('Complete skill candidate prepared and installed.\n');
};

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
