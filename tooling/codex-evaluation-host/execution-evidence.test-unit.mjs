// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import { projectCodexEvaluationExecutionEvidence } from './execution-evidence.mjs';

const createCommandEvent = (command, aggregatedOutput = '', overrides = {}) =>
  JSON.stringify({
    type: 'item.completed',
    item: {
      type: 'command_execution',
      command,
      aggregated_output: aggregatedOutput,
      exit_code: 0,
      status: 'completed',
      ...overrides,
    },
  });

test('execution evidence projects local command facts without retaining commands or output', () => {
  const result = projectCodexEvaluationExecutionEvidence(
    `${createCommandEvent('git status --short', ' M README.md\n')}\n` +
      `${JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 5, output_tokens: 3 } })}\n`,
  );

  assert.deepEqual(result.commandPolicy, {
    completedCommandCount: 1,
    credentialExposure: { status: 'not-observed', observedCount: 0 },
    networkAccess: { status: 'not-observed', observedCount: 0, indeterminateCount: 0 },
    sensitiveAccess: { status: 'not-observed', observedCount: 0, indeterminateCount: 0 },
  });
  assert.deepEqual(result.usage, { inputTokens: 5, cachedInputTokens: 0, outputTokens: 3 });
  assert.deepEqual(JSON.parse(result.projectedEvents.trim()), {
    eventType: 'command.completed',
    exitCode: 0,
    outputByteCount: 13,
    status: 'completed',
  });
  assert.doesNotMatch(result.projectedEvents, /git status|README/u);
});

test('execution evidence fails closed for network, sensitive, and opaque commands', () => {
  const result = projectCodexEvaluationExecutionEvidence(
    [
      createCommandEvent('curl https://api.openai.com'),
      createCommandEvent("cat '/home/evaluator/.codex/auth.json'", 'sk-exampletoken1234567890'),
      createCommandEvent('node scripts/check.mjs'),
    ].join('\n'),
  );

  assert.deepEqual(result.commandPolicy, {
    completedCommandCount: 3,
    credentialExposure: { status: 'observed', observedCount: 1 },
    networkAccess: { status: 'observed', observedCount: 1, indeterminateCount: 1 },
    sensitiveAccess: { status: 'observed', observedCount: 1, indeterminateCount: 1 },
  });
});

test('execution evidence detects credentials outside command output without retaining them', () => {
  const credential = 'github_pat_exampletoken12345678901234567890';
  const result = projectCodexEvaluationExecutionEvidence(
    `${JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: credential } })}\n`,
  );

  assert.deepEqual(result.commandPolicy.credentialExposure, {
    status: 'observed',
    observedCount: 1,
  });
  assert.equal(result.projectedEvents, '');
  assert.doesNotMatch(JSON.stringify(result), /github_pat_/u);
});

test('execution evidence rejects malformed and incomplete completed-command events', () => {
  assert.throws(() => projectCodexEvaluationExecutionEvidence('{not-json}\n'), /malformed JSONL/u);
  assert.throws(
    () =>
      projectCodexEvaluationExecutionEvidence(
        `${JSON.stringify({ type: 'item.completed', item: { type: 'command_execution' } })}\n`,
      ),
    /unsupported shape/u,
  );
});

test('execution evidence accepts a fixed Bash wrapper without exposing it', () => {
  const result = projectCodexEvaluationExecutionEvidence(
    `${createCommandEvent("/bin/bash -lc 'moldea inspect --json'")}\n`,
  );

  assert.equal(result.commandPolicy.networkAccess.status, 'not-observed');
  assert.equal(result.commandPolicy.sensitiveAccess.status, 'not-observed');
  assert.doesNotMatch(result.projectedEvents, /moldea/u);
});
