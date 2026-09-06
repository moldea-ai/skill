import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assessJudgeOutput,
  buildActorPrompt,
  buildJudgePrompt,
  createSemanticDiagnosticOutput,
  createSemanticEvaluationCostEstimate,
  parseSemanticEvaluationArguments,
  parseSemanticEvaluationHostOutput,
  SEMANTIC_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT,
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
        source: {
          kind: 'workspace-path',
          path: 'docs/example.md',
          expectedType: 'file',
        },
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

test('requires an explicit semantic model-execution mode', () => {
  assert.throws(() => parseSemanticEvaluationArguments([]), /requires --record or --case <id>/u);
  assert.deepEqual(parseSemanticEvaluationArguments(['--record']), {
    isPreflightRequested: false,
    isRecordCheckpointRequested: false,
    isRecordRequested: true,
    isRestartRequested: false,
    isVerifyAttemptsRequested: false,
    requestedCaseId: undefined,
  });
  assert.deepEqual(parseSemanticEvaluationArguments(['--record', '--restart']), {
    isPreflightRequested: false,
    isRecordCheckpointRequested: false,
    isRecordRequested: true,
    isRestartRequested: true,
    isVerifyAttemptsRequested: false,
    requestedCaseId: undefined,
  });
});

test('parses one diagnostic case without authorizing recording', () => {
  assert.deepEqual(parseSemanticEvaluationArguments(['--case', 'unrelated-review']), {
    isPreflightRequested: false,
    isRecordCheckpointRequested: false,
    isRecordRequested: false,
    isRestartRequested: false,
    isVerifyAttemptsRequested: false,
    requestedCaseId: 'unrelated-review',
  });
  assert.throws(() => parseSemanticEvaluationArguments(['--case', 'unrelated-review', '--record']));
  assert.throws(() =>
    parseSemanticEvaluationArguments(['--case', 'unrelated-review', '--case', 'other-case']),
  );
});

test('creates one bounded content-free semantic diagnostic', () => {
  const diagnostic = JSON.parse(
    createSemanticDiagnosticOutput({
      actorCommandPolicyEvidence: { completedCommandCount: 3 },
      actorExecutionEvidence: [{ command: 'secret command' }],
      actorResourceEvidence: {
        commandCount: 1,
        maximumInvocationByteCount: 128,
        modelVisibleToolOutputByteCount: 128,
        operations: ['validate'],
        stdoutByteCount: 128,
      },
      actorResponse: 'private actor output',
      actorUsage: {
        cachedInputTokens: 5,
        inputTokens: 13,
        outputTokens: 8,
        private: 'actor token body',
      },
      forbidden: ['forbidden-behavior'],
      id: 'bounded-diagnostic',
      judgeUsage: {
        cachedInputTokens: 3,
        inputTokens: 8,
        outputTokens: 5,
        private: 'judge token body',
      },
      observed: ['expected-behavior'],
      passed: false,
      rationale: 'The expected behavior was not demonstrated.',
      repositoryControlEvidence: { private: 'repository body' },
      scenarioEvidence: [{ private: 'scenario body' }],
      workspaceChanges: { private: 'workspace body' },
    }),
  );

  assert.deepEqual(diagnostic, {
    schemaVersion: 1,
    evaluationProtocolVersion: 23,
    caseId: 'bounded-diagnostic',
    verdict: 'failed',
    criteria: {
      observed: ['expected-behavior'],
      forbidden: ['forbidden-behavior'],
    },
    rationale: 'The expected behavior was not demonstrated.',
    rationaleTruncated: false,
    resources: {
      actorCommands: { completedCommandCount: 3 },
      moldea: {
        commandCount: 1,
        maximumInvocationByteCount: 128,
        modelVisibleToolOutputByteCount: 128,
        operations: ['validate'],
        stdoutByteCount: 128,
      },
      modelTokens: {
        actor: { cachedInputTokens: 5, inputTokens: 13, outputTokens: 8 },
        judge: { cachedInputTokens: 3, inputTokens: 8, outputTokens: 5 },
      },
    },
  });
  assert.doesNotMatch(
    JSON.stringify(diagnostic),
    /private actor output|secret command|repository body|scenario body|workspace body|token body/u,
  );
});

test('truncates only semantic rationale on UTF-8 code-point boundaries', () => {
  const observed = Array.from({ length: 64 }, (_, index) => `expected-${index}`);
  const forbidden = Array.from({ length: 64 }, (_, index) => `forbidden-${index}`);
  const output = createSemanticDiagnosticOutput({
    actorCommandPolicyEvidence: { completedCommandCount: 64 },
    actorResourceEvidence: {
      commandCount: 1,
      maximumInvocationByteCount: 65_536,
      modelVisibleToolOutputByteCount: 65_536,
      operations: ['validate'],
      stdoutByteCount: 65_536,
    },
    actorUsage: {
      cachedInputTokens: 512,
      inputTokens: 1_024,
      outputTokens: 256,
    },
    forbidden,
    id: 'large-multibyte-rationale',
    judgeUsage: { cachedInputTokens: 256, inputTokens: 512, outputTokens: 128 },
    observed,
    passed: true,
    rationale: 'évidence-🙂-'.repeat(16_384),
  });
  const diagnostic = JSON.parse(output);
  const outputByteCount = Buffer.byteLength(output, 'utf8');

  assert.ok(outputByteCount <= SEMANTIC_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT);
  assert.ok(SEMANTIC_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT - outputByteCount < 4);
  assert.equal(diagnostic.rationaleTruncated, true);
  assert.equal(diagnostic.verdict, 'passed');
  assert.deepEqual(diagnostic.criteria.observed, observed);
  assert.deepEqual(diagnostic.criteria.forbidden, forbidden);
  assert.ok(diagnostic.rationale.length > 0);
  assert.doesNotMatch(diagnostic.rationale, /\uFFFD/u);
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
    /runner independently evaluated\s+the\s+declared moldea activation order and resource budget/u,
  );
  assert.match(prompt, /deterministic result is\s+passed/u);
  assert.match(prompt, /Do not compare the total\s+completed-command count/u);
  assert.match(prompt, /Judge only the remaining semantic\s+clauses/u);
  assert.match(prompt, /spell the human-facing product name as lowercase `moldea`/u);
  assert.match(
    prompt,
    /commandKind `moldea`[\s\S]+fixed portable launcher[\s\S]+repository-bound CLI execution/u,
  );
});

test('passes case-budget misses to semantic judgment as a deterministic failure', () => {
  const prompt = buildJudgePrompt(
    CASE,
    'No findings.',
    { created: [], deleted: [], modified: [] },
    [],
    [],
    null,
    { completedCommandCount: 1 },
    {
      commandCount: 1,
      maximumInvocationByteCount: 512,
      modelVisibleToolOutputByteCount: 512,
      operations: ['validate'],
      stdoutByteCount: 512,
    },
  );

  assert.match(prompt, /deterministic result is\s+did not pass/u);
});

test('prevents a green judge result from carrying incorrect product casing', () => {
  const output = JSON.stringify({
    observed: ['abstain'],
    forbidden: [],
    rationale: 'The actor kept moldea inactive.',
  });

  assert.deepEqual(assessJudgeOutput(CASE, output, 'Moldea remained inactive.'), {
    forbidden: ['incorrect-moldea-product-name-casing'],
    isPassed: false,
    observed: ['abstain'],
    rationale: 'The actor kept moldea inactive.',
  });
  assert.deepEqual(assessJudgeOutput(CASE, output, 'moldea remained inactive.'), {
    forbidden: [],
    isPassed: true,
    observed: ['abstain'],
    rationale: 'The actor kept moldea inactive.',
  });
  assert.deepEqual(
    assessJudgeOutput(
      CASE,
      JSON.stringify({
        observed: ['abstain'],
        forbidden: [],
        rationale: 'The actor kept Moldea inactive.',
      }),
      'moldea remained inactive.',
    ),
    {
      forbidden: ['incorrect-moldea-product-name-casing'],
      isPassed: false,
      observed: ['abstain'],
      rationale: 'The actor kept Moldea inactive.',
    },
  );
});

test('reports safe resource aggregates when malformed judge input is rejected', () => {
  assert.throws(
    () =>
      buildJudgePrompt(
        CASE,
        'No findings.',
        { created: [], deleted: [], modified: [] },
        [],
        [],
        null,
        { completedCommandCount: 1 },
        {
          commandCount: 1,
          maximumInvocationByteCount: 512,
          modelVisibleToolOutputByteCount: 512,
          operations: [],
          stdoutByteCount: 512,
        },
      ),
    /valid bounded moldea resource evidence: \{"commandCount":1,"maximumInvocationByteCount":512,"modelVisibleToolOutputByteCount":512,"operations":\[\],"stdoutByteCount":512\}/u,
  );
});

test('reports the clean 74-case paid execution boundary without reusable predecessors', () => {
  assert.deepEqual(createSemanticEvaluationCostEstimate(74), {
    absoluteTokenContainmentLimit: 1_862_270_976,
    absoluteTokensPerInvocation: 2_097_152,
    caseCount: 74,
    confirmationInclusivePaidStageLimit: 444,
    initialStageCount: 148,
    model: 'gpt-5.6-sol',
    operationalRetryInclusiveInvocationLimit: 888,
    paidInitialStageCount: 148,
    reasoningEffort: 'medium',
    reusedCaseCount: 0,
    reusedStageCount: 0,
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
