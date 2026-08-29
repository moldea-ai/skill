// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { ensureDirectory } from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import { calculateQualificationBaselineDigestAtCommit } from './fingerprints.ts';

const createCaseCatalog = (adapterDescription: string): string => `version: 2
cases:
  - id: evaluate-aligned-project
    title: Evaluate an aligned project
    layer: universal-baseline
    description: Inspect a valid project.
    challenge: Preserve valid state.
  - id: repair-adapter-tool
    title: Repair an adapter tool
    layer: adapter-specific
    description: ${adapterDescription}
    challenge: Repair the adapter fixture.
`;

const createPackageLock = (adapterVersion: string): string =>
  `${JSON.stringify(
    {
      name: '@moldea.ai/adapter-qualification',
      version: '0.0.0',
      lockfileVersion: 3,
      requires: true,
      packages: {
        '': {
          name: '@moldea.ai/adapter-qualification',
          version: '0.0.0',
          dependencies: { yaml: '2.9.0' },
          devDependencies: { 'adapter-sdk': adapterVersion },
          engines: { node: '^24.15.0' },
        },
        'node_modules/adapter-sdk': {
          version: adapterVersion,
          dev: true,
          integrity: `sha512-adapter-${adapterVersion}`,
        },
        'node_modules/yaml': {
          version: '2.9.0',
          integrity: 'sha512-yaml-runtime',
        },
      },
    },
    null,
    2,
  )}\n`;

/** Commits the complete fixture state and returns its immutable source identity. */
const commitFixture = async (repositoryRoot: string, message: string): Promise<string> => {
  await executeProcess({ command: 'git', args: ['add', '-A'], cwd: repositoryRoot });
  await executeProcess({
    command: 'git',
    args: [
      '-c',
      'user.name=Moldea Qualification',
      '-c',
      'user.email=qualification@moldea.local',
      'commit',
      '-m',
      message,
    ],
    cwd: repositoryRoot,
  });
  const { stdout } = await executeProcess({
    command: 'git',
    args: ['rev-parse', 'HEAD'],
    cwd: repositoryRoot,
  });
  return stdout.trim();
};

describe('qualification baseline fingerprint', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('ignores adapter-only growth while retaining universal evaluator behavior', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-baseline-fingerprint-'));
    const files = {
      adapterProfile: path.join(
        temporaryRoot,
        'qualification/profiles/example/typescript/profile.yaml',
      ),
      caseCatalog: path.join(temporaryRoot, 'qualification/cases/cases.yaml'),
      customReadme: path.join(temporaryRoot, 'qualification/profiles/custom/custom/README.md'),
      customFixtureReadme: path.join(
        temporaryRoot,
        'qualification/profiles/custom/custom/projects/evaluate/seed/README.md',
      ),
      customTask: path.join(
        temporaryRoot,
        'qualification/profiles/custom/custom/projects/evaluate/task.md',
      ),
      evaluator: path.join(temporaryRoot, 'qualification/src/execution/executor.ts'),
      evaluatorTest: path.join(
        temporaryRoot,
        'qualification/src/execution/executor.test-integration.ts',
      ),
      host: path.join(temporaryRoot, 'tooling/codex-evaluation-host/host.mjs'),
      hostTest: path.join(temporaryRoot, 'tooling/codex-evaluation-host/host.test-unit.mjs'),
      packageCandidate: path.join(temporaryRoot, 'tooling/package-candidate/index.mjs'),
      packageManifest: path.join(temporaryRoot, 'qualification/package.json'),
      packageLock: path.join(temporaryRoot, 'qualification/package-lock.json'),
    };
    await Promise.all(
      Object.values(files).map((filePath) => ensureDirectory(path.dirname(filePath))),
    );
    await Promise.all([
      writeFile(files.adapterProfile, 'version: 2\nadapterId: example\n', 'utf8'),
      writeFile(files.caseCatalog, createCaseCatalog('Initial adapter case.'), 'utf8'),
      writeFile(files.customReadme, '# Custom profile\n', 'utf8'),
      writeFile(files.customFixtureReadme, '# Existing project documentation\n', 'utf8'),
      writeFile(files.customTask, '# Evaluate the project\n', 'utf8'),
      writeFile(files.evaluator, 'export const evaluatorVersion = 1;\n', 'utf8'),
      writeFile(files.evaluatorTest, 'export const testVersion = 1;\n', 'utf8'),
      writeFile(files.host, 'export const hostVersion = 1;\n', 'utf8'),
      writeFile(files.hostTest, 'export const testVersion = 1;\n', 'utf8'),
      writeFile(files.packageCandidate, 'export const candidateVersion = 1;\n', 'utf8'),
      writeFile(
        files.packageManifest,
        `${JSON.stringify({
          type: 'module',
          engines: { node: '^24.15.0' },
          scripts: { qualification: 'node src/bin/index.ts', test: 'vitest run' },
          dependencies: { yaml: '2.9.0' },
          devDependencies: { 'adapter-sdk': '1.0.0' },
        })}\n`,
        'utf8',
      ),
      writeFile(files.packageLock, createPackageLock('1.0.0'), 'utf8'),
    ]);
    await executeProcess({
      command: 'git',
      args: ['init', '--initial-branch=main'],
      cwd: temporaryRoot,
    });
    const initialCommit = await commitFixture(temporaryRoot, 'test: seed baseline inputs');
    const initialDigest = await calculateQualificationBaselineDigestAtCommit(
      initialCommit,
      temporaryRoot,
    );

    await Promise.all([
      writeFile(
        files.adapterProfile,
        'version: 2\nadapterId: example\ntitle: Added profile\n',
        'utf8',
      ),
      writeFile(files.caseCatalog, createCaseCatalog('Revised adapter-only case.'), 'utf8'),
      writeFile(files.customReadme, '# Expanded Custom documentation\n', 'utf8'),
      writeFile(files.evaluatorTest, 'export const testVersion = 2;\n', 'utf8'),
      writeFile(files.hostTest, 'export const testVersion = 2;\n', 'utf8'),
      writeFile(
        files.packageManifest,
        `${JSON.stringify({
          type: 'module',
          engines: { node: '^24.15.0' },
          scripts: { qualification: 'node src/bin/index.ts', test: 'vitest run --coverage' },
          dependencies: { yaml: '2.9.0' },
          devDependencies: { 'adapter-sdk': '2.0.0' },
        })}\n`,
        'utf8',
      ),
      writeFile(files.packageLock, createPackageLock('2.0.0'), 'utf8'),
    ]);
    const adapterGrowthCommit = await commitFixture(temporaryRoot, 'test: add adapter-only inputs');
    expect(
      await calculateQualificationBaselineDigestAtCommit(adapterGrowthCommit, temporaryRoot),
    ).toBe(initialDigest);

    await writeFile(files.customFixtureReadme, '# Changed project documentation\n', 'utf8');
    const fixtureChangeCommit = await commitFixture(
      temporaryRoot,
      'test: change Custom fixture documentation',
    );
    const fixtureChangeDigest = await calculateQualificationBaselineDigestAtCommit(
      fixtureChangeCommit,
      temporaryRoot,
    );
    expect(fixtureChangeDigest).not.toBe(initialDigest);

    await writeFile(files.customTask, '# Evaluate and reconcile the project\n', 'utf8');
    const customChangeCommit = await commitFixture(temporaryRoot, 'test: change Custom behavior');
    const customChangeDigest = await calculateQualificationBaselineDigestAtCommit(
      customChangeCommit,
      temporaryRoot,
    );
    expect(customChangeDigest).not.toBe(fixtureChangeDigest);

    await writeFile(files.evaluator, 'export const evaluatorVersion = 2;\n', 'utf8');
    const evaluatorChangeCommit = await commitFixture(
      temporaryRoot,
      'test: change evaluator behavior',
    );
    const evaluatorChangeDigest = await calculateQualificationBaselineDigestAtCommit(
      evaluatorChangeCommit,
      temporaryRoot,
    );
    expect(evaluatorChangeDigest).not.toBe(customChangeDigest);

    await writeFile(
      files.packageManifest,
      `${JSON.stringify({
        type: 'module',
        engines: { node: '^24.15.0' },
        scripts: { qualification: 'node src/bin/next.ts', test: 'vitest run --coverage' },
        dependencies: { yaml: '2.9.0' },
        devDependencies: { 'adapter-sdk': '2.0.0' },
      })}\n`,
      'utf8',
    );
    const runtimeEntryPointCommit = await commitFixture(
      temporaryRoot,
      'test: change qualification entry point',
    );
    expect(
      await calculateQualificationBaselineDigestAtCommit(runtimeEntryPointCommit, temporaryRoot),
    ).not.toBe(evaluatorChangeDigest);
  });
});
