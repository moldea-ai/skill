// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { createPublicCandidatePackage } from '../candidate-closure/index.ts';
import {
  QualificationAttemptResultSchema,
  type ICandidateClosure,
  type IQualificationExecutionEnvironment,
} from '../contracts/index.ts';
import {
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import { recordQualificationResult } from '../result/index.ts';
import {
  createQualificationAttemptKey,
  QualificationAttemptStorageSchema,
} from '../storage/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../vitest/evidence-fixture.ts';
import { inspectQualificationBaseline } from './baseline.ts';
import { calculateQualificationBaselineDigestAtCommit } from './fingerprints.ts';

const executionEnvironment: IQualificationExecutionEnvironment = {
  model: 'gpt-5.6-sol',
  reasoningEffort: 'medium',
  codexVersion: 'codex-cli test',
  nodeVersion: process.version,
  pnpmVersion: '11.9.0',
  gitVersion: 'git version test',
  allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
  hostTimeoutMs: 120_000,
  modelEndpoint: null,
  sslCertificateFileSha256: null,
};

const candidate: ICandidateClosure = {
  fingerprint: 'a'.repeat(64),
  cliVersion: '4.0.0',
  cliJsonSchemaVersion: 2,
  packages: [
    {
      name: '@moldea.ai/cli',
      version: '4.0.0',
      registryIntegrity: `sha512-${'a'.repeat(86)}`,
      registryShasum: 'b'.repeat(40),
      registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-4.0.0.tgz',
      tarballPath: '/candidate/cli.tgz',
      tarballName: 'cli-4.0.0.tgz',
      sha256: 'c'.repeat(64),
    },
  ],
  runtimePackages: [
    {
      name: 'ai',
      version: '7.0.77',
      registryIntegrity: `sha512-${'d'.repeat(86)}`,
      registryShasum: 'e'.repeat(40),
      registryTarballUrl: 'https://registry.npmjs.org/ai/-/ai-7.0.77.tgz',
      tarballPath: '/candidate/ai.tgz',
      tarballName: 'ai-7.0.77.tgz',
      sha256: '6'.repeat(64),
    },
  ],
  typeScriptPackage: {
    name: 'typescript',
    version: '6.0.3',
    registryIntegrity: `sha512-${'f'.repeat(86)}`,
    registryShasum: 'a'.repeat(40),
    registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
    tarballPath: '/candidate/typescript.tgz',
    tarballName: 'typescript-6.0.3.tgz',
    sha256: 'f'.repeat(64),
  },
  runtimeDirectory: '/candidate',
};

const createRepositoryState = (commit: string, fingerprint: string): IGitRepositoryState => ({
  commit,
  fingerprint,
  isDirty: false,
  entries: [],
});

const packagesState = createRepositoryState('packages-commit', 'd'.repeat(64));
const skillState = createRepositoryState('skill-commit', 'e'.repeat(64));

/**
 * Creates the smallest committed qualification source tree required by baseline verification.
 * @param repositoryRoot The temporary repository root that owns the fixture source.
 * @returns A promise resolving to the exact fixture source commit.
 */
const createQualificationSourceCommit = async (repositoryRoot: string): Promise<string> => {
  const sourceFiles = [
    [
      'package.json',
      `${JSON.stringify({
        type: 'module',
        devDependencies: { '@moldea.ai/cli': '5.0.0', semver: '7.8.5' },
      })}\n`,
    ],
    [
      'package-lock.json',
      `${JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': {
            devDependencies: { '@moldea.ai/cli': '5.0.0', semver: '7.8.5' },
          },
          'node_modules/@moldea.ai/cli': {
            version: '5.0.0',
            dev: true,
            integrity: 'sha512-cli-runtime',
          },
          'node_modules/semver': {
            version: '7.8.5',
            dev: true,
            integrity: 'sha512-semver-runtime',
          },
        },
      })}\n`,
    ],
    [
      'qualification/cases/cases.yaml',
      [
        'version: 2',
        'cases:',
        '  - id: release-case',
        '    title: Release case',
        '    layer: universal-baseline',
        '    description: Verify complete passing evidence.',
        '    challenge: Exercise the reusable Custom baseline.',
        '',
      ].join('\n'),
    ],
    [
      'qualification/package.json',
      `${JSON.stringify({
        name: '@moldea.ai/adapter-qualification-fixture',
        version: '0.0.0',
        type: 'module',
        engines: { node: '^24.15.0' },
        scripts: { qualification: 'node src/bin/index.ts' },
        dependencies: { yaml: '2.9.0' },
      })}\n`,
    ],
    [
      'qualification/package-lock.json',
      `${JSON.stringify({
        name: '@moldea.ai/adapter-qualification-fixture',
        version: '0.0.0',
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': {
            name: '@moldea.ai/adapter-qualification-fixture',
            version: '0.0.0',
            dependencies: { yaml: '2.9.0' },
            engines: { node: '^24.15.0' },
          },
          'node_modules/yaml': {
            version: '2.9.0',
            integrity: 'sha512-yaml-runtime',
          },
        },
      })}\n`,
    ],
    ['qualification/src/execution/executor.ts', 'export const executorVersion = 1;\n'],
    ['tooling/codex-evaluation-host/host.mjs', 'export const hostVersion = 1;\n'],
    ['tooling/package-candidate/index.mjs', 'export const candidateVersion = 1;\n'],
  ] as const;

  await Promise.all(
    sourceFiles.map(async ([relativePath, source]) => {
      const filePath = path.join(repositoryRoot, relativePath);
      await ensureDirectory(path.dirname(filePath));
      await writeTextFileAtomically(filePath, source);
    }),
  );
  await executeProcess({
    command: 'git',
    args: ['init', '--initial-branch=main'],
    cwd: repositoryRoot,
  });
  await executeProcess({ command: 'git', args: ['add', '-A'], cwd: repositoryRoot });
  await executeProcess({
    command: 'git',
    args: [
      '-c',
      'commit.gpgsign=false',
      '-c',
      'user.name=moldea qualification',
      '-c',
      'user.email=qualification@moldea.local',
      'commit',
      '-m',
      'test: commit qualification baseline source',
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

describe('Custom qualification baseline', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('does not require a baseline for Custom and blocks adapters when it is missing', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-baseline-'));
    const commonOptions = {
      candidate,
      customTargetDigest: '2'.repeat(64),
      executionEnvironment,
      isDryRun: false,
      qualificationBaselineDigest: '1'.repeat(64),
      resultsRoot: path.join(temporaryRoot, 'results'),
      skillState,
    };

    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        selection: { adapterId: 'custom', implementationId: 'custom' },
      }),
    ).resolves.toMatchObject({ passed: true, status: 'not-required' });
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        selection: { adapterId: 'vercel-ai-sdk', implementationId: 'typescript-agent' },
      }),
    ).resolves.toMatchObject({ passed: false, status: 'missing' });
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        isDryRun: true,
        selection: { adapterId: 'vercel-ai-sdk', implementationId: 'typescript-agent' },
      }),
    ).resolves.toMatchObject({ passed: true, status: 'not-required' });
  });

  test('rejects a recorded baseline with an incompatible stored identity', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-baseline-'));
    const resultsRoot = path.join(temporaryRoot, 'qualification', 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const baselineFixture = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'custom-baseline-unreadable-source',
      packages: [...candidate.packages, candidate.typeScriptPackage].map(
        createPublicCandidatePackage,
      ),
      resultsRoot,
      skillRepositoryCommit: skillState.commit,
      skillRepositoryFingerprint: skillState.fingerprint,
    });
    const qualificationRepositoryCommit = await createQualificationSourceCommit(temporaryRoot);
    const passingBaseline = QualificationAttemptResultSchema.parse({
      ...baselineFixture,
      provenance: {
        ...baselineFixture.provenance,
        qualificationRepositoryCommit,
      },
    });
    await recordQualificationResult(
      {
        artifactDirectory,
        result: passingBaseline,
        sanitizationContext: {
          attemptDirectory: '/attempt',
          packagesRepository: '/packages',
          skillRepository: '/skill',
        },
      },
      resultsRoot,
    );

    await expect(
      inspectQualificationBaseline({
        candidate,
        customTargetDigest: 'e'.repeat(64),
        executionEnvironment,
        isDryRun: false,
        qualificationBaselineDigest: '1'.repeat(64),
        resultsRoot,
        selection: { adapterId: 'vercel-ai-sdk', implementationId: 'typescript-agent' },
        skillState,
      }),
    ).resolves.toMatchObject({
      passed: false,
      status: 'incompatible',
      failures: [
        'Custom baseline attempt custom-baseline-unreadable-source does not match the current universal suite, Custom target, portable skill, execution environment, and published candidate closure.',
      ],
    });
  });

  test('accepts only an integrity-verified baseline with identical universal inputs', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-baseline-'));
    const resultsRoot = path.join(temporaryRoot, 'qualification', 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const baselineFixture = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'custom-baseline',
      hasOperationalRetry: true,
      isRecovered: true,
      packages: [...candidate.packages, candidate.typeScriptPackage].map(
        createPublicCandidatePackage,
      ),
      packagesRepositoryCommit: packagesState.commit,
      packagesRepositoryFingerprint: packagesState.fingerprint,
      qualificationDigest: '1'.repeat(64),
      resultsRoot,
      skillRepositoryCommit: skillState.commit,
      skillRepositoryFingerprint: skillState.fingerprint,
    });
    const qualificationRepositoryCommit = await createQualificationSourceCommit(temporaryRoot);
    const qualificationBaselineDigest = await calculateQualificationBaselineDigestAtCommit(
      qualificationRepositoryCommit,
      temporaryRoot,
    );
    const passingBaseline = QualificationAttemptResultSchema.parse({
      ...baselineFixture,
      provenance: {
        ...baselineFixture.provenance,
        qualificationRepositoryCommit,
      },
    });
    await recordQualificationResult(
      {
        artifactDirectory,
        result: passingBaseline,
        sanitizationContext: {
          attemptDirectory: '/attempt',
          packagesRepository: '/packages',
          skillRepository: '/skill',
        },
      },
      resultsRoot,
    );
    const commonOptions = {
      candidate,
      customTargetDigest: 'e'.repeat(64),
      executionEnvironment,
      isDryRun: false,
      qualificationBaselineDigest,
      resultsRoot,
      selection: { adapterId: 'vercel-ai-sdk', implementationId: 'typescript-agent' },
      skillState,
    };

    await expect(inspectQualificationBaseline(commonOptions)).resolves.toMatchObject({
      passed: true,
      status: 'passed',
      baselineAttemptId: 'custom-baseline',
    });
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        skillState: { ...skillState, commit: 'evidence-only-commit' },
      }),
    ).resolves.toMatchObject({
      passed: true,
      status: 'passed',
      baselineAttemptId: 'custom-baseline',
    });
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        customTargetDigest: '9'.repeat(64),
      }),
    ).resolves.toMatchObject({ passed: false, status: 'incompatible' });
    await expect(
      inspectQualificationBaseline({
        ...commonOptions,
        candidate: {
          ...candidate,
          packages: [{ ...candidate.packages[0]!, sha256: '9'.repeat(64) }],
        },
      }),
    ).resolves.toMatchObject({ passed: false, status: 'incompatible' });

    const storagePath = path.join(
      resultsRoot,
      't1',
      'attempts',
      createQualificationAttemptKey(passingBaseline.attemptId),
      'storage.json',
    );
    const storage = await readJsonFile(storagePath, QualificationAttemptStorageSchema);
    await writeJsonFileAtomically(storagePath, {
      ...storage,
      compatibility: {
        ...storage.compatibility,
        qualificationBaselineEvaluatorDigest: '9'.repeat(64),
      },
    });

    await expect(inspectQualificationBaseline(commonOptions)).resolves.toMatchObject({
      passed: false,
      status: 'incompatible',
    });
  });
});
