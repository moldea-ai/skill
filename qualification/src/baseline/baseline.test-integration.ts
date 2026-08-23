// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { createPublicCandidatePackage } from '../candidate-closure/index.ts';
import {
  type ICandidateClosure,
  type IQualificationExecutionEnvironment,
} from '../contracts/index.ts';
import { ensureDirectory } from '../filesystem/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import { recordQualificationResult } from '../result/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../vitest/evidence-fixture.ts';
import { inspectQualificationBaseline } from './baseline.ts';

const executionEnvironment: IQualificationExecutionEnvironment = {
  model: 'gpt-5.6-terra',
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
      executionEnvironment,
      isDryRun: false,
      packagesState,
      qualificationDigest: '1'.repeat(64),
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

  test('accepts only an integrity-verified baseline with identical universal inputs', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-baseline-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const passingBaseline = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'custom-baseline',
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
      executionEnvironment,
      isDryRun: false,
      packagesState,
      qualificationDigest: '1'.repeat(64),
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
        candidate: {
          ...candidate,
          packages: [{ ...candidate.packages[0]!, sha256: '9'.repeat(64) }],
        },
      }),
    ).resolves.toMatchObject({ passed: false, status: 'incompatible' });
  });
});
