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
            indeterminateCommandCount: 0,
            packageManagerExecution: 'not-observed',
            packageManagerInvocationCount: 0,
          },
          actorHost: {
            model: 'gpt-5.6-sol',
            name: 'codex',
            reasoningEffort: 'medium',
            version: 'codex-cli test',
          },
          confirmationIndex: null,
          evaluatedAt: TIMESTAMP,
          forbidden: [],
          judgeHost: {
            model: 'gpt-5.6-sol',
            name: 'codex',
            reasoningEffort: 'medium',
            version: 'codex-cli test',
          },
          kind: 'initial',
          observed: ['expected-behavior'],
          passed: true,
          rationale: 'The expected behavior was observed.',
        },
      ],
    },
  ],
  cli: {
    integrity: 'sha512-test',
    jsonSchemaVersion: 2,
    name: '@moldea.ai/cli',
    packageLockSha256: 'c'.repeat(64),
    version: '5.0.0',
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
  hostContract: {
    model: 'gpt-5.6-sol',
    name: 'codex',
    reasoningEffort: 'medium',
  },
  passedCaseCount: 1,
  pendingCaseCount: 0,
  recordedAt: TIMESTAMP,
  recoveredCaseCount: 0,
  schemaVersion: 4,
  status: 'passed',
  stopReason: 'complete',
  totalCaseCount: 1,
  updatedAt: TIMESTAMP,
});

describe('SemanticAttemptRecordSchema', () => {
  test.each([
    [5, 16, true],
    [5, 17, true],
    [5, 18, false],
    [5, 19, false],
    [5, 20, false],
    [6, 16, false],
    [6, 17, false],
    [6, 18, true],
    [6, 19, true],
    [6, 20, true],
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
});
