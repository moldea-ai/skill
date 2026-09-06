// @vitest-environment node
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { createAttemptCheckpoint, writeAttemptCheckpoint } from '../checkpoint/index.ts';
import { QUALIFICATION_EVIDENCE_PROTOCOL_VERSION } from '../constants/index.ts';
import { ensureDirectory } from '../filesystem/index.ts';
import { loadQualificationStatusPage } from './status.ts';

/** Creates one local checkpoint with the requested terminal or resumable status. */
const createCheckpoint = async (options: {
  attemptsRoot: string;
  attemptId: string;
  status: 'failed' | 'incomplete';
}): Promise<void> => {
  const attemptDirectory = path.join(options.attemptsRoot, options.attemptId);
  const checkpoint = await createAttemptCheckpoint({
    attemptDirectory,
    attemptId: options.attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    isDryRun: false,
    mode: 'official',
    selectedCaseId: null,
    useCache: false,
    packagesRepository: '/private/packages',
    skillRepository: '/private/skill',
    profileDigest: 'a'.repeat(64),
    qualificationDigest: 'b'.repeat(64),
    skillDigest: 'c'.repeat(64),
    packagesRepositoryFingerprint: 'd'.repeat(64),
    packagesDigest: 'e'.repeat(64),
    targetDigest: 'f'.repeat(64),
    executionEnvironment: {
      model: 'gpt-5.6-sol',
      reasoningEffort: 'medium',
      codexVersion: 'codex-cli test',
      nodeVersion: process.version,
      pnpmVersion: '11.9.0',
      gitVersion: 'git version test',
      allowedEgressHosts: ['api.openai.com'],
      hostTimeoutMs: 120_000,
      modelEndpoint: null,
      sslCertificateFileSha256: null,
    },
    stageIds: [],
  });

  await writeAttemptCheckpoint(attemptDirectory, {
    ...checkpoint,
    status: options.status,
  });
};

describe('loadQualificationStatusPage', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('loads only actionable metadata by default without disclosing checkpoint bodies', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-status-'));
    const attemptsRoot = path.join(temporaryRoot, 'attempts');
    await createCheckpoint({
      attemptsRoot,
      attemptId: '20260906T000000000Z-custom-custom-incomplete',
      status: 'incomplete',
    });
    await createCheckpoint({
      attemptsRoot,
      attemptId: '20260905T000000000Z-custom-custom-failed',
      status: 'failed',
    });

    const page = await loadQualificationStatusPage({
      attemptsRoot,
      resultsRoot: path.join(temporaryRoot, 'missing-results'),
      isAll: false,
    });
    const serializedPage = JSON.stringify(page);

    expect(page.records).toHaveLength(1);
    expect(page.records[0]).toMatchObject({
      kind: 'attempt',
      attemptId: '20260906T000000000Z-custom-custom-incomplete',
      status: 'incomplete',
    });
    expect(serializedPage).not.toContain('/private/packages');
    expect(serializedPage).not.toContain('/private/skill');
    expect(serializedPage).not.toContain('candidate');
    expect(serializedPage).not.toContain('stages');
    expect(serializedPage).not.toContain('workspaceDirectories');
  });

  test('includes terminal and unavailable summaries only when appropriate', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-status-'));
    const attemptsRoot = path.join(temporaryRoot, 'attempts');
    await createCheckpoint({
      attemptsRoot,
      attemptId: '20260906T000000000Z-custom-custom-failed',
      status: 'failed',
    });
    const unsupportedDirectory = path.join(
      attemptsRoot,
      '20260905T000000000Z-custom-custom-unsupported',
    );
    await createCheckpoint({
      attemptsRoot,
      attemptId: path.basename(unsupportedDirectory),
      status: 'failed',
    });
    const unsupportedPath = path.join(unsupportedDirectory, 'checkpoint.json');
    const unsupported = JSON.parse(await readFile(unsupportedPath, 'utf8')) as Record<
      string,
      unknown
    >;
    await writeFile(
      unsupportedPath,
      `${JSON.stringify({ ...unsupported, protocolVersion: 7 }, null, 2)}\n`,
      'utf8',
    );
    const missingSummaryAttemptId = '20260904T000000000Z-custom-custom-missing-summary';
    await ensureDirectory(path.join(attemptsRoot, missingSummaryAttemptId));

    const actionablePage = await loadQualificationStatusPage({
      attemptsRoot,
      resultsRoot: path.join(temporaryRoot, 'missing-results'),
      isAll: false,
    });
    const allPage = await loadQualificationStatusPage({
      attemptsRoot,
      resultsRoot: path.join(temporaryRoot, 'missing-results'),
      isAll: true,
    });

    expect(actionablePage.records).toStrictEqual([
      {
        kind: 'unavailable-attempt',
        attemptId: path.basename(unsupportedDirectory),
        reason: 'invalid-status-summary',
        protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
      },
      {
        kind: 'unavailable-attempt',
        attemptId: missingSummaryAttemptId,
        reason: 'missing-status-summary',
        protocolVersion: null,
      },
    ]);
    expect(allPage.records.map(({ kind }) => kind)).toStrictEqual([
      'attempt',
      'unavailable-attempt',
      'unavailable-attempt',
    ]);
  });

  test('refuses to read a status sidecar above its fixed byte ceiling', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-status-'));
    const attemptsRoot = path.join(temporaryRoot, 'attempts');
    const attemptId = '20260906T000000000Z-custom-custom-oversized-summary';
    await createCheckpoint({ attemptsRoot, attemptId, status: 'failed' });
    await writeFile(path.join(attemptsRoot, attemptId, 'status.json'), 'a'.repeat(8_193), 'utf8');

    const page = await loadQualificationStatusPage({
      attemptsRoot,
      resultsRoot: path.join(temporaryRoot, 'missing-results'),
      isAll: true,
    });

    expect(page.records).toStrictEqual([
      {
        kind: 'unavailable-attempt',
        attemptId,
        reason: 'oversized-status-summary',
        protocolVersion: null,
      },
    ]);
  });

  test('does not follow a status sidecar symlink', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-status-'));
    const attemptsRoot = path.join(temporaryRoot, 'attempts');
    const attemptId = '20260906T000000000Z-custom-custom-linked-summary';
    await createCheckpoint({ attemptsRoot, attemptId, status: 'failed' });
    const statusPath = path.join(attemptsRoot, attemptId, 'status.json');
    const externalPath = path.join(temporaryRoot, 'external-status.json');
    await writeFile(externalPath, '{}\n', 'utf8');
    await rm(statusPath);
    await symlink(externalPath, statusPath);

    const page = await loadQualificationStatusPage({
      attemptsRoot,
      resultsRoot: path.join(temporaryRoot, 'missing-results'),
      isAll: true,
    });

    expect(page.records).toStrictEqual([
      {
        kind: 'unavailable-attempt',
        attemptId,
        reason: 'invalid-status-summary',
        protocolVersion: null,
      },
    ]);
  });
});
