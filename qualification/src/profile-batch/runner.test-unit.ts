// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  QUALIFICATION_PROFILE_BATCH_OUTPUT_MAXIMUM_BYTE_COUNT,
  QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION,
  QUALIFICATION_PROFILE_BATCH_STATE_MAXIMUM_BYTE_COUNT,
} from './constants.ts';
import {
  assertQualificationProfileWorkerResult,
  assertQualificationProfileBatchOutputSize,
  readQualificationProfileBatchState,
  writeQualificationProfileBatchState,
} from './runner.ts';
import {
  QualificationProfileBatchLedgerSchema,
  QualificationProfileBatchRecordSchema,
  type IQualificationProfileBatchOutcome,
} from './types.ts';

const createOutcome = (summary: string): IQualificationProfileBatchOutcome => ({
  status: 'completed',
  batchId: `b-${'a'.repeat(32)}`,
  identitySha256: 'b'.repeat(64),
  selector: {
    kind: 'targets',
    value: 'anthropic/typescript-messages-api-0-117',
    targetIds: ['anthropic/typescript-messages-api-0-117'],
  },
  isDryRun: true,
  candidateTokensConsumed: 0,
  activeAttemptIds: [],
  records: [
    {
      schemaVersion: QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION,
      attemptId: 'attempt-one',
      adapterId: 'anthropic',
      implementationId: 'typescript-messages-api-0-117',
      status: 'passed',
      summary,
      caseCount: 2,
      failedCaseCount: 0,
      recoveredCaseCount: 0,
      modelCallCount: 0,
      modelTokenCount: 0,
      candidateTokensConsumed: 0,
      durationMs: 1,
    },
  ],
});

describe('qualification profile-batch boundaries', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) await rm(temporaryRoot, { force: true, recursive: true });
  });

  test('accepts the exact state boundary and rejects one byte over', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-profile-batch-state-'));
    const statePath = path.join(temporaryRoot, 'state.json');
    const encodedOverhead = Buffer.byteLength(`${JSON.stringify({ padding: '' }, null, 2)}\n`);
    const padding = 'x'.repeat(
      QUALIFICATION_PROFILE_BATCH_STATE_MAXIMUM_BYTE_COUNT - encodedOverhead,
    );

    await writeQualificationProfileBatchState(statePath, { padding });
    await expect(readFile(statePath)).resolves.toHaveLength(
      QUALIFICATION_PROFILE_BATCH_STATE_MAXIMUM_BYTE_COUNT,
    );
    await expect(
      writeQualificationProfileBatchState(statePath, { padding: `${padding}x` }),
    ).rejects.toThrow('exceeds its UTF-8 byte limit');
  });

  test('enforces compact output and summary boundaries', () => {
    const emptyOutcome = createOutcome('');
    const encodedOverhead = Buffer.byteLength(`${JSON.stringify(emptyOutcome, null, 2)}\n`);
    const exactSummary = 'x'.repeat(
      QUALIFICATION_PROFILE_BATCH_OUTPUT_MAXIMUM_BYTE_COUNT - encodedOverhead,
    );

    expect(() =>
      assertQualificationProfileBatchOutputSize(createOutcome(exactSummary)),
    ).not.toThrow();
    expect(() =>
      assertQualificationProfileBatchOutputSize(createOutcome(`${exactSummary}x`)),
    ).toThrow('exceeds its UTF-8 byte limit');
    expect(() =>
      QualificationProfileBatchRecordSchema.parse({
        ...createOutcome('x').records[0],
        summary: 'x'.repeat(4_097),
      }),
    ).toThrow('Profile-batch summary exceeds its UTF-8 byte limit');
  });

  test('rejects unknown state fields', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-profile-batch-ledger-'));
    const ledgerPath = path.join(temporaryRoot, 'ledger.json');
    const outcome = createOutcome('Passed.');
    await writeQualificationProfileBatchState(ledgerPath, {
      schemaVersion: QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION,
      batchId: outcome.batchId,
      identitySha256: outcome.identitySha256,
      selector: outcome.selector,
      isDryRun: true,
      records: outcome.records,
      candidateTokensConsumed: 0,
      createdAt: '2026-09-09T00:00:00.000Z',
      updatedAt: '2026-09-09T00:00:00.000Z',
      unexpectedBody: 'rejected',
    });
    await expect(
      readQualificationProfileBatchState(ledgerPath, QualificationProfileBatchLedgerSchema),
    ).rejects.toThrow();
  });

  test('preserves the bounded summary from an errored qualification target', () => {
    expect(() =>
      assertQualificationProfileWorkerResult(
        'attempt-one',
        'anthropic/typescript-messages-api-0-117',
        {
          selection: {
            adapterId: 'anthropic',
            implementationId: 'typescript-messages-api-0-117',
          },
          status: 'errored',
          summary: 'Exact pnpm peer dependency failure.',
        },
        {},
      ),
    ).toThrow('Exact pnpm peer dependency failure.');
  });
});
