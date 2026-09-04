import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildActorPrompt,
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

test('extracts final response and zero moldea consumption from host JSONL', () => {
  const output = `${JSON.stringify({
    type: 'item.completed',
    item: { type: 'agent_message', text: 'No findings.' },
  })}\n`;
  const result = parseSemanticEvaluationHostOutput(output, {
    cliVersion: '6.0.0',
    jsonSchemaVersion: 3,
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
