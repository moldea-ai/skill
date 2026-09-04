// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { createSemanticCaseDefinitionDigest } from '../../../../tooling/semantic-evaluation/index.mjs';
import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from '../../../../tooling/release-identity/constants.mjs';

import { createSemanticEvaluationReplay } from './replay-transformers.ts';
import type { ISemanticCaseDefinition } from './types.ts';
import {
  SemanticReplayCandidateSchema,
  type ISemanticAttemptRecord,
  type ISemanticReplayCandidate,
  type ISemanticReplayCommand,
} from './validations.ts';

const HOST = {
  model: 'gpt-5.6-sol',
  name: 'codex',
  reasoningEffort: 'medium',
  version: 'codex-cli test',
} as const;
const createCommandPolicyEvidence = (completedCommandCount: number) => ({
  completedCommandCount,
});
const CASE_DEFINITION = {
  expected: [{ criterion: 'The agent must finish.', label: 'finished' }],
  forbidden: [{ criterion: 'The agent must not overreach.', label: 'overreach' }],
  id: 'replay-case',
  input: {
    developerDirection: 'Please make the requested repository change.',
    repositoryEvidence: [
      {
        claim: 'The developer supplied the requested change.',
        source: { kind: 'developer-direction' },
      },
    ],
  },
  operation: 'change-repository',
  resourceBudget: {
    activation: 'direct',
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262_144,
    minimumMoldeaCommands: 1,
  },
  scenario: 'A developer requests a bounded change.',
} satisfies ISemanticCaseDefinition;
const CASE_DEFINITION_DIGEST = 'a'.repeat(64);

const createCommand = (
  exitCode: number,
  fact: ISemanticReplayCommand['item']['outputEvidence']['facts'][number] | null,
): Record<string, unknown> => ({
  eventType: 'item.completed',
  item: {
    commandKind: fact === null ? 'other' : 'moldea',
    exitCode,
    outputEvidence: {
      byteCount: fact === null ? (exitCode === 0 ? 12 : 24) : 24,
      disposition: fact === null ? 'unrecognized' : 'projected',
      facts: fact === null ? [] : [fact],
    },
    status: exitCode === 0 ? 'completed' : 'failed',
    type: 'command_execution',
  },
});

const createRawTrial = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const actorExecutionEvidence = overrides['actorExecutionEvidence'] ?? [];
  const completedCommandCount = Array.isArray(actorExecutionEvidence)
    ? actorExecutionEvidence.length
    : 0;
  const moldeaCommands = Array.isArray(actorExecutionEvidence)
    ? (
        actorExecutionEvidence as Array<{
          item?: {
            commandKind?: string;
            outputEvidence?: { byteCount?: number; facts?: Array<{ command?: string }> };
          };
        }>
      ).filter(({ item }) => item?.commandKind === 'moldea')
    : [];
  const moldeaOutputByteCounts = moldeaCommands.map(
    ({ item }) => item?.outputEvidence?.byteCount ?? 0,
  );
  const moldeaOutputByteCount = moldeaOutputByteCounts.reduce((total, count) => total + count, 0);

  return {
    actorCommandPolicyEvidence: createCommandPolicyEvidence(completedCommandCount),
    actorExecutionEvidence,
    actorResourceEvidence: {
      commandCount: moldeaCommands.length,
      maximumInvocationByteCount: Math.max(0, ...moldeaOutputByteCounts),
      modelVisibleToolOutputByteCount: moldeaOutputByteCount,
      operations: moldeaCommands.map(
        ({ item }) => item?.outputEvidence?.facts?.[0]?.command ?? 'unrecognized',
      ),
      stdoutByteCount: moldeaOutputByteCount,
    },
    actorHost: HOST,
    actorResponse: 'I completed the requested change and verified the result.',
    caseDefinitionDigest: CASE_DEFINITION_DIGEST,
    caseId: CASE_DEFINITION.id,
    evaluatedAt: '2026-08-28T12:00:00.000Z',
    forbidden: [],
    id: CASE_DEFINITION.id,
    judgeHost: HOST,
    observed: ['finished'],
    passed: true,
    rationale: 'The recorded result satisfies the required behavior.',
    scenarioEvidence: [
      {
        observation: {
          content: CASE_DEFINITION.input.developerDirection,
          type: 'developer-direction',
        },
        source: { kind: 'developer-direction' },
      },
    ],
    workspaceChanges: { created: [], deleted: [], modified: [] },
    ...overrides,
  };
};

const createTrialSummary = (
  trial: ISemanticReplayCandidate['results'][number],
  kind: 'confirmation' | 'initial' = 'initial',
  confirmationIndex: 1 | 2 | null = null,
): ISemanticAttemptRecord['cases'][number]['trials'][number] => ({
  actorCommandPolicyEvidence: trial.actorCommandPolicyEvidence,
  actorResourceEvidence: trial.actorResourceEvidence,
  actorHost: trial.actorHost,
  confirmationIndex,
  evaluatedAt: trial.evaluatedAt,
  forbidden: trial.forbidden,
  judgeHost: trial.judgeHost,
  kind,
  observed: trial.observed,
  passed: trial.passed,
  rationale: trial.rationale,
});

const createAttemptCase = (
  candidate: ISemanticReplayCandidate,
): ISemanticAttemptRecord['cases'][number] => {
  const initial = candidate.results[0];
  if (initial === undefined) throw new Error('The replay test requires an initial trial.');

  return {
    confirmationStatus: candidate.confirmations.length === 0 ? 'not-required' : 'passed',
    id: CASE_DEFINITION.id,
    status: candidate.confirmations.length === 0 ? 'passed' : 'recovered',
    trials: [
      createTrialSummary(initial),
      ...candidate.confirmations.map((confirmation) =>
        createTrialSummary(confirmation, 'confirmation', confirmation.confirmationIndex),
      ),
    ],
  };
};

const parseCandidate = (
  initial: Record<string, unknown>,
  confirmations: Record<string, unknown>[] = [],
): ISemanticReplayCandidate =>
  SemanticReplayCandidateSchema.parse({
    confirmations,
    evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
    results: [initial],
    schemaVersion: 6,
  });

describe('createSemanticEvaluationReplay', () => {
  test('preserves messages, accounts for commands, and exposes path-only workspace changes', () => {
    const candidate = parseCandidate(
      createRawTrial({
        actorExecutionEvidence: [
          createCommand(0, null),
          createCommand(0, null),
          createCommand(0, {
            cliVersion: '6.0.0',
            command: 'validate',
            containsContent: false,
            errorPresent: false,
            hasNextPage: false,
            kind: 'moldea-cli-envelope',
            pageRecordCount: 1,
            relevant: null,
            resultPresent: true,
            schemaVersion: 3,
            status: 'valid',
          }),
          createCommand(7, null),
          createCommand(0, null),
        ],
        workspaceChanges: {
          created: [
            {
              path: 'src/agent.ts',
              state: {
                content: 'secret created content',
                mode: 33_204,
                omission: null,
                sha256: 'a'.repeat(64),
                type: 'file',
              },
            },
          ],
          deleted: [
            {
              path: 'legacy/current',
              state: { mode: 41_420, target: '../old', type: 'symlink' },
            },
          ],
          modified: [
            {
              after: {
                content: 'secret modified content',
                mode: 33_204,
                omission: null,
                sha256: 'b'.repeat(64),
                type: 'file',
              },
              before: {
                content: 'secret original content',
                mode: 33_204,
                omission: null,
                sha256: 'c'.repeat(64),
                type: 'file',
              },
              path: 'README.md',
            },
          ],
        },
      }),
    );
    const projection = createSemanticEvaluationReplay(
      CASE_DEFINITION,
      createAttemptCase(candidate),
      candidate,
    );
    const replay = projection.replay;
    const commandSteps = replay.trials[0]?.steps.filter(({ kind }) => kind === 'command');

    expect(commandSteps).toMatchObject([
      { commandCount: 2, isAggregate: true, status: 'passed' },
      { commandCount: 1, operation: 'moldea validate', status: 'passed' },
      { commandCount: 1, exitCode: 7, operation: 'Recorded command', status: 'failed' },
      { commandCount: 1, isAggregate: true, status: 'passed' },
    ]);
    expect(replay.trials[0]?.steps[0]).toStrictEqual({
      content: CASE_DEFINITION.input.developerDirection,
      kind: 'message',
      role: 'developer',
      source: 'recorded',
    });
    expect(projection.caseDefinitionDigest).toBe(CASE_DEFINITION_DIGEST);
    expect(projection.developerDirection).toBe(CASE_DEFINITION.input.developerDirection);
    expect(replay.trials[0]?.steps.at(-2)).toMatchObject({
      content: 'I completed the requested change and verified the result.',
      role: 'coding-agent',
    });
    expect(JSON.stringify(replay)).not.toContain('secret');
    expect(JSON.stringify(replay)).not.toContain('sha256');
    expect(JSON.stringify(replay)).not.toContain('../old');
    expect(replay.trials[0]?.steps.find(({ kind }) => kind === 'workspace')).toMatchObject({
      groups: [
        { changes: [{ path: 'src/agent.ts', type: 'file' }], status: 'created' },
        { changes: [{ path: 'README.md', type: 'file' }], status: 'modified' },
        { changes: [{ path: 'legacy/current', type: 'symlink' }], status: 'deleted' },
      ],
      kind: 'workspace',
    });
  });

  test('keeps the initial failure and confirmations in immutable order', () => {
    const candidate = parseCandidate(
      createRawTrial({
        actorResponse: 'The initial attempt failed.',
        observed: [],
        passed: false,
        rationale: 'The initial requirement was not satisfied.',
      }),
      [
        createRawTrial({ confirmationIndex: 1 }),
        createRawTrial({
          confirmationIndex: 2,
          evaluatedAt: '2026-08-28T12:05:00.000Z',
        }),
      ],
    );

    const replay = createSemanticEvaluationReplay(
      CASE_DEFINITION,
      createAttemptCase(candidate),
      candidate,
    ).replay;

    expect(replay.trials.map(({ id, title }) => ({ id, title }))).toStrictEqual([
      { id: 'initial', title: 'Initial trial' },
      { id: 'confirmation-1', title: 'Confirmation 1' },
      { id: 'confirmation-2', title: 'Confirmation 2' },
    ]);
    expect(replay.trials[0]?.steps.at(-1)).toStrictEqual({
      kind: 'verdict',
      rationale: 'The initial requirement was not satisfied.',
      role: 'independent-judge',
      source: 'recorded',
      status: 'failed',
    });
  });

  test('uses the digest-matched definition when scenario evidence omits developer direction', () => {
    const candidate = parseCandidate(
      createRawTrial({
        caseDefinitionDigest: createSemanticCaseDefinitionDigest(CASE_DEFINITION),
        scenarioEvidence: [],
      }),
    );

    const projection = createSemanticEvaluationReplay(
      CASE_DEFINITION,
      createAttemptCase(candidate),
      candidate,
    );

    expect(projection.developerDirection).toBe(CASE_DEFINITION.input.developerDirection);
    expect(projection.replay.trials[0]?.steps[0]).toStrictEqual({
      content: CASE_DEFINITION.input.developerDirection,
      kind: 'message',
      role: 'developer',
      source: 'recorded',
    });
  });

  test('discloses when recorded evidence did not retain developer direction', () => {
    const candidate = parseCandidate(createRawTrial({ scenarioEvidence: [] }));

    const projection = createSemanticEvaluationReplay(
      null,
      createAttemptCase(candidate),
      candidate,
    );

    expect(projection.developerDirection).toBeNull();
    expect(projection.replay.trials[0]?.steps[0]).toStrictEqual({
      content: 'The exact developer direction was not retained in this recorded artifact.',
      kind: 'message',
      role: 'developer',
      source: 'derived',
    });
  });

  test.each([
    ['missing', createRawTrial({ actorCommandPolicyEvidence: createCommandPolicyEvidence(1) })],
    [
      'excess',
      createRawTrial({
        actorCommandPolicyEvidence: createCommandPolicyEvidence(0),
        actorExecutionEvidence: [createCommand(0, null)],
      }),
    ],
  ])(
    'createSemanticEvaluationReplay(%s command evidence) -> rejects the count mismatch',
    (_description, rawTrial) => {
      const candidate = parseCandidate(rawTrial);

      expect(() =>
        createSemanticEvaluationReplay(CASE_DEFINITION, createAttemptCase(candidate), candidate),
      ).toThrow('contradicts the completed command count for trial 1');
    },
  );

  test('rejects summary contradictions and duplicate workspace membership', () => {
    const candidate = parseCandidate(createRawTrial());
    const attemptCase = createAttemptCase(candidate);
    attemptCase.trials[0] = { ...attemptCase.trials[0]!, rationale: 'A different rationale.' };
    expect(() => createSemanticEvaluationReplay(CASE_DEFINITION, attemptCase, candidate)).toThrow(
      'contradicts trial 1',
    );

    const duplicateWorkspaceCandidate = parseCandidate(
      createRawTrial({
        workspaceChanges: {
          created: [{ path: 'src/agent.ts', state: { type: 'file' } }],
          deleted: [{ path: 'src/agent.ts', state: { type: 'file' } }],
          modified: [],
        },
      }),
    );
    expect(() =>
      createSemanticEvaluationReplay(
        CASE_DEFINITION,
        createAttemptCase(duplicateWorkspaceCandidate),
        duplicateWorkspaceCandidate,
      ),
    ).toThrow('changed twice');

    const invalidConfirmationCandidate = parseCandidate(
      createRawTrial({ observed: [], passed: false }),
      [createRawTrial({ confirmationIndex: 1 }), createRawTrial({ confirmationIndex: 2 })],
    );
    const invalidConfirmationAttemptCase = createAttemptCase(invalidConfirmationCandidate);
    invalidConfirmationCandidate.confirmations[0]!.caseId = 'different-case';
    expect(() =>
      createSemanticEvaluationReplay(
        CASE_DEFINITION,
        invalidConfirmationAttemptCase,
        invalidConfirmationCandidate,
      ),
    ).toThrow('invalid confirmation sequence');

    const changedDefinitionCandidate = parseCandidate(createRawTrial({ passed: false }), [
      createRawTrial({ caseDefinitionDigest: 'b'.repeat(64), confirmationIndex: 1 }),
    ]);
    expect(() =>
      createSemanticEvaluationReplay(
        CASE_DEFINITION,
        createAttemptCase(changedDefinitionCandidate),
        changedDefinitionCandidate,
      ),
    ).toThrow('contradicts its recorded definition');

    expect(() =>
      parseCandidate(
        createRawTrial({
          scenarioEvidence: [
            {
              observation: { content: '', type: 'developer-direction' },
              source: { kind: 'developer-direction' },
            },
          ],
        }),
      ),
    ).toThrow('invalid recorded developer direction');
  });
});
