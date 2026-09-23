// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';

import {
  createAttemptCheckpoint,
  readAttemptCheckpoint,
  writeAttemptCheckpoint,
} from '../checkpoint/index.ts';
import { QualificationAttemptResultDraftSchema } from '../contracts/index.ts';
import {
  captureAttemptCompatibilitySnapshot,
  readRuntimeCompatibilitySnapshot,
  RUNTIME_COMPATIBILITY_SNAPSHOT_PATH,
  validateRuntimeCompatibilitySnapshot,
} from '../compatibility/index.ts';
import {
  QUALIFICATION_CONFIRMATION_POLICY,
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
} from '../constants/index.ts';
import { ensureDirectory, writeJsonFileAtomically } from '../../../src/filesystem/index.ts';
import { verifyQualificationResults } from '../result/index.ts';
import {
  createQualificationAttemptKey,
  readQualificationAttemptStorage,
  resolveQualificationArtifactPath,
} from '../storage/index.ts';
import {
  getLocalAttemptDirectory,
  inspectLocalAttemptCheckpoints,
  listLocalAttemptCheckpoints,
  recordIncompleteAttempt,
} from './attempts.ts';
import { cleanupQualificationAttemptRuntime } from './attempt-runtime.ts';

const runSeparateRecorder = async (
  attemptId: string,
  resultsRoot: string,
  preloadPath: string,
): Promise<void> => {
  const moduleUrl = pathToFileURL(path.join(import.meta.dirname, 'attempts.ts')).href;
  const source = `import { recordIncompleteAttempt } from ${JSON.stringify(moduleUrl)};\nawait recordIncompleteAttempt(process.argv[1], process.argv[2]);`;
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '--import',
        pathToFileURL(preloadPath).href,
        '--input-type=module',
        '-e',
        source,
        attemptId,
        resultsRoot,
      ],
      {
        env: {
          ...process.env,
          MOLDEA_DENIED_SNAPSHOT_PATH: RUNTIME_COMPATIBILITY_SNAPSHOT_PATH,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Separate qualification recording failed (${code}): ${stderr}`));
    });
  });
};

/** Creates one local incomplete attempt whose public artifact can optionally fail publication. */
const createIncompleteAttemptFixture = async (options: {
  attemptDirectory: string;
  attemptId: string;
  hasMalformedArtifact?: boolean;
  mode?: 'diagnostic' | 'official';
}): Promise<void> => {
  const mode = options.mode ?? 'official';
  const compatibilitySnapshot = await readRuntimeCompatibilitySnapshot();
  await captureAttemptCompatibilitySnapshot(options.attemptDirectory, compatibilitySnapshot);
  const checkpoint = await createAttemptCheckpoint({
    attemptDirectory: options.attemptDirectory,
    attemptId: options.attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    isDryRun: false,
    mode,
    selectedCaseId: mode === 'diagnostic' ? 'evaluate-aligned-project' : null,
    reuseEvidence: true,
    skillRepository: '/skill',
    profileDigest: 'a'.repeat(64),
    qualificationDigest: 'b'.repeat(64),
    skillDigest: 'c'.repeat(64),
    compatibilitySnapshot: {
      sourceUrl: compatibilitySnapshot.sourceUrl,
      sha256: compatibilitySnapshot.sha256,
    },
    compatibilityDigest: 'e'.repeat(64),
    targetDigest: 'f'.repeat(64),
    executionEnvironment: {
      model: 'gpt-6-sol',
      actorReasoningEffort: 'xhigh',
      judgeReasoningEffort: 'xhigh',
      codexVersion: 'codex-cli test',
      nodeVersion: process.version,
      pnpmVersion: '11.27.1',
      gitVersion: 'git version test',
      allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
      hostTimeoutMs: 120_000,
      modelEndpoint: null,
      sslCertificateFileSha256: null,
    },
    stageIds: [],
  });
  await writeAttemptCheckpoint(options.attemptDirectory, { ...checkpoint, status: 'incomplete' });
  const publicDirectory = path.join(options.attemptDirectory, 'public');
  await ensureDirectory(publicDirectory);
  await writeFile(
    path.join(publicDirectory, 'interruption.json'),
    options.hasMalformedArtifact === true
      ? '{'
      : '{"stageId":null,"message":"Execution interrupted."}\n',
    'utf8',
  );
  const result = QualificationAttemptResultDraftSchema.parse({
    protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
    confirmationPolicy: QUALIFICATION_CONFIRMATION_POLICY,
    mode,
    attemptId: options.attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    status: 'incomplete',
    createdAt: checkpoint.createdAt,
    completedAt: null,
    evidenceGeneratedAt: null,
    summary: 'The attempt was interrupted.',
    provenance: {
      ...checkpoint.executionEnvironment,
      candidateFingerprint: null,
      compatibilitySnapshot: checkpoint.compatibilitySnapshot,
      qualificationRepositoryCommit: 'd'.repeat(40),
      qualificationRepositoryDirty: false,
      skillRepositoryCommit: 'skill-commit',
      skillRepositoryFingerprint: 'c'.repeat(64),
      skillRepositoryDirty: false,
      profileDigest: 'a'.repeat(64),
      qualificationDigest: 'b'.repeat(64),
      targetDigest: 'f'.repeat(64),
      baselineAttemptId: null,
      packages: [],
    },
    stages: [],
    cases: [],
    artifactDigests: {},
  });
  await writeJsonFileAtomically(path.join(options.attemptDirectory, 'result-draft.json'), result);
};

describe('qualification incomplete attempt recording', () => {
  let attemptDirectory: string | null = null;
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (attemptDirectory !== null) {
      await rm(attemptDirectory, { force: true, recursive: true });
    }
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('records immutable incomplete evidence and marks the local attempt as recorded', async () => {
    const attemptId = `test-incomplete-${randomUUID()}`;
    attemptDirectory = getLocalAttemptDirectory(attemptId);
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-incomplete-result-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    await createIncompleteAttemptFixture({
      attemptDirectory,
      attemptId,
    });
    await ensureDirectory(path.join(attemptDirectory, 'internal'));
    await ensureDirectory(path.join(attemptDirectory, 'workspaces'));

    const recordedResult = await recordIncompleteAttempt(attemptId, resultsRoot);

    expect(recordedResult.status).toBe('incomplete');
    expect((await readAttemptCheckpoint(attemptDirectory)).recordedAt).not.toBeNull();
    await expect(access(path.join(attemptDirectory, 'internal'))).rejects.toThrow();
    await expect(access(path.join(attemptDirectory, 'workspaces'))).rejects.toThrow();
    expect(await verifyQualificationResults(resultsRoot)).toStrictEqual({
      passed: true,
      attempts: 1,
      issues: [],
    });
  });

  test('records from a separate process after interruption without reading the current catalog', async () => {
    const attemptId = `test-incomplete-${randomUUID()}`;
    attemptDirectory = getLocalAttemptDirectory(attemptId);
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-incomplete-recovery-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const preloadPath = path.join(temporaryRoot, 'deny-current-snapshot.mjs');
    await createIncompleteAttemptFixture({ attemptDirectory, attemptId });
    const capturedSource = await readFile(
      path.join(attemptDirectory, 'compatibility-snapshot.json'),
      'utf8',
    );
    const capturedInput: unknown = JSON.parse(capturedSource);
    const capturedSnapshot = validateRuntimeCompatibilitySnapshot(capturedInput);
    await cleanupQualificationAttemptRuntime(attemptDirectory, true);
    await writeFile(
      preloadPath,
      `import fs from 'node:fs';\nimport path from 'node:path';\nimport { syncBuiltinESMExports } from 'node:module';\nconst lstat = fs.promises.lstat;\nfs.promises.lstat = (candidate, ...args) => {\n  if (typeof candidate === 'string' && path.resolve(candidate) === process.env.MOLDEA_DENIED_SNAPSHOT_PATH) {\n    throw new Error('Current compatibility catalog must not be read during recording.');\n  }\n  return lstat(candidate, ...args);\n};\nsyncBuiltinESMExports();\n`,
      'utf8',
    );

    await runSeparateRecorder(attemptId, resultsRoot, preloadPath);

    expect((await readAttemptCheckpoint(attemptDirectory)).recordedAt).not.toBeNull();
    const recordedDirectory = path.join(
      resultsRoot,
      't5',
      'attempts',
      createQualificationAttemptKey(attemptId),
    );
    const storage = await readQualificationAttemptStorage(recordedDirectory);
    const recordedContractPath = resolveQualificationArtifactPath(
      recordedDirectory,
      storage,
      'recorded-contract.json',
    );
    expect(await readFile(recordedContractPath, 'utf8')).toContain(capturedSnapshot.sha256);
    await rm(attemptDirectory, { force: true, recursive: true });
    attemptDirectory = null;
    expect(await verifyQualificationResults(resultsRoot)).toStrictEqual({
      passed: true,
      attempts: 1,
      issues: [],
    });
  });

  test('retains an incomplete attempt for retry when public artifact validation fails', async () => {
    const attemptId = `test-incomplete-${randomUUID()}`;
    attemptDirectory = getLocalAttemptDirectory(attemptId);
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-incomplete-result-'));
    await createIncompleteAttemptFixture({
      attemptDirectory,
      attemptId,
      hasMalformedArtifact: true,
    });
    await ensureDirectory(path.join(attemptDirectory, 'internal'));
    await ensureDirectory(path.join(attemptDirectory, 'runtime'));

    await expect(
      recordIncompleteAttempt(attemptId, path.join(temporaryRoot, 'results')),
    ).rejects.toThrow();
    expect((await readAttemptCheckpoint(attemptDirectory)).recordedAt).toBeNull();
    await expect(
      access(path.join(attemptDirectory, 'compatibility-snapshot.json')),
    ).resolves.toBeUndefined();
    await expect(access(path.join(attemptDirectory, 'internal'))).rejects.toThrow();
    await expect(access(path.join(attemptDirectory, 'runtime'))).rejects.toThrow();
  });

  test('rejects diagnostic attempts before public recording', async () => {
    const attemptId = `test-diagnostic-${randomUUID()}`;
    attemptDirectory = getLocalAttemptDirectory(attemptId);
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-diagnostic-result-'));
    await createIncompleteAttemptFixture({
      attemptDirectory,
      attemptId,
      mode: 'diagnostic',
    });

    await expect(
      recordIncompleteAttempt(attemptId, path.join(temporaryRoot, 'results')),
    ).rejects.toThrow('diagnostic attempts cannot be recorded as public evidence.');
    expect((await readAttemptCheckpoint(attemptDirectory)).recordedAt).toBeNull();
  });
});

describe('qualification attempt discovery', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('rejects path segments that resolve outside the attempts root', () => {
    expect(() => getLocalAttemptDirectory('.')).toThrow('Invalid qualification attempt id');
    expect(() => getLocalAttemptDirectory('..')).toThrow('Invalid qualification attempt id');
    expect(() => getLocalAttemptDirectory('../other')).toThrow('Invalid qualification attempt id');
  });

  test('reports unavailable checkpoints without hiding valid attempts', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-attempt-discovery-'));
    const attemptsRoot = path.join(temporaryRoot, 'attempts');
    const validAttemptId = '20260820T000001000Z-custom-custom-valid';
    const validAttemptDirectory = path.join(attemptsRoot, validAttemptId);
    const validCheckpoint = await createAttemptCheckpoint({
      attemptDirectory: validAttemptDirectory,
      attemptId: validAttemptId,
      parentAttemptId: null,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      isDryRun: true,
      mode: 'dry-run',
      selectedCaseId: null,
      reuseEvidence: false,
      skillRepository: '/skill',
      profileDigest: 'a'.repeat(64),
      qualificationDigest: 'b'.repeat(64),
      skillDigest: 'c'.repeat(64),
      compatibilitySnapshot: {
        sourceUrl: 'https://packages.moldea.ai/compatibility/runtimes.json',
        sha256: 'd'.repeat(64),
      },
      compatibilityDigest: 'e'.repeat(64),
      targetDigest: 'f'.repeat(64),
      executionEnvironment: {
        model: 'gpt-6-sol',
        actorReasoningEffort: 'xhigh',
        judgeReasoningEffort: 'xhigh',
        codexVersion: 'codex-cli test',
        nodeVersion: process.version,
        pnpmVersion: '11.27.1',
        gitVersion: 'git version test',
        allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
        hostTimeoutMs: 120_000,
        modelEndpoint: null,
        sslCertificateFileSha256: null,
      },
      stageIds: [],
    });
    const unsupportedAttemptId = '20260820T000002000Z-custom-custom-unsupported';
    await writeJsonFileAtomically(
      path.join(attemptsRoot, unsupportedAttemptId, 'checkpoint.json'),
      {
        ...validCheckpoint,
        attemptId: unsupportedAttemptId,
        protocolVersion: 7,
      },
    );
    const unreadableAttemptId = '20260820T000003000Z-custom-custom-unreadable';
    await ensureDirectory(path.join(attemptsRoot, unreadableAttemptId));
    await writeFile(path.join(attemptsRoot, unreadableAttemptId, 'checkpoint.json'), '{', 'utf8');
    const invalidAttemptId = '20260820T000004000Z-custom-custom-invalid';
    await writeJsonFileAtomically(path.join(attemptsRoot, invalidAttemptId, 'checkpoint.json'), {
      protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
    });
    const mismatchedAttemptId = '20260820T000005000Z-custom-custom-mismatched';
    await writeJsonFileAtomically(
      path.join(attemptsRoot, mismatchedAttemptId, 'checkpoint.json'),
      validCheckpoint,
    );

    const inspection = await inspectLocalAttemptCheckpoints(attemptsRoot);

    expect(inspection.attempts.map(({ attemptId }) => attemptId)).toStrictEqual([validAttemptId]);
    expect(inspection.unavailableAttempts).toHaveLength(4);
    expect(inspection.unavailableAttempts[0]).toStrictEqual({
      attemptId: mismatchedAttemptId,
      kind: 'invalid-checkpoint',
      message: `Checkpoint attempt id ${validAttemptId} does not match its directory and was left unchanged.`,
      protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
    });
    expect(inspection.unavailableAttempts[1]?.attemptId).toBe(invalidAttemptId);
    expect(inspection.unavailableAttempts[1]?.kind).toBe('invalid-checkpoint');
    expect(inspection.unavailableAttempts[1]?.message).toContain(
      'Checkpoint is invalid and was left unchanged.',
    );
    expect(inspection.unavailableAttempts[1]?.protocolVersion).toBe(
      QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
    );
    expect(inspection.unavailableAttempts.slice(2)).toStrictEqual([
      {
        attemptId: unreadableAttemptId,
        kind: 'unreadable-checkpoint',
        message: 'Checkpoint could not be read as JSON and was left unchanged.',
        protocolVersion: null,
      },
      {
        attemptId: unsupportedAttemptId,
        kind: 'unsupported-protocol',
        message: `Checkpoint protocol version 7 is not supported by protocol version ${QUALIFICATION_EVIDENCE_PROTOCOL_VERSION} and was left unchanged.`,
        protocolVersion: 7,
      },
    ]);
    expect(
      (await listLocalAttemptCheckpoints(attemptsRoot)).map(({ attemptId }) => attemptId),
    ).toStrictEqual([validAttemptId]);
  });
});
