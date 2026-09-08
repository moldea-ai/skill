// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  QUALIFICATION_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT,
  QUALIFICATION_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT,
} from './constants.ts';
import {
  assertQualificationDiagnosticOutputSize,
  readQualificationDiagnosticState,
  writeQualificationDiagnosticState,
} from './runner.ts';
import {
  QualificationDiagnosticLedgerSchema,
  QualificationDiagnosticRecordSchema,
  type IQualificationDiagnosticBatchOutcome,
} from './types.ts';

const createOutcome = (explanation: string): IQualificationDiagnosticBatchOutcome => ({
  status: 'completed',
  identitySha256: 'a'.repeat(64),
  selection: { adapterId: 'custom', implementationId: 'custom' },
  selector: { kind: 'all', value: null, caseIds: ['case-one'] },
  candidateTokenLimit: 32_000_000,
  candidateTokensConsumed: 1,
  activeAttemptId: null,
  records: [
    {
      schemaVersion: 1,
      attemptId: 'attempt-one',
      caseId: 'case-one',
      verdict: 'passed',
      explanation,
      failedRequirementIds: [],
      unevaluatedRequirementIds: [],
      durationMs: 1,
      modelCallCount: 2,
      modelTokenCount: 1,
      operationalFailureCount: 0,
      candidateTokensConsumed: 1,
    },
  ],
});

describe('qualification diagnostic batch boundaries', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('accepts the exact state byte boundary and rejects one byte over', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-diagnostic-state-'));
    const statePath = path.join(temporaryRoot, 'state.json');
    const emptyState = { padding: '' };
    const encodedOverhead = Buffer.byteLength(`${JSON.stringify(emptyState, null, 2)}\n`, 'utf8');
    const exactState = {
      padding: 'x'.repeat(QUALIFICATION_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT - encodedOverhead),
    };

    await expect(writeQualificationDiagnosticState(statePath, exactState)).resolves.toBeUndefined();
    await expect(readFile(statePath)).resolves.toHaveLength(
      QUALIFICATION_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT,
    );
    await expect(
      writeQualificationDiagnosticState(statePath, {
        padding: `${exactState.padding}x`,
      }),
    ).rejects.toThrow('exceeds its UTF-8 byte limit');
  });

  test('accepts the exact output byte boundary and rejects one byte over', () => {
    const emptyOutcome = createOutcome('');
    const encodedOverhead = Buffer.byteLength(`${JSON.stringify(emptyOutcome, null, 2)}\n`, 'utf8');
    const exactExplanation = 'x'.repeat(
      QUALIFICATION_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT - encodedOverhead,
    );

    expect(() =>
      assertQualificationDiagnosticOutputSize(createOutcome(exactExplanation)),
    ).not.toThrow();
    expect(() =>
      assertQualificationDiagnosticOutputSize(createOutcome(`${exactExplanation}x`)),
    ).toThrow('exceeds its UTF-8 byte limit');
  });

  test('rejects body-sized explanations and mismatched completed ledgers', async () => {
    expect(() =>
      QualificationDiagnosticRecordSchema.parse({
        ...createOutcome('x').records[0],
        explanation: 'x'.repeat(4_097),
      }),
    ).toThrow('Diagnostic explanation exceeds its UTF-8 byte limit');

    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-diagnostic-ledger-'));
    const ledgerPath = path.join(temporaryRoot, 'ledger.json');
    await writeQualificationDiagnosticState(ledgerPath, {
      schemaVersion: 1,
      identitySha256: 'a'.repeat(64),
      selection: { adapterId: 'custom', implementationId: 'custom' },
      selector: { kind: 'all', value: null, caseIds: ['case-one'] },
      candidateTokensConsumed: 0,
      records: [],
      createdAt: '2026-09-08T00:00:00.000Z',
      updatedAt: '2026-09-08T00:00:00.000Z',
      unexpectedBody: 'must be rejected',
    });
    await expect(
      readQualificationDiagnosticState(ledgerPath, QualificationDiagnosticLedgerSchema),
    ).rejects.toThrow();
  });
});
