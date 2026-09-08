// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { SemanticAttemptRecordSchema } from './validations.ts';

const TIMESTAMP = '2026-08-27T12:00:00.000Z';

/** Creates one complete attempt summary with a selectable evidence contract. */
const createAttemptRecord = (
  schemaVersion: number,
  evaluationProtocolVersion: number,
): Record<string, unknown> => ({
  artifactDigest: 'a'.repeat(64),
  attemptId: 'semantic-attempt',
  caseSuiteDigest: 'b'.repeat(64),
  cases: [
    {
      confirmationStatus: 'not-required',
      id: 'semantic-case',
      status: 'passed',
      trials: [
        {
          actorCommandPolicyEvidence: {
            completedCommandCount: 0,
          },
          actorResourceEvidence: {
            commandCount: 0,
            maximumInvocationByteCount: 0,
            modelVisibleToolOutputByteCount: 0,
            operations: [],
            stdoutByteCount: 0,
          },
          actorHost: {
            model: 'gpt-5.6-sol',
            name: 'codex',
            reasoningEffort: 'high',
            version: 'codex-cli test',
          },
          confirmationIndex: null,
          evaluatedAt: TIMESTAMP,
          executionOrigin: 'executed',
          forbidden: [],
          judgeHost: {
            model: 'gpt-5.6-sol',
            name: 'codex',
            reasoningEffort: 'high',
            version: 'codex-cli test',
          },
          kind: 'initial',
          observed: ['expected-behavior'],
          passed: true,
          rationale: 'The expected behavior was observed.',
          stageReuse: null,
        },
      ],
    },
  ],
  cli: {
    integrity: 'sha512-test',
    jsonSchemaVersion: 3,
    name: '@moldea.ai/cli',
    packageLockSha256: 'c'.repeat(64),
    version: '6.0.0',
  },
  coverageDigest: 'd'.repeat(64),
  createdAt: TIMESTAMP,
  evidence: {
    evaluationProtocolVersion,
    kind: 'candidate',
    path: 'evidence.json',
    schemaVersion,
    sha256: 'e'.repeat(64),
  },
  failedCaseCount: 0,
  executedStageCount: 2,
  executedTrialCount: 1,
  hostContract: {
    model: 'gpt-5.6-sol',
    name: 'codex',
    reasoningEffort: 'high',
  },
  passedCaseCount: 1,
  pendingCaseCount: 0,
  recordedAt: TIMESTAMP,
  recoveredCaseCount: 0,
  reusedStageCount: 0,
  reusedTrialCount: 0,
  schemaVersion: 4,
  status: 'passed',
  stopReason: 'complete',
  totalCaseCount: 1,
  updatedAt: TIMESTAMP,
});

describe('SemanticAttemptRecordSchema', () => {
  test('accepts the complete failed-attempt stop reason', () => {
    const attempt = createAttemptRecord(7, 23);
    attempt['status'] = 'failed';
    attempt['stopReason'] = 'complete-with-failures';

    expect(SemanticAttemptRecordSchema.safeParse(attempt).success).toBe(true);
  });

  test.each([
    [6, 23, false],
    [7, 22, false],
    [7, 23, true],
    [7, 24, false],
  ])(
    'schema %d with protocol %d has validity %s',
    (schemaVersion, evaluationProtocolVersion, expectedValidity) => {
      expect(
        SemanticAttemptRecordSchema.safeParse(
          createAttemptRecord(schemaVersion, evaluationProtocolVersion),
        ).success,
      ).toBe(expectedValidity);
    },
  );

  test('validates explicit executed and reused stage-count arithmetic', () => {
    const record = createAttemptRecord(7, 23);
    const attemptCase = (record['cases'] as Array<Record<string, unknown>>)[0];
    const trial = (attemptCase?.['trials'] as Array<Record<string, unknown>>)[0];
    if (trial === undefined) throw new Error('Expected one semantic trial.');
    expect(SemanticAttemptRecordSchema.safeParse(record).success).toBe(true);
    record['executedStageCount'] = 1;
    expect(SemanticAttemptRecordSchema.safeParse(record).success).toBe(false);
    delete record['executedStageCount'];
    expect(SemanticAttemptRecordSchema.safeParse(record).success).toBe(false);
  });

  test('rejects attempts without explicit execution provenance', () => {
    const record = createAttemptRecord(7, 23);
    const attemptCase = (record['cases'] as Array<Record<string, unknown>>)[0];
    const trial = (attemptCase?.['trials'] as Array<Record<string, unknown>>)[0];
    if (trial === undefined) throw new Error('Expected one semantic trial.');
    delete trial['executionOrigin'];
    delete trial['stageReuse'];

    expect(SemanticAttemptRecordSchema.safeParse(record).success).toBe(false);
  });

  test('rejects reused provenance that names another case', () => {
    const record = createAttemptRecord(7, 23);
    const attemptCase = (record['cases'] as Array<Record<string, unknown>>)[0];
    const trial = (attemptCase?.['trials'] as Array<Record<string, unknown>>)[0];
    if (trial === undefined) throw new Error('Expected one semantic trial.');
    const source = {
      attemptId: 'source-attempt',
      commit: 'f'.repeat(40),
      evidencePath: 'fixtures/semantic-evaluation-results/attempts/source-attempt/evidence.json',
      evidenceSha256: 'f'.repeat(64),
      trial: { caseId: 'another-case', confirmationIndex: null, kind: 'initial' },
    };
    trial['executionOrigin'] = 'reused';
    trial['stageReuse'] = {
      actor: {
        identitySha256: 'f'.repeat(64),
        origin: 'reused',
        schemaVersion: 1,
        source,
        stage: 'actor',
      },
      judge: {
        identitySha256: 'e'.repeat(64),
        origin: 'reused',
        schemaVersion: 1,
        source,
        stage: 'judge',
      },
    };

    expect(SemanticAttemptRecordSchema.safeParse(record).success).toBe(false);
  });
});
