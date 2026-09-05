import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildActorPrompt,
  buildJudgePrompt,
  createSemanticEvaluationCostEstimate,
  parseSemanticEvaluationArguments,
  parseSemanticEvaluationHostOutput,
} from './semantic-evaluation-runner.mjs';

const CASE = {
  id: 'unrelated-review',
  scenario: 'An unrelated review must not activate moldea.',
  operation: 'unrelated-review',
  input: {
    developerDirection: 'Review docs/example.md.',
    repositoryEvidence: [
      {
        claim: 'The file exists.',
        source: { kind: 'workspace-path', path: 'docs/example.md', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [{ label: 'abstain', criterion: 'The actor does not activate moldea.' }],
  forbidden: [{ label: 'activate', criterion: 'The actor activates moldea.' }],
};

test('parses a diagnostic case selection without authorizing recording', () => {
  assert.deepEqual(parseSemanticEvaluationArguments(['--case', 'unrelated-review']), {
    isPreflightRequested: false,
    isRecordCheckpointRequested: false,
    isRecordRequested: false,
    isRestartRequested: false,
    isVerifyAttemptsRequested: false,
    requestedCaseId: 'unrelated-review',
  });
  assert.throws(() => parseSemanticEvaluationArguments(['--case', 'unrelated-review', '--record']));
});

test('keeps evaluator criteria out of the actor prompt', () => {
  assert.equal(buildActorPrompt(CASE), 'Review docs/example.md.');
});

test('keeps runner-enforced moldea budgets outside semantic judgment', () => {
  const prompt = buildJudgePrompt(
    CASE,
    'No findings.',
    { created: [], deleted: [], modified: [] },
    [],
    [],
    null,
    { completedCommandCount: 128 },
    {
      commandCount: 0,
      maximumInvocationByteCount: 0,
      modelVisibleToolOutputByteCount: 0,
      operations: [],
      stdoutByteCount: 0,
    },
  );

  assert.match(
    prompt,
    /runner independently proved\s+that the declared moldea activation order and resource budget passed/u,
  );
  assert.match(prompt, /Do not compare the total\s+completed-command count/u);
  assert.match(prompt, /Judge only the remaining semantic\s+clauses/u);
});

test('reports the complete bounded semantic paid-execution envelope', () => {
  assert.deepEqual(createSemanticEvaluationCostEstimate(18), {
    caseCount: 18,
    initialCallCount: 36,
    maximumCallCount: 216,
    maximumTokenCount: 226_492_416,
    maximumTokensPerCall: 1_048_576,
    model: 'gpt-5.6-sol',
    plannedCallCount: 108,
    reasoningEffort: 'medium',
  });
});

test('extracts final response and zero moldea consumption from host JSONL', () => {
  const output = `${JSON.stringify({
    type: 'item.completed',
    item: { type: 'agent_message', text: 'No findings.' },
  })}\n`;
  const result = parseSemanticEvaluationHostOutput(output, {
    cliVersion: '7.0.0',
    jsonSchemaVersion: 4,
  });
  assert.equal(result.response, 'No findings.');
  assert.deepEqual(result.actorResourceEvidence, {
    commandCount: 0,
    maximumInvocationByteCount: 0,
    modelVisibleToolOutputByteCount: 0,
    operations: [],
    stdoutByteCount: 0,
  });
});
