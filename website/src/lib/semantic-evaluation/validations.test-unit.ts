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
    [5, 22, false],
    [6, 21, false],
    [6, 22, true],
    [6, 23, false],
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
