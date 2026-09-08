// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256 } from '../../../../tooling/codex-evaluation-host/index.mjs';

import { SemanticAttemptRecordSchema } from './validations.ts';

const TIMESTAMP = '2026-08-27T12:00:00.000Z';
const EMPTY_COMMAND_POLICY_EVIDENCE = {
  completedCommandCount: 0,
  credentialExposure: { status: 'not-observed', observedCount: 0, reasons: [] },
  maximumCommandOutputByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  moldeaCommandCount: 0,
  moldeaOutputByteCount: 0,
  networkAccess: {
    status: 'not-observed',
    observedCount: 0,
    indeterminateCount: 0,
    reasons: [],
  },
  sensitiveAccess: {
    status: 'not-observed',
    observedCount: 0,
    indeterminateCount: 0,
    reasons: [],
  },
};

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
          actorCommandPolicyEvidence: EMPTY_COMMAND_POLICY_EVIDENCE,
          actorResourceEvidence: {
            commandCount: 0,
            maximumInvocationByteCount: 0,
            modelVisibleToolOutputByteCount: 0,
            operations: [],
            stdoutByteCount: 0,
          },
          actorHost: {
            developerInstructionsSha256: CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
            model: 'gpt-5.6-sol',
            name: 'codex',
            reasoningEffort: 'high',
            role: 'actor',
            version: 'codex-cli test',
          },
          confirmationEligible: false,
          confirmationIndex: null,
          dimensions: {
            semantic: true,
            resource: true,
            commandPolicy: true,
            repositoryControl: true,
            mountIntegrity: true,
            operational: true,
          },
          evaluatedAt: TIMESTAMP,
          executionOrigin: 'executed',
          forbidden: [],
          failureClassifications: [],
          judgeCommandPolicyEvidence: EMPTY_COMMAND_POLICY_EVIDENCE,
          judgeHost: {
            developerInstructionsSha256: CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
            model: 'gpt-5.6-sol',
            name: 'codex',
            reasoningEffort: 'xhigh',
            role: 'judge',
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
    actor: {
      developerInstructionsSha256: CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
      model: 'gpt-5.6-sol',
      name: 'codex',
      reasoningEffort: 'high',
      role: 'actor',
    },
    judge: {
      developerInstructionsSha256: CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
      model: 'gpt-5.6-sol',
      name: 'codex',
      reasoningEffort: 'xhigh',
      role: 'judge',
    },
  },
  passedCaseCount: 1,
  pendingCaseCount: 0,
  recordedAt: TIMESTAMP,
  recoveredCaseCount: 0,
  reusedStageCount: 0,
  reusedTrialCount: 0,
  schemaVersion: 6,
  status: 'passed',
  stopReason: 'complete',
  totalCaseCount: 1,
  updatedAt: TIMESTAMP,
});

describe('SemanticAttemptRecordSchema', () => {
  test('accepts a terminal non-semantic failure without confirmations', () => {
    const attempt = createAttemptRecord(9, 25);
    const attemptCase = (attempt['cases'] as Array<Record<string, unknown>>)[0];
    const trial = (attemptCase?.['trials'] as Array<Record<string, unknown>>)[0];
    if (attemptCase === undefined || trial === undefined) {
      throw new Error('Expected one semantic trial.');
    }
    trial['dimensions'] = {
      semantic: true,
      resource: false,
      commandPolicy: true,
      repositoryControl: true,
      mountIntegrity: true,
      operational: true,
    };
    trial['failureClassifications'] = ['resource'];
    trial['passed'] = false;
    attemptCase['confirmationStatus'] = 'not-applicable';
    attemptCase['status'] = 'failed';
    attempt['failedCaseCount'] = 1;
    attempt['passedCaseCount'] = 0;
    attempt['status'] = 'failed';
    attempt['stopReason'] = 'complete-with-failures';

    expect(SemanticAttemptRecordSchema.safeParse(attempt).success).toBe(true);
  });

  test('rejects contradictory case aggregates and stop reasons', () => {
    const attempt = createAttemptRecord(9, 25);
    attempt['failedCaseCount'] = 1;
    attempt['passedCaseCount'] = 0;
    attempt['status'] = 'failed';
    attempt['stopReason'] = 'complete-with-failures';

    expect(SemanticAttemptRecordSchema.safeParse(attempt).success).toBe(false);
  });

  test('rejects undeclared compatibility fields', () => {
    const attempt = createAttemptRecord(9, 25);
    attempt['legacyResult'] = { status: 'passed' };

    expect(SemanticAttemptRecordSchema.safeParse(attempt).success).toBe(false);
  });

  test.each([
    [8, 25, false],
    [9, 24, false],
    [9, 25, true],
    [9, 26, false],
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
    const record = createAttemptRecord(9, 25);
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
    const record = createAttemptRecord(9, 25);
    const attemptCase = (record['cases'] as Array<Record<string, unknown>>)[0];
    const trial = (attemptCase?.['trials'] as Array<Record<string, unknown>>)[0];
    if (trial === undefined) throw new Error('Expected one semantic trial.');
    delete trial['executionOrigin'];
    delete trial['stageReuse'];

    expect(SemanticAttemptRecordSchema.safeParse(record).success).toBe(false);
  });

  test('rejects a passing command-policy dimension with observed actor access', () => {
    const record = createAttemptRecord(9, 25);
    const attemptCase = (record['cases'] as Array<Record<string, unknown>>)[0];
    const trial = (attemptCase?.['trials'] as Array<Record<string, unknown>>)[0];
    if (trial === undefined) throw new Error('Expected one semantic trial.');
    trial['actorCommandPolicyEvidence'] = {
      ...EMPTY_COMMAND_POLICY_EVIDENCE,
      completedCommandCount: 1,
      networkAccess: {
        status: 'observed',
        observedCount: 1,
        indeterminateCount: 0,
        reasons: [{ code: 'network-client', count: 1 }],
      },
    };

    expect(SemanticAttemptRecordSchema.safeParse(record).success).toBe(false);
  });

  test('rejects moldea command counts greater than completed command counts', () => {
    const record = createAttemptRecord(9, 25);
    const attemptCase = (record['cases'] as Array<Record<string, unknown>>)[0];
    const trial = (attemptCase?.['trials'] as Array<Record<string, unknown>>)[0];
    if (trial === undefined) throw new Error('Expected one semantic trial.');
    trial['actorCommandPolicyEvidence'] = {
      ...EMPTY_COMMAND_POLICY_EVIDENCE,
      moldeaCommandCount: 1,
    };

    expect(SemanticAttemptRecordSchema.safeParse(record).success).toBe(false);
  });

  test('rejects reused provenance that names another case', () => {
    const record = createAttemptRecord(9, 25);
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
