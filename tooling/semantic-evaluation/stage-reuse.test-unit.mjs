import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createSemanticStageReuseRecord,
  hasValidSemanticStageReuseRecord,
  selectSemanticStageReuse,
} from './stage-reuse.mjs';

const identitySha256 = 'a'.repeat(64);
const trial = {
  caseId: 'example-case',
  confirmationIndex: null,
  kind: 'initial',
};
const expected = {
  identitySha256,
  sourceAttemptId: '20260906T121210498Z-semantic-04a6cea4',
  sourceCommit: 'b'.repeat(40),
  sourceEvidencePath: 'fixtures/semantic-evaluation-results/attempts/example/evidence.json',
  sourceEvidenceSha256: 'c'.repeat(64),
  stage: 'actor',
  trial,
};

const createRecord = (overrides = {}) =>
  createSemanticStageReuseRecord({
    identitySha256,
    sourceAttemptId: '20260906T121210498Z-semantic-04a6cea4',
    sourceCommit: 'b'.repeat(40),
    sourceEvidencePath: 'fixtures/semantic-evaluation-results/attempts/example/evidence.json',
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
      { ...record, source: { ...record.source, commit: 'invalid' } },
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
