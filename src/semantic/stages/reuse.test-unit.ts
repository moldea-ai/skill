import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import {
  createSemanticStageReuseRecord,
  hasValidSemanticStageReuseRecord,
  selectSemanticStageReuse,
} from './reuse.ts';
import type { ISemanticStageReuseExpectation, ISemanticStageTrialIdentity } from './types.ts';

const identitySha256 = 'a'.repeat(64);
const trial: ISemanticStageTrialIdentity = {
  caseId: 'example-case',
  confirmationIndex: null,
  kind: 'initial',
};
const expected: ISemanticStageReuseExpectation = {
  identitySha256,
  sourceAttemptId: 'source-attempt',
  sourceEvidenceSha256: 'c'.repeat(64),
  stage: 'actor',
  trial,
};

const createRecord = (
  overrides: Partial<Parameters<typeof createSemanticStageReuseRecord>[0]> = {},
) =>
  createSemanticStageReuseRecord({
    identitySha256,
    sourceAttemptId: 'source-attempt',
    sourceEvidenceSha256: 'c'.repeat(64),
    stage: 'actor',
    trial,
    ...overrides,
  });

describe('semantic stage reuse', () => {
  test('selects one exact source with complete immutable provenance', () => {
    const record = createRecord();
    assert.equal(selectSemanticStageReuse([record], expected), record);
  });

  test('matches semantic trial identity independently of property insertion order', () => {
    const record = createRecord();
    const reorderedTrial = {
      kind: trial.kind,
      confirmationIndex: trial.confirmationIndex,
      caseId: trial.caseId,
    };

    assert.equal(
      hasValidSemanticStageReuseRecord(record, {
        ...expected,
        trial: reorderedTrial,
      }),
      true,
    );
  });

  test('rejects identity, source, and trial tampering', () => {
    const record = createRecord();
    for (const tampered of [
      { ...record, identitySha256: 'd'.repeat(64) },
      { ...record, source: { ...record.source, attemptId: '' } },
      {
        ...record,
        source: { ...record.source, evidenceSha256: 'd'.repeat(64) },
      },
      {
        ...record,
        source: {
          ...record.source,
          trial: {
            caseId: 'other-case',
            confirmationIndex: null,
            kind: 'initial',
          },
        },
      },
      {
        ...record,
        source: {
          ...record.source,
          trial: {
            caseId: 'example-case',
            confirmationIndex: 1,
            kind: 'initial',
          },
        },
      },
    ]) {
      assert.equal(hasValidSemanticStageReuseRecord(tampered, expected), false);
    }
  });

  test('rejects ambiguous exact sources', () => {
    const record = createRecord();
    assert.throws(() => selectSemanticStageReuse([record, record], expected));
  });
});
