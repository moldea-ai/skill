// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { seedPassingQualificationEvidenceFixture } from '../../vitest/evidence-fixture.ts';

import { createAttemptCheckpoint } from '../checkpoint/index.ts';
import {
  QualificationAttemptResultSchema,
  QualificationCaseResultSchema,
  QualificationModelStageEvidenceSchema,
  type ICandidateClosure,
} from '../contracts/index.ts';
import { createQualificationStageIds } from '../execution/index.ts';
import { ensureDirectory, readJsonFile } from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import { recordQualificationResult } from '../result/index.ts';
import {
  createQualificationAttemptKey,
  readQualificationAttemptStorage,
} from '../storage/index.ts';
import {
  loadReusableQualificationCases,
  materializeReusableQualificationCase,
} from './evidence-reuse.ts';

const CASE_ID = 'release-case';
const SOURCE_COMMIT = 'd'.repeat(40);
const candidatePackage = {
  name: 'typescript' as const,
  version: '6.0.3',
  registryIntegrity: `sha512-${'a'.repeat(86)}`,
  registryShasum: 'b'.repeat(40),
  registryTarballUrl: 'https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz',
  tarballPath: '/candidate/typescript.tgz',
  tarballName: 'typescript-6.0.3.tgz',
  sha256: 'c'.repeat(64),
};
const candidate: ICandidateClosure = {
  fingerprint: 'f'.repeat(64),
  cliVersion: '7.0.0',
  cliJsonSchemaVersion: 4,
  packages: [],
  runtimePackages: [],
  typeScriptPackage: candidatePackage,
  runtimeDirectory: '/candidate',
};
const publicCandidatePackage = {
  name: candidatePackage.name,
  version: candidatePackage.version,
  registryIntegrity: candidatePackage.registryIntegrity,
  registryShasum: candidatePackage.registryShasum,
  registryTarballUrl: candidatePackage.registryTarballUrl,
  tarballName: candidatePackage.tarballName,
  sha256: candidatePackage.sha256,
};

describe('qualification case evidence reuse', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('materializes one complete case and preserves skipped confirmation stages', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-reuse-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const sourceArtifactDirectory = path.join(temporaryRoot, 'source-artifacts');
    await ensureDirectory(sourceArtifactDirectory);
    const sourceDraft = await seedPassingQualificationEvidenceFixture({
      artifactDirectory: sourceArtifactDirectory,
      attemptId: 'source-attempt',
      qualificationRepositoryCommit: SOURCE_COMMIT,
      resultsRoot,
    });
    const sourceResult = await recordQualificationResult(
      {
        artifactDirectory: sourceArtifactDirectory,
        result: sourceDraft,
        sanitizationContext: {
          attemptDirectory: '/source-attempt',
          packagesRepository: '/packages',
          skillRepository: '/skill',
        },
      },
      resultsRoot,
    );
    const sourceAttemptDirectory = path.join(
      resultsRoot,
      't1',
      'attempts',
      createQualificationAttemptKey(sourceResult.attemptId),
    );
    const sourceStorage = await readQualificationAttemptStorage(sourceAttemptDirectory);
    const destinationAttemptDirectory = path.join(temporaryRoot, 'destination-attempt');
    const publicDirectory = path.join(destinationAttemptDirectory, 'public');
    await ensureDirectory(publicDirectory);
    const checkpoint = await createAttemptCheckpoint({
      attemptDirectory: destinationAttemptDirectory,
      attemptId: 'destination-attempt',
      parentAttemptId: null,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      isDryRun: false,
      mode: 'official',
      selectedCaseId: null,
      reuseEvidence: true,
      packagesRepository: '/packages',
      skillRepository: '/skill',
      profileDigest: sourceResult.provenance.profileDigest,
      qualificationDigest: sourceResult.provenance.qualificationDigest,
      skillDigest: sourceResult.provenance.skillRepositoryFingerprint,
      packagesRepositoryFingerprint: sourceResult.provenance.packagesRepositoryFingerprint,
      packagesDigest: 'e'.repeat(64),
      targetDigest: sourceResult.provenance.targetDigest,
      executionEnvironment: {
        model: 'gpt-5.6-sol',
        reasoningEffort: 'high',
        codexVersion: 'codex-cli test',
        nodeVersion: process.version,
        pnpmVersion: '11.9.0',
        gitVersion: 'git version test',
        allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
        hostTimeoutMs: 120_000,
        modelEndpoint: null,
        sslCertificateFileSha256: null,
      },
      stageIds: createQualificationStageIds([CASE_ID]),
    });
    const sourceCase = sourceResult.cases[0];

    if (sourceCase === undefined) {
      throw new Error('Qualification fixture did not produce its source case.');
    }

    const materialized = await materializeReusableQualificationCase({
      attemptDirectory: destinationAttemptDirectory,
      checkpoint,
      publicDirectory,
      reusableCase: {
        attemptDirectory: sourceAttemptDirectory,
        caseResult: sourceCase,
        result: sourceResult,
        sourceCommit: SOURCE_COMMIT,
        storage: sourceStorage,
      },
    });

    expect(materialized.caseResult.reuse).toStrictEqual({
      sourceAttemptId: sourceResult.attemptId,
      sourceCommit: SOURCE_COMMIT,
      sourceAttemptDigest: sourceStorage.attemptDigest,
    });
    expect(
      createQualificationStageIds([CASE_ID])
        .filter((stageId) => stageId.includes(':confirmation-'))
        .every((stageId) => materialized.checkpoint.stages[stageId]?.status === 'skipped'),
    ).toBe(true);
    expect(materialized.checkpoint.stages[`case:${CASE_ID}:trial:initial:actor`]).toMatchObject({
      status: 'reused',
      reuseSourceAttemptId: sourceResult.attemptId,
      operationalRetries: [],
      operationalStops: [],
    });
    expect(materialized.checkpoint.stages[`case:${CASE_ID}:trial:initial:judge`]).toMatchObject({
      status: 'reused',
      reuseSourceAttemptId: sourceResult.attemptId,
      operationalRetries: [],
      operationalStops: [],
    });
    expect(
      await readJsonFile(
        path.join(publicDirectory, 'cases', CASE_ID, 'case-result.json'),
        QualificationCaseResultSchema,
      ),
    ).toStrictEqual(materialized.caseResult);
    expect(
      await readJsonFile(
        path.join(publicDirectory, 'cases', CASE_ID, 'trials', 'initial', 'actor-evidence.json'),
        QualificationModelStageEvidenceSchema,
      ),
    ).toMatchObject({
      sourceAttemptId: sourceResult.attemptId,
      reuseSourceAttemptId: sourceResult.attemptId,
    });
  });

  test('loads an exact passing group from committed failed evidence and rejects tampering', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-reuse-'));
    const repositoryRoot = path.join(temporaryRoot, 'repository');
    await executeProcess({
      command: 'git',
      args: ['clone', '--shared', path.resolve('..'), repositoryRoot],
      cwd: temporaryRoot,
    });
    const resultsRoot = path.join(repositoryRoot, 'qualification', 'results');
    await Promise.all([
      rm(path.join(repositoryRoot, 'qualification', 'cases'), { force: true, recursive: true }),
      rm(path.join(repositoryRoot, 'qualification', 'profiles'), { force: true, recursive: true }),
      rm(resultsRoot, { force: true, recursive: true }),
    ]);
    const sourceArtifactDirectory = path.join(temporaryRoot, 'source-artifacts');
    const sourceDraft = await seedPassingQualificationEvidenceFixture({
      artifactDirectory: sourceArtifactDirectory,
      attemptId: 'failed-source-attempt',
      candidateFingerprint: candidate.fingerprint,
      hasFailedCompanionCase: true,
      packages: [publicCandidatePackage],
      resultsRoot,
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
        'test: establish qualification contracts',
      ],
      cwd: repositoryRoot,
    });
    const contractCommit = (
      await executeProcess({
        command: 'git',
        args: ['rev-parse', 'HEAD'],
        cwd: repositoryRoot,
      })
    ).stdout.trim();
    const sourceResult = await recordQualificationResult(
      {
        artifactDirectory: sourceArtifactDirectory,
        result: QualificationAttemptResultSchema.parse({
          ...sourceDraft,
          provenance: {
            ...sourceDraft.provenance,
            qualificationRepositoryCommit: contractCommit,
          },
        }),
        sanitizationContext: {
          attemptDirectory: '/source-attempt',
          packagesRepository: '/packages',
          skillRepository: '/skill',
        },
      },
      resultsRoot,
    );
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
        'test: record failed qualification evidence',
      ],
      cwd: repositoryRoot,
    });
    const evidenceCommit = (
      await executeProcess({
        command: 'git',
        args: ['rev-parse', 'HEAD'],
        cwd: repositoryRoot,
      })
    ).stdout.trim();
    const executionEnvironment = {
      model: sourceResult.provenance.model,
      reasoningEffort: sourceResult.provenance.reasoningEffort,
      codexVersion: sourceResult.provenance.codexVersion,
      nodeVersion: sourceResult.provenance.nodeVersion,
      pnpmVersion: sourceResult.provenance.pnpmVersion,
      gitVersion: sourceResult.provenance.gitVersion,
      allowedEgressHosts: sourceResult.provenance.allowedEgressHosts,
      hostTimeoutMs: sourceResult.provenance.hostTimeoutMs,
      modelEndpoint: sourceResult.provenance.modelEndpoint,
      sslCertificateFileSha256: sourceResult.provenance.sslCertificateFileSha256,
    };
    const checkpoint = await createAttemptCheckpoint({
      attemptDirectory: path.join(temporaryRoot, 'destination-attempt'),
      attemptId: 'destination-attempt',
      parentAttemptId: null,
      selection: sourceResult.selection,
      isDryRun: false,
      mode: 'official',
      selectedCaseId: null,
      reuseEvidence: true,
      packagesRepository: '/packages',
      skillRepository: '/skill',
      profileDigest: sourceResult.provenance.profileDigest,
      qualificationDigest: sourceResult.provenance.qualificationDigest,
      skillDigest: sourceResult.provenance.skillRepositoryFingerprint,
      packagesRepositoryFingerprint: sourceResult.provenance.packagesRepositoryFingerprint,
      packagesDigest: 'e'.repeat(64),
      targetDigest: sourceResult.provenance.targetDigest,
      executionEnvironment,
      stageIds: createQualificationStageIds(sourceResult.cases.map(({ caseId }) => caseId)),
    });
    const loadCases = () =>
      loadReusableQualificationCases({
        baselineAttemptId: null,
        candidate,
        caseIds: [CASE_ID],
        checkpoint,
        executionEnvironment,
        packagesRepositoryCommit: sourceResult.provenance.packagesRepositoryCommit,
        qualificationRepositoryCommit: evidenceCommit,
        repositoryRoot,
        resultsRoot,
      });
    const reusableCases = await loadCases();

    expect(reusableCases.get(CASE_ID)?.caseResult.status).toBe('passed');
    expect(reusableCases.get(CASE_ID)?.result.attemptId).toBe(sourceResult.attemptId);

    const sourceAttemptDirectory = path.join(
      resultsRoot,
      't1',
      'attempts',
      createQualificationAttemptKey(sourceResult.attemptId),
    );
    await writeFile(path.join(sourceAttemptDirectory, 'attempt.json'), '{}\n', 'utf8');

    await expect(loadCases()).resolves.toStrictEqual(new Map());
  });
});
