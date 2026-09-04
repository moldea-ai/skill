// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import type { ICandidateClosure, IQualificationExecutionEnvironment } from '../contracts/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import { inspectQualificationBaseline } from './baseline.ts';

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

const candidatePackage = {
  name: '@moldea.ai/cli',
  version: '6.0.0',
  registryIntegrity: `sha512-${'a'.repeat(86)}`,
  registryShasum: 'b'.repeat(40),
  registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-6.0.0.tgz',
  tarballPath: '/candidate/cli.tgz',
  tarballName: 'cli-6.0.0.tgz',
  sha256: 'c'.repeat(64),
};
const candidate: ICandidateClosure = {
  fingerprint: 'a'.repeat(64),
  cliVersion: '6.0.0',
  cliJsonSchemaVersion: 3,
  packages: [candidatePackage],
  runtimePackages: [],
  typeScriptPackage: {
    ...candidatePackage,
    name: 'typescript',
    version: '6.0.3',
    registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
    tarballName: 'typescript-6.0.3.tgz',
  },
  runtimeDirectory: '/candidate',
};
const skillState: IGitRepositoryState = {
  commit: 'skill-commit',
  fingerprint: 'e'.repeat(64),
  isDirty: false,
  entries: [],
};

describe('Custom qualification baseline', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) await rm(temporaryRoot, { force: true, recursive: true });
  });

  test('requires no baseline for Custom or dry runs and blocks adapters without current evidence', async () => {
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
});
