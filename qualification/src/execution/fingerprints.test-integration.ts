// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { ensureDirectory } from '../filesystem/index.ts';
import {
  calculatePackagesQualificationDigest,
  calculateQualificationExecutionDigest,
  calculateQualificationProfileDigest,
  calculateQualificationTargetDigest,
  type IQualificationExecutionDigestRoots,
} from './fingerprints.ts';

const createPackageManifest = (adapterVersion: string, runtimeVersion: string): string =>
  `${JSON.stringify({
    type: 'module',
    engines: { node: '^24.15.0' },
    scripts: { qualification: 'node src/bin/index.ts', test: 'vitest run' },
    dependencies: { yaml: runtimeVersion },
    devDependencies: { 'adapter-sdk': adapterVersion },
  })}\n`;

const createPackageLock = (adapterVersion: string, runtimeVersion: string): string =>
  `${JSON.stringify({
    name: '@moldea.ai/adapter-qualification',
    version: '0.0.0',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': {
        name: '@moldea.ai/adapter-qualification',
        version: '0.0.0',
        dependencies: { yaml: runtimeVersion },
        devDependencies: { 'adapter-sdk': adapterVersion },
        engines: { node: '^24.15.0' },
      },
      'node_modules/adapter-sdk': {
        version: adapterVersion,
        dev: true,
        integrity: `sha512-adapter-${adapterVersion}`,
      },
      'node_modules/yaml': {
        version: runtimeVersion,
        integrity: `sha512-yaml-${runtimeVersion}`,
      },
    },
  })}\n`;

const createToolingPackageManifest = (cliVersion: string, semverVersion: string): string =>
  `${JSON.stringify({
    type: 'module',
    devDependencies: { '@moldea.ai/cli': cliVersion, semver: semverVersion },
  })}\n`;

const createToolingPackageLock = (cliVersion: string, semverVersion: string): string =>
  `${JSON.stringify({
    lockfileVersion: 3,
    packages: {
      '': {
        devDependencies: { '@moldea.ai/cli': cliVersion, semver: semverVersion },
      },
      'node_modules/@moldea.ai/cli': {
        version: cliVersion,
        dev: true,
        integrity: `sha512-cli-${cliVersion}`,
      },
      'node_modules/semver': {
        version: semverVersion,
        dev: true,
        integrity: `sha512-semver-${semverVersion}`,
      },
    },
  })}\n`;

const createCaseCatalog = (selectedDescription: string, otherDescription: string): string =>
  `version: 2
cases:
  - id: universal-case
    title: Universal case
    layer: universal-baseline
    description: Shared behavior.
    challenge: Exercise shared behavior.
  - id: selected-case
    title: Selected case
    layer: adapter-specific
    description: ${selectedDescription}
    challenge: Exercise selected behavior.
  - id: other-case
    title: Other case
    layer: adapter-specific
    description: ${otherDescription}
    challenge: Exercise unrelated behavior.
`;

describe('qualification input fingerprint', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('isolates one adapter while retaining selected and shared execution behavior', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-fingerprint-'));
    const roots: IQualificationExecutionDigestRoots = {
      evaluationHostRoot: path.join(temporaryRoot, 'tooling/codex-evaluation-host'),
      packageCandidateRoot: path.join(temporaryRoot, 'tooling/package-candidate'),
      qualificationRoot: path.join(temporaryRoot, 'qualification'),
      repositoryRoot: temporaryRoot,
    };
    const selectedProfileDirectory = path.join(
      roots.qualificationRoot,
      'profiles/selected/typescript',
    );
    const paths = {
      caseCatalog: path.join(roots.qualificationRoot, 'cases/cases.yaml'),
      evaluator: path.join(roots.qualificationRoot, 'src/executor.ts'),
      evaluatorDeclaration: path.join(roots.qualificationRoot, 'src/executor.d.ts'),
      evaluatorTest: path.join(roots.qualificationRoot, 'src/executor.test-unit.ts'),
      host: path.join(roots.evaluationHostRoot, 'host.mjs'),
      hostDeclaration: path.join(roots.evaluationHostRoot, 'index.d.mts'),
      hostTest: path.join(roots.evaluationHostRoot, 'host.test-unit.mjs'),
      packageCandidate: path.join(roots.packageCandidateRoot, 'index.mjs'),
      packageCandidateDeclaration: path.join(roots.packageCandidateRoot, 'index.d.mts'),
      packageLock: path.join(roots.qualificationRoot, 'package-lock.json'),
      packageManifest: path.join(roots.qualificationRoot, 'package.json'),
      profileDocumentation: path.join(selectedProfileDirectory, 'README.md'),
      profileManifest: path.join(selectedProfileDirectory, 'profile.yaml'),
      projectReadme: path.join(selectedProfileDirectory, 'projects/selected-case/README.md'),
      scenario: path.join(selectedProfileDirectory, 'projects/selected-case/scenario.yaml'),
      task: path.join(selectedProfileDirectory, 'projects/selected-case/task.md'),
      toolingPackageLock: path.join(roots.repositoryRoot, 'package-lock.json'),
      toolingPackageManifest: path.join(roots.repositoryRoot, 'package.json'),
      unrelatedProfile: path.join(
        roots.qualificationRoot,
        'profiles/other/typescript/profile.yaml',
      ),
    };
    await Promise.all(
      Object.values(paths).map((filePath) => ensureDirectory(path.dirname(filePath))),
    );
    await Promise.all([
      writeFile(paths.caseCatalog, createCaseCatalog('Selected behavior.', 'Other behavior.')),
      writeFile(paths.evaluator, 'export const evaluatorVersion = 1;\n'),
      writeFile(paths.evaluatorDeclaration, 'export declare const evaluatorVersion: number;\n'),
      writeFile(paths.evaluatorTest, 'export const evaluatorTestVersion = 1;\n'),
      writeFile(paths.host, 'export const hostVersion = 1;\n'),
      writeFile(paths.hostDeclaration, 'export declare const hostVersion: number;\n'),
      writeFile(paths.hostTest, 'export const hostTestVersion = 1;\n'),
      writeFile(paths.packageCandidate, 'export const candidateVersion = 1;\n'),
      writeFile(
        paths.packageCandidateDeclaration,
        'export declare const candidateVersion: number;\n',
      ),
      writeFile(paths.packageLock, createPackageLock('1.0.0', '2.9.0')),
      writeFile(paths.packageManifest, createPackageManifest('1.0.0', '2.9.0')),
      writeFile(paths.profileDocumentation, '# Selected profile documentation\n'),
      writeFile(paths.profileManifest, 'version: 2\nadapterId: selected\n'),
      writeFile(paths.projectReadme, '# Selected fixture\n'),
      writeFile(paths.scenario, 'version: 2\nid: selected-case\n'),
      writeFile(paths.task, '# Repair the selected adapter\n'),
      writeFile(paths.toolingPackageLock, createToolingPackageLock('5.0.0', '7.8.5')),
      writeFile(paths.toolingPackageManifest, createToolingPackageManifest('5.0.0', '7.8.5')),
      writeFile(paths.unrelatedProfile, 'version: 2\nadapterId: other\n'),
    ]);
    const options = {
      caseIds: ['universal-case', 'selected-case'],
      profileDirectory: selectedProfileDirectory,
      roots,
    };
    const initialDigest = await calculateQualificationExecutionDigest(options);

    await Promise.all([
      writeFile(paths.profileDocumentation, '# Expanded operator documentation\n'),
      writeFile(paths.evaluatorDeclaration, 'export declare const evaluatorVersion: string;\n'),
      writeFile(paths.evaluatorTest, 'export const evaluatorTestVersion = 2;\n'),
      writeFile(paths.hostDeclaration, 'export declare const hostVersion: string;\n'),
      writeFile(paths.hostTest, 'export const hostTestVersion = 2;\n'),
      writeFile(
        paths.packageCandidateDeclaration,
        'export declare const candidateVersion: string;\n',
      ),
      writeFile(paths.unrelatedProfile, 'version: 2\nadapterId: other\ntitle: Added profile\n'),
      writeFile(paths.caseCatalog, createCaseCatalog('Selected behavior.', 'Revised other case.')),
      writeFile(paths.packageLock, createPackageLock('2.0.0', '2.9.0')),
      writeFile(paths.packageManifest, createPackageManifest('2.0.0', '2.9.0')),
      writeFile(paths.toolingPackageLock, createToolingPackageLock('6.0.0', '7.8.5')),
      writeFile(paths.toolingPackageManifest, createToolingPackageManifest('6.0.0', '7.8.5')),
    ]);
    expect(await calculateQualificationExecutionDigest(options)).toBe(initialDigest);

    await Promise.all([
      writeFile(paths.toolingPackageLock, createToolingPackageLock('6.0.0', '7.9.0')),
      writeFile(paths.toolingPackageManifest, createToolingPackageManifest('6.0.0', '7.9.0')),
    ]);
    const changedToolingDependencyDigest = await calculateQualificationExecutionDigest(options);
    expect(changedToolingDependencyDigest).not.toBe(initialDigest);

    await writeFile(paths.projectReadme, '# Changed selected fixture\n');
    const changedProfileDigest = await calculateQualificationExecutionDigest(options);
    expect(changedProfileDigest).not.toBe(changedToolingDependencyDigest);

    await writeFile(paths.evaluator, 'export const evaluatorVersion = 2;\n');
    const changedEvaluatorDigest = await calculateQualificationExecutionDigest(options);
    expect(changedEvaluatorDigest).not.toBe(changedProfileDigest);

    await writeFile(
      paths.caseCatalog,
      createCaseCatalog('Revised selected behavior.', 'Revised other case.'),
    );
    const changedCaseDigest = await calculateQualificationExecutionDigest(options);
    expect(changedCaseDigest).not.toBe(changedEvaluatorDigest);

    await Promise.all([
      writeFile(paths.packageLock, createPackageLock('2.0.0', '2.10.0')),
      writeFile(paths.packageManifest, createPackageManifest('2.0.0', '2.10.0')),
    ]);
    expect(await calculateQualificationExecutionDigest(options)).not.toBe(changedCaseDigest);
  });

  test('excludes profile operator documentation but retains project fixtures', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-profile-fingerprint-'));
    const profileDocumentation = path.join(temporaryRoot, 'README.md');
    const projectReadme = path.join(temporaryRoot, 'projects/case/README.md');
    await ensureDirectory(path.dirname(projectReadme));
    await Promise.all([
      writeFile(profileDocumentation, '# Operator documentation\n'),
      writeFile(projectReadme, '# Project fixture\n'),
      writeFile(path.join(temporaryRoot, 'profile.yaml'), 'version: 2\n'),
    ]);
    const initialDigest = await calculateQualificationProfileDigest(temporaryRoot);

    await writeFile(profileDocumentation, '# Revised operator documentation\n');
    expect(await calculateQualificationProfileDigest(temporaryRoot)).toBe(initialDigest);

    await writeFile(projectReadme, '# Revised project fixture\n');
    expect(await calculateQualificationProfileDigest(temporaryRoot)).not.toBe(initialDigest);
  });

  test('isolates one compatibility target and its selected package input', () => {
    const selectedTarget = {
      id: 'selected',
      kind: 'stream',
      language: 'typescript',
      lastVerifiedAt: '2026-08-29',
    };
    const adapter = {
      implementationStatus: 'available',
      implementation: {
        distribution: 'package',
        kind: 'adapter',
        package: '@moldea.ai/adapter-selected',
      },
      targets: [
        selectedTarget,
        {
          id: 'sibling',
          kind: 'generate',
          language: 'typescript',
          lastVerifiedAt: '2026-08-29',
        },
      ],
    };
    const initialTargetDigest = calculateQualificationTargetDigest(adapter, selectedTarget);
    const initialPackagesDigest = calculatePackagesQualificationDigest({
      adapter,
      matrixVersion: 2,
      target: selectedTarget,
    });
    const adapterWithChangedSibling = {
      ...adapter,
      targets: [
        selectedTarget,
        {
          ...adapter.targets[1]!,
          language: 'python',
        },
      ],
    };

    expect(calculateQualificationTargetDigest(adapterWithChangedSibling, selectedTarget)).toBe(
      initialTargetDigest,
    );
    expect(
      calculatePackagesQualificationDigest({
        adapter: adapterWithChangedSibling,
        matrixVersion: 2,
        target: selectedTarget,
      }),
    ).toBe(initialPackagesDigest);
    expect(
      calculateQualificationTargetDigest(adapter, {
        ...selectedTarget,
        lastVerifiedAt: '2026-08-30',
      }),
    ).toBe(initialTargetDigest);
    expect(
      calculateQualificationTargetDigest(adapter, {
        ...selectedTarget,
        language: 'python',
      }),
    ).not.toBe(initialTargetDigest);
    expect(
      calculatePackagesQualificationDigest({
        adapter,
        matrixVersion: 3,
        target: selectedTarget,
      }),
    ).not.toBe(initialPackagesDigest);
  });
});
