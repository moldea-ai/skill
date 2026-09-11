// @vitest-environment node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import { QualificationCaseResultSchema } from '../contracts/index.ts';
import {
  createQualificationAttemptKey,
  resolveQualificationResultTargetDirectory,
} from '../storage/index.ts';
import {
  loadQualificationReuseSourceManifest,
  readCommittedQualificationSource,
} from './source-evidence.ts';

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const RESULTS_ROOT = path.join(REPOSITORY_ROOT, 'qualification', 'results');

describe('qualification immutable source evidence', () => {
  test('loads only current reusable cases and verifies artifacts on demand', async () => {
    const manifest = await loadQualificationReuseSourceManifest(REPOSITORY_ROOT);
    const sourceReference = manifest.sources[0];

    expect(manifest.sources).toHaveLength(1);
    expect(sourceReference).toBeDefined();

    if (sourceReference === undefined) {
      throw new Error('Qualification reuse source manifest is empty.');
    }

    const targetRoot = await resolveQualificationResultTargetDirectory(
      RESULTS_ROOT,
      sourceReference.selection,
    );
    const attemptRelativeDirectory = path
      .relative(
        REPOSITORY_ROOT,
        path.join(targetRoot, 'attempts', createQualificationAttemptKey(sourceReference.attemptId)),
      )
      .split(path.sep)
      .join(path.posix.sep);
    const source = await readCommittedQualificationSource({
      attemptRelativeDirectory,
      attemptSha256: sourceReference.attemptSha256,
      evidenceCommit: sourceReference.evidenceCommit,
      repositoryRoot: REPOSITORY_ROOT,
      storageSha256: sourceReference.storageSha256,
    });

    expect(source).toMatchObject({
      attemptId: sourceReference.attemptId,
      mode: 'official',
      selection: sourceReference.selection,
      status: 'failed',
    });
    expect(source.cases).toHaveLength(12);
    expect(
      source.cases.filter(({ status }) => status === 'passed' || status === 'recovered'),
    ).toHaveLength(10);

    const firstCase = source.cases[0];

    if (firstCase === undefined) {
      throw new Error('Qualification reuse source contains no reusable cases.');
    }

    const caseResult = QualificationCaseResultSchema.parse(
      JSON.parse(
        (await source.readArtifact(`cases/${firstCase.caseId}/case-result.json`)).toString('utf8'),
      ) as unknown,
    );

    expect(caseResult).toStrictEqual(firstCase);
  });

  test('rejects source metadata that does not match the immutable Git objects', async () => {
    const manifest = await loadQualificationReuseSourceManifest(REPOSITORY_ROOT);
    const sourceReference = manifest.sources[0];

    if (sourceReference === undefined) {
      throw new Error('Qualification reuse source manifest is empty.');
    }

    const targetRoot = await resolveQualificationResultTargetDirectory(
      RESULTS_ROOT,
      sourceReference.selection,
    );
    const attemptRelativeDirectory = path
      .relative(
        REPOSITORY_ROOT,
        path.join(targetRoot, 'attempts', createQualificationAttemptKey(sourceReference.attemptId)),
      )
      .split(path.sep)
      .join(path.posix.sep);

    await expect(
      readCommittedQualificationSource({
        attemptRelativeDirectory,
        attemptSha256: '0'.repeat(64),
        evidenceCommit: sourceReference.evidenceCommit,
        repositoryRoot: REPOSITORY_ROOT,
        storageSha256: sourceReference.storageSha256,
      }),
    ).rejects.toThrow('Qualification reuse source does not match its recorded Git digests.');
    await expect(
      readCommittedQualificationSource({
        attemptRelativeDirectory,
        attemptSha256: sourceReference.attemptSha256,
        evidenceCommit: sourceReference.evidenceCommit,
        repositoryRoot: REPOSITORY_ROOT,
        storageSha256: '0'.repeat(64),
      }),
    ).rejects.toThrow('Qualification reuse source does not match its recorded Git digests.');
  });
});
