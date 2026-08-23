// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  QualificationAttemptCheckpointSchema,
  QualificationAttemptResultDraftSchema,
  QualificationAttemptResultSchema,
} from '../contracts/index.ts';
import type { IQualificationExecutionProvenance } from './types.ts';
import { createQualificationAttemptResult } from './transformers.ts';

const createCandidatePackage = (name: string, version: string, marker: string) => ({
  name,
  version,
  registryIntegrity: `sha512-${marker.repeat(86)}`,
  registryShasum: marker.repeat(40),
  registryTarballUrl: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
  tarballPath: `/candidate/${name}.tgz`,
  tarballName: `${name}-${version}.tgz`,
  sha256: marker.repeat(64),
});

describe('qualification result transformation', () => {
  test('permits a dirty passing dry-run draft without making it publishable', () => {
    const checkpoint = QualificationAttemptCheckpointSchema.parse({
      protocolVersion: 3,
      attemptId: 'dry-run-attempt',
      parentAttemptId: null,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      status: 'running',
      isDryRun: true,
      useCache: false,
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-08-20T10:00:00.000Z',
      completedAt: null,
      skillRepository: '/skill',
      profileDigest: 'a'.repeat(64),
      qualificationDigest: 'b'.repeat(64),
      skillDigest: 'c'.repeat(64),
      packagesRepositoryFingerprint: 'e'.repeat(64),
      packagesDigest: 'd'.repeat(64),
      targetDigest: 'f'.repeat(64),
      candidate: {
        fingerprint: '0'.repeat(64),
        cliVersion: '4.0.1',
        cliJsonSchemaVersion: 2,
        packages: [createCandidatePackage('@moldea.ai/cli', '4.0.1', '1')],
        runtimePackages: [createCandidatePackage('ai', '7.0.77', '2')],
        typeScriptPackage: {
          ...createCandidatePackage('typescript', '6.0.3', '3'),
          name: 'typescript',
        },
        runtimeDirectory: '/candidate/runtime',
      },
      stages: {
        'source-state': {
          id: 'source-state',
          status: 'passed',
          startedAt: '2026-08-20T10:00:00.000Z',
          completedAt: '2026-08-20T10:00:01.000Z',
          durationMs: 1_000,
          cacheKey: null,
          cacheSourceAttemptId: null,
          error: null,
        },
      },
      workspaceDirectories: {},
    });
    const provenance: IQualificationExecutionProvenance = {
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
      packagesRepositoryCommit: 'packages-commit',
      packagesRepositoryFingerprint: 'd'.repeat(64),
      packagesRepositoryDirty: true,
      qualificationRepositoryCommit: 'qualification-commit',
      qualificationRepositoryDirty: true,
      skillRepositoryCommit: 'skill-commit',
      skillRepositoryFingerprint: 'c'.repeat(64),
      skillRepositoryDirty: true,
      profileDigest: 'a'.repeat(64),
      qualificationDigest: 'b'.repeat(64),
      targetDigest: 'f'.repeat(64),
      baselineAttemptId: null,
    };
    const result = createQualificationAttemptResult({
      caseResults: [],
      checkpoint,
      completedAt: '2026-08-20T10:00:01.000Z',
      provenance,
      status: 'passed',
      summary: 'The model-free dry run passed.',
      stageIds: ['source-state'],
    });

    expect(result).toMatchObject({
      status: 'passed',
      provenance: {
        packagesRepositoryDirty: true,
        qualificationRepositoryDirty: true,
        skillRepositoryDirty: true,
      },
    });
    expect(result.provenance.packages.map(({ name }) => name)).toStrictEqual([
      '@moldea.ai/cli',
      'ai',
      'typescript',
    ]);
    expect(QualificationAttemptResultDraftSchema.safeParse(result).success).toBe(true);
    expect(QualificationAttemptResultSchema.safeParse(result).success).toBe(false);
  });
});
