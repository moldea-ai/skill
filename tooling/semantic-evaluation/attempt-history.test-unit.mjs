// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import { createSemanticAttemptRecord } from './attempt-history.mjs';

const SHA256 = 'a'.repeat(64);
const HOST = {
  model: 'gpt-5.6-sol',
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
const COMMAND_POLICY_EVIDENCE = {
  completedCommandCount: 1,
  indeterminateCommandCount: 0,
  packageManagerExecution: 'not-observed',
  packageManagerInvocationCount: 0,
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
  artifactDigest: SHA256,
  caseSuiteDigest: 'b'.repeat(64),
  cli: { name: '@moldea.ai/cli', version: '4.0.1' },
  confirmations,
  coverageDigest: 'c'.repeat(64),
  evaluationProtocolVersion: 16,
  generatedAt: '2026-08-25T00:00:00.000Z',
  confirmations: confirmations.map((confirmation) => ({
    actorCommandPolicyEvidence: COMMAND_POLICY_EVIDENCE,
    actorHost: UPDATED_HOST,
    judgeHost: UPDATED_HOST,
    ...confirmation,
  })),
  hostContract: HOST_CONTRACT,
  results: results.map((result) => ({
    actorCommandPolicyEvidence: COMMAND_POLICY_EVIDENCE,
    actorHost: HOST,
    judgeHost: HOST,
    ...result,
  })),
  schemaVersion: 5,
  updatedAt: '2026-08-25T01:00:00.000Z',
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

test('semantic attempt summaries preserve mixed per-trial host provenance', () => {
  const initialFailure = createTrial('variable-case', false, '2026-08-25T00:30:00.000Z');
  const confirmation = {
    ...createTrial('variable-case', true, '2026-08-25T01:00:00.000Z'),
    confirmationIndex: 1,
  };
  const attempt = createSemanticAttemptRecord({
    evidence: createEvidence([initialFailure], [confirmation]),
    evidenceKind: 'candidate',
    evidenceSha256: 'e'.repeat(64),
    recordedAt: '2026-08-25T01:00:01.000Z',
    stopReason: 'operator-recorded',
    totalCaseCount: 1,
  });

  assert.equal(attempt.schemaVersion, 4);
  assert.deepEqual(attempt.hostContract, HOST_CONTRACT);
  assert.equal(attempt.actorHost, undefined);
  assert.equal(attempt.cases[0].trials[0].actorHost.version, HOST.version);
  assert.equal(attempt.cases[0].trials[1].actorHost.version, UPDATED_HOST.version);
  assert.equal(attempt.cases[0].trials[1].judgeHost.version, UPDATED_HOST.version);
});

test('semantic attempt summaries record Sol provenance and command policy', () => {
  const attempt = createSemanticAttemptRecord({
    evidence: createEvidence([createTrial('passing-case', true, '2026-08-25T01:00:00.000Z')]),
    evidenceKind: 'candidate',
    evidenceSha256: 'd'.repeat(64),
    recordedAt: '2026-08-25T01:00:01.000Z',
    stopReason: 'complete',
    totalCaseCount: 1,
  });

  assert.equal(attempt.schemaVersion, 4);
  assert.deepEqual(attempt.hostContract, HOST_CONTRACT);
  assert.equal(attempt.cases[0].trials[0].actorHost.model, HOST.model);
  assert.deepEqual(attempt.cases[0].trials[0].actorCommandPolicyEvidence, COMMAND_POLICY_EVIDENCE);
});

test('semantic attempt summaries reject missing or incompatible trial evidence', () => {
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
          ...createEvidence([trial]),
          results: [{ ...trial, actorHost: HOST, judgeHost: undefined }],
        },
      }),
    /invalid trial host provenance/,
  );
  assert.throws(
    () =>
      createSemanticAttemptRecord({
        ...options,
        evidence: createEvidence([{ ...trial, actorHost: { ...HOST, reasoningEffort: 'high' } }]),
      }),
    /invalid trial host provenance/,
  );
  assert.throws(
    () =>
      createSemanticAttemptRecord({
        ...options,
        evidence: {
          ...createEvidence([trial]),
          results: [{ ...trial, actorHost: HOST, judgeHost: { ...HOST, model: 'other' } }],
        },
      }),
    /invalid trial host provenance/,
  );
  assert.throws(
    () =>
      createSemanticAttemptRecord({
        ...options,
        evidence: {
          ...createEvidence([trial]),
          results: [{ ...trial, actorHost: HOST, judgeHost: HOST }],
        },
      }),
    /invalid trial command-policy evidence/,
  );
});

test('semantic attempt summaries reject superseded evidence contracts', () => {
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
        evidence: { ...createEvidence([trial]), schemaVersion: 4 },
      }),
    /unsupported schema/,
  );
  assert.throws(
    () =>
      createSemanticAttemptRecord({
        ...options,
        evidence: { ...createEvidence([trial]), evaluationProtocolVersion: 15 },
      }),
    /unsupported protocol/,
  );
});
