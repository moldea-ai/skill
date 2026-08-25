// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import { createSemanticAttemptRecord } from './attempt-history.mjs';

const SHA256 = 'a'.repeat(64);
const HOST = {
  model: 'gpt-5.6-terra',
  name: 'codex',
  reasoningEffort: 'medium',
  version: 'codex-cli test',
};
const UPDATED_HOST = { ...HOST, version: 'codex-cli updated' };
const HOST_CONTRACT = {
  model: HOST.model,
  name: HOST.name,
  reasoningEffort: HOST.reasoningEffort,
};

const createTrial = (id, passed, evaluatedAt) => ({
  evaluatedAt,
  forbidden: [],
  id,
  observed: passed ? ['required-behavior'] : [],
  passed,
  rationale: passed ? 'The required behavior was observed.' : 'The required behavior was missing.',
});

const createEvidence = (results, confirmations = []) => ({
  actorHost: HOST,
  artifactDigest: SHA256,
  caseSuiteDigest: 'b'.repeat(64),
  cli: { name: '@moldea.ai/cli', version: '4.0.1' },
  confirmations,
  coverageDigest: 'c'.repeat(64),
  evaluatedAt: '2026-08-25T01:00:00.000Z',
  evaluationProtocolVersion: 12,
  generatedAt: '2026-08-25T00:00:00.000Z',
  judgeHost: HOST,
  results,
  schemaVersion: 3,
  updatedAt: '2026-08-25T01:00:00.000Z',
});

const createCurrentEvidence = (results, confirmations = []) => ({
  ...createEvidence([], []),
  actorHost: undefined,
  confirmations: confirmations.map((confirmation) => ({
    actorHost: UPDATED_HOST,
    judgeHost: UPDATED_HOST,
    ...confirmation,
  })),
  hostContract: HOST_CONTRACT,
  judgeHost: undefined,
  results: results.map((result) => ({
    actorHost: HOST,
    judgeHost: HOST,
    ...result,
  })),
  schemaVersion: 4,
});

test('semantic attempt summaries expose failures and pending cases', () => {
  const evidence = createEvidence([
    createTrial('passing-case', true, '2026-08-25T00:30:00.000Z'),
    createTrial('failing-case', false, '2026-08-25T01:00:00.000Z'),
  ]);
  const attempt = createSemanticAttemptRecord({
    evidence,
    evidenceKind: 'candidate',
    evidenceSha256: 'd'.repeat(64),
    recordedAt: '2026-08-25T01:00:01.000Z',
    stopReason: 'case-failure',
    totalCaseCount: 4,
  });

  assert.equal(attempt.status, 'failed');
  assert.equal(attempt.passedCaseCount, 1);
  assert.equal(attempt.failedCaseCount, 1);
  assert.equal(attempt.pendingCaseCount, 2);
  assert.equal(
    attempt.cases.find(({ id }) => id === 'failing-case')?.confirmationStatus,
    'required',
  );
});

test('semantic attempt summaries recover only after two passing confirmations', () => {
  const initialFailure = createTrial('variable-case', false, '2026-08-25T00:30:00.000Z');
  const firstConfirmation = {
    ...createTrial('variable-case', true, '2026-08-25T00:40:00.000Z'),
    confirmationIndex: 1,
  };
  const oneConfirmation = createSemanticAttemptRecord({
    evidence: createEvidence([initialFailure], [firstConfirmation]),
    evidenceKind: 'candidate',
    evidenceSha256: 'e'.repeat(64),
    recordedAt: '2026-08-25T01:00:01.000Z',
    stopReason: 'operator-recorded',
    totalCaseCount: 1,
  });
  assert.equal(oneConfirmation.status, 'failed');
  assert.equal(oneConfirmation.cases[0]?.confirmationStatus, 'required');

  const recovered = createSemanticAttemptRecord({
    evidence: createEvidence(
      [initialFailure],
      [
        firstConfirmation,
        {
          ...createTrial('variable-case', true, '2026-08-25T01:00:00.000Z'),
          confirmationIndex: 2,
        },
      ],
    ),
    evidenceKind: 'candidate',
    evidenceSha256: 'f'.repeat(64),
    recordedAt: '2026-08-25T01:00:01.000Z',
    stopReason: 'confirmations-passed',
    totalCaseCount: 1,
  });
  assert.equal(recovered.status, 'passed');
  assert.equal(recovered.recoveredCaseCount, 1);
  assert.equal(recovered.cases[0]?.status, 'recovered');
});

test('semantic attempt summaries reject non-contiguous and excessive confirmations', () => {
  const initialFailure = createTrial('variable-case', false, '2026-08-25T00:30:00.000Z');
  assert.throws(
    () =>
      createSemanticAttemptRecord({
        evidence: createEvidence(
          [initialFailure],
          [
            {
              ...createTrial('variable-case', true, '2026-08-25T01:00:00.000Z'),
              confirmationIndex: 2,
            },
          ],
        ),
        evidenceKind: 'candidate',
        evidenceSha256: 'f'.repeat(64),
        recordedAt: '2026-08-25T01:00:01.000Z',
        stopReason: 'operator-recorded',
        totalCaseCount: 1,
      }),
    /non-contiguous confirmation sequence/,
  );
});

test('semantic attempt summaries reject stop reasons that contradict their evidence', () => {
  assert.throws(
    () =>
      createSemanticAttemptRecord({
        evidence: createEvidence([createTrial('passing-case', true, '2026-08-25T01:00:00.000Z')]),
        evidenceKind: 'candidate',
        evidenceSha256: 'f'.repeat(64),
        recordedAt: '2026-08-25T01:00:01.000Z',
        stopReason: 'case-failure',
        totalCaseCount: 1,
      }),
    /stop reason case-failure does not match its case evidence/,
  );
});

test('semantic attempt schema 2 preserves mixed per-trial host provenance', () => {
  const initialFailure = createTrial('variable-case', false, '2026-08-25T00:30:00.000Z');
  const confirmation = {
    ...createTrial('variable-case', true, '2026-08-25T01:00:00.000Z'),
    confirmationIndex: 1,
  };
  const attempt = createSemanticAttemptRecord({
    evidence: createCurrentEvidence([initialFailure], [confirmation]),
    evidenceKind: 'candidate',
    evidenceSha256: 'e'.repeat(64),
    recordedAt: '2026-08-25T01:00:01.000Z',
    stopReason: 'operator-recorded',
    totalCaseCount: 1,
  });

  assert.equal(attempt.schemaVersion, 2);
  assert.deepEqual(attempt.hostContract, HOST_CONTRACT);
  assert.equal(attempt.actorHost, undefined);
  assert.equal(attempt.cases[0].trials[0].actorHost.version, HOST.version);
  assert.equal(attempt.cases[0].trials[1].actorHost.version, UPDATED_HOST.version);
  assert.equal(attempt.cases[0].trials[1].judgeHost.version, UPDATED_HOST.version);
});

test('semantic attempt schema 2 rejects missing or incompatible trial hosts', () => {
  const trial = createTrial('passing-case', true, '2026-08-25T01:00:00.000Z');
  const options = {
    evidenceKind: 'candidate',
    evidenceSha256: 'f'.repeat(64),
    recordedAt: '2026-08-25T01:00:01.000Z',
    stopReason: 'complete',
    totalCaseCount: 1,
  };

  assert.throws(
    () =>
      createSemanticAttemptRecord({
        ...options,
        evidence: {
          ...createCurrentEvidence([trial]),
          results: [{ ...trial, actorHost: HOST, judgeHost: undefined }],
        },
      }),
    /invalid trial host provenance/,
  );
  assert.throws(
    () =>
      createSemanticAttemptRecord({
        ...options,
        evidence: createCurrentEvidence([
          { ...trial, actorHost: { ...HOST, reasoningEffort: 'high' } },
        ]),
      }),
    /invalid trial host provenance/,
  );
});
