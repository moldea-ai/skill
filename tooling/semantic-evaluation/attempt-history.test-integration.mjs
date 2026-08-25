// @vitest-environment node
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  loadSemanticEvaluationAttempts,
  recordSemanticEvaluationAttempt,
  verifySemanticEvaluationAttempts,
} from './attempt-history.mjs';

const createEvidence = (id, passed, updatedAt) => ({
  actorHost: { name: 'codex' },
  artifactDigest: 'a'.repeat(64),
  caseSuiteDigest: 'b'.repeat(64),
  cli: { name: '@moldea.ai/cli', version: '4.0.1' },
  confirmations: [],
  coverageDigest: 'c'.repeat(64),
  evaluationProtocolVersion: 12,
  generatedAt: updatedAt,
  judgeHost: { name: 'codex' },
  results: [
    {
      evaluatedAt: updatedAt,
      forbidden: [],
      id,
      observed: passed ? ['required-behavior'] : [],
      passed,
      rationale: passed
        ? 'The required behavior was observed.'
        : 'The required behavior was missing.',
    },
  ],
  schemaVersion: 3,
  updatedAt,
});

test('semantic attempt recording is append-only and maintains independent latest pointers', async () => {
  const resultsRoot = await mkdtemp(join(tmpdir(), 'moldea-semantic-attempts-'));
  try {
    const passingEvidence = `${JSON.stringify(
      createEvidence('passing-case', true, '2026-08-25T00:00:00.000Z'),
      null,
      2,
    )}\n`;
    const failedEvidence = `${JSON.stringify(
      createEvidence('failing-case', false, '2026-08-25T01:00:00.000Z'),
      null,
      2,
    )}\n`;
    const passing = await recordSemanticEvaluationAttempt({
      evidenceKind: 'candidate',
      evidenceText: passingEvidence,
      recordedAt: '2026-08-25T00:00:01.000Z',
      resultsRoot,
      stopReason: 'complete',
      totalCaseCount: 1,
    });
    const failed = await recordSemanticEvaluationAttempt({
      evidenceKind: 'candidate',
      evidenceText: failedEvidence,
      recordedAt: '2026-08-25T01:00:01.000Z',
      resultsRoot,
      stopReason: 'case-failure',
      totalCaseCount: 2,
    });

    const history = await loadSemanticEvaluationAttempts(resultsRoot);
    assert.deepEqual(
      history.attempts.map(({ status }) => status),
      ['passed', 'failed'],
    );
    assert.equal(history.latest?.latestAttemptId, failed.attemptId);
    assert.equal(history.latest?.lastPassingAttemptId, passing.attemptId);
    assert.deepEqual(await verifySemanticEvaluationAttempts(resultsRoot), {
      attempts: 2,
      issues: [],
      passed: true,
    });

    const repeated = await recordSemanticEvaluationAttempt({
      evidenceKind: 'candidate',
      evidenceText: failedEvidence,
      recordedAt: '2026-08-25T02:00:00.000Z',
      resultsRoot,
      stopReason: 'case-failure',
      totalCaseCount: 2,
    });
    assert.equal(repeated.attemptId, failed.attemptId);
    assert.equal((await loadSemanticEvaluationAttempts(resultsRoot)).attempts.length, 2);

    await assert.rejects(
      recordSemanticEvaluationAttempt({
        evidenceKind: 'candidate',
        evidenceText: failedEvidence,
        recordedAt: '2026-08-25T02:00:00.000Z',
        resultsRoot,
        stopReason: 'operator-recorded',
        totalCaseCount: 2,
      }),
      /already exists with different recording metadata/,
    );
  } finally {
    await rm(resultsRoot, { force: true, recursive: true });
  }
});

test('semantic attempt verification detects changed immutable evidence', async () => {
  const resultsRoot = await mkdtemp(join(tmpdir(), 'moldea-semantic-attempts-'));
  try {
    const evidenceText = `${JSON.stringify(
      createEvidence('passing-case', true, '2026-08-25T00:00:00.000Z'),
      null,
      2,
    )}\n`;
    const attempt = await recordSemanticEvaluationAttempt({
      evidenceKind: 'candidate',
      evidenceText,
      recordedAt: '2026-08-25T00:00:01.000Z',
      resultsRoot,
      stopReason: 'complete',
      totalCaseCount: 1,
    });
    const evidencePath = join(resultsRoot, 'attempts', attempt.attemptId, 'evidence.json');
    const evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
    evidence.results[0].rationale = 'Tampered rationale.';
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

    const verification = await verifySemanticEvaluationAttempts(resultsRoot);
    assert.equal(verification.passed, false);
    assert.match(verification.issues[0], /does not match its evidence/);
  } finally {
    await rm(resultsRoot, { force: true, recursive: true });
  }
});
