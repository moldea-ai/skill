import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  assessJudgeOutput,
  assertSemanticCandidatePaidStageCapacity,
  buildActorPrompt,
  buildJudgePrompt,
  createSemanticDiagnosticBatchOutput,
  createSemanticDiagnosticBatchRecord,
  createSemanticDiagnosticOutput,
  createSemanticEvaluationCostEstimate,
  getNextSemanticTrial,
  getSemanticCandidatePaidTokenCount,
  parseSemanticEvaluationArguments,
  parseSemanticEvaluationHostOutput,
  readSemanticDiagnosticState,
  resolveSemanticDiagnosticCaseDefinitions,
  runSemanticCaseTrial,
  SEMANTIC_CANDIDATE_MAXIMUM_PAID_TOKEN_COUNT,
  SEMANTIC_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT,
  SEMANTIC_DIAGNOSTIC_RATIONALE_MAXIMUM_BYTE_COUNT,
  SEMANTIC_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT,
  SEMANTIC_DIAGNOSTIC_SUMMARY_MAXIMUM_BYTE_COUNT,
  writeSemanticDiagnosticCheckpoint,
  writeSemanticDiagnosticLedger,
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
  assert.throws(
    () => parseSemanticEvaluationArguments([]),
    /requires --record, --case <id>, or --diagnose-batch/u,
  );
  assert.deepEqual(parseSemanticEvaluationArguments(['--record']), {
    diagnosticBatchSelector: null,
    isDiagnoseBatchRequested: false,
    isPreflightRequested: false,
    isRecordCheckpointRequested: false,
    isRecordRequested: true,
    isRestartRequested: false,
    isVerifyAttemptsRequested: false,
    requestedCaseId: undefined,
  });
  assert.deepEqual(parseSemanticEvaluationArguments(['--record', '--restart']), {
    diagnosticBatchSelector: null,
    isDiagnoseBatchRequested: false,
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
    diagnosticBatchSelector: null,
    isDiagnoseBatchRequested: false,
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

test('parses one exact diagnostic batch selector', () => {
  assert.deepEqual(parseSemanticEvaluationArguments(['--diagnose-batch', '--all']), {
    diagnosticBatchSelector: { kind: 'all', value: null },
    isDiagnoseBatchRequested: true,
    isPreflightRequested: false,
    isRecordCheckpointRequested: false,
    isRecordRequested: false,
    isRestartRequested: false,
    isVerifyAttemptsRequested: false,
    requestedCaseId: undefined,
  });
  assert.deepEqual(
    parseSemanticEvaluationArguments([
      '--diagnose-batch',
      '--claims',
      'activation-abstention,bounded-relevance',
      '--restart',
    ]).diagnosticBatchSelector,
    { kind: 'claims', value: 'activation-abstention,bounded-relevance' },
  );
  assert.throws(
    () => parseSemanticEvaluationArguments(['--diagnose-batch']),
    /exactly one diagnostic selector/u,
  );
  assert.throws(() =>
    parseSemanticEvaluationArguments(['--diagnose-batch', '--all', '--cases', 'one']),
  );
  assert.throws(() => parseSemanticEvaluationArguments(['--cases', 'one']));
  assert.throws(() => parseSemanticEvaluationArguments(['--diagnose-batch', '--cases', 'one,one']));
});

test('resolves explicit and coverage-claim diagnostic selections deterministically', () => {
  const caseDefinitions = [{ id: 'one' }, { id: 'two' }, { id: 'three' }];
  const coverage = {
    claims: [
      {
        id: 'second-and-first',
        evidence: [
          { kind: 'semantic-case', id: 'two' },
          { kind: 'semantic-case', id: 'one' },
        ],
      },
    ],
  };
  assert.deepEqual(
    resolveSemanticDiagnosticCaseDefinitions({
      caseDefinitions,
      coverage,
      selector: { kind: 'cases', value: 'three,one' },
    }).map(({ id }) => id),
    ['three', 'one'],
  );
  assert.deepEqual(
    resolveSemanticDiagnosticCaseDefinitions({
      caseDefinitions,
      coverage,
      selector: { kind: 'claims', value: 'second-and-first' },
    }).map(({ id }) => id),
    ['one', 'two'],
  );
  assert.throws(() =>
    resolveSemanticDiagnosticCaseDefinitions({
      caseDefinitions,
      coverage,
      selector: { kind: 'cases', value: 'missing' },
    }),
  );
  assert.deepEqual(
    resolveSemanticDiagnosticCaseDefinitions({
      caseDefinitions,
      coverage,
      selector: { kind: 'unresolved-from', value: 'semantic-attempt' },
      unresolvedEvidence: {
        confirmations: [],
        results: [
          { id: 'one', passed: true },
          { id: 'two', passed: false },
        ],
      },
    }).map(({ id }) => id),
    ['two', 'three'],
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

test('projects bounded batch records and a compact all-case summary', () => {
  const record = createSemanticDiagnosticBatchRecord({
    actorCommandPolicyEvidence: { completedCommandCount: 3 },
    actorExecutionEvidence: [{ command: 'private command' }],
    actorResourceEvidence: {
      commandCount: 1,
      maximumInvocationByteCount: 128,
      modelVisibleToolOutputByteCount: 128,
      operations: ['validate'],
      stdoutByteCount: 128,
    },
    actorResponse: 'private actor output',
    actorUsage: { cachedInputTokens: 5, inputTokens: 13, outputTokens: 8 },
    forbidden: ['forbidden-behavior'],
    id: 'bounded-diagnostic',
    judgeUsage: { cachedInputTokens: 3, inputTokens: 8, outputTokens: 5 },
    observed: ['expected-behavior'],
    operationalRetries: {
      actorFailureCount: 1,
      judgeFailureCount: 0,
      lastFailure: {
        category: 'timed-out',
        failedAt: '2026-09-07T12:00:00.000Z',
        retryDelayMs: 1_000,
        stage: 'actor',
      },
    },
    passed: false,
    rationale: '🙂'.repeat(8_192),
    repositoryControlEvidence: { private: 'repository body' },
    scenarioEvidence: [{ private: 'scenario body' }],
    workspaceChanges: { private: 'workspace body' },
  });
  assert.equal(
    record.rationale,
    'The case failed because at least one forbidden criterion was triggered.',
  );
  assert.ok(
    Buffer.byteLength(record.rationale, 'utf8') <= SEMANTIC_DIAGNOSTIC_RATIONALE_MAXIMUM_BYTE_COUNT,
  );
  assert.equal(record.rationaleRedacted, true);
  assert.equal(record.rationaleTruncated, false);
  assert.deepEqual(record.resources.operationalFailures, {
    actor: 1,
    judge: 0,
  });
  assert.doesNotMatch(
    JSON.stringify(record),
    /private actor output|private command|repository body|scenario body|workspace body|🙂/u,
  );

  const results = Array.from({ length: 74 }, (_, index) => ({
    ...record,
    caseId: `case-${index}`,
    rationale: '',
    verdict: index % 2 === 0 ? 'passed' : 'failed',
  }));
  const output = createSemanticDiagnosticBatchOutput({
    identitySha256: 'a'.repeat(64),
    results,
    selection: { caseIds: results.map(({ caseId }) => caseId) },
  });
  const summary = JSON.parse(output);
  assert.equal(summary.selectedCount, 74);
  assert.equal(summary.passedCount, 37);
  assert.equal(summary.failedCount, 37);
  assert.ok(Buffer.byteLength(output, 'utf8') <= SEMANTIC_DIAGNOSTIC_SUMMARY_MAXIMUM_BYTE_COUNT);
  assert.equal(summary.results.length, 74);
  assert.equal(summary.results[0].rationale, undefined);
});

test('enforces each diagnostic state ceiling before writing oversized bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-diagnostic-limit-'));
  const checkpointPath = join(root, 'checkpoint.json');
  const ledgerPath = join(root, 'ledger.json');
  const smallState = { state: 'bounded' };
  const oversizedState = {
    state: 'x'.repeat(SEMANTIC_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT),
  };

  try {
    await writeSemanticDiagnosticCheckpoint(smallState, checkpointPath);
    await writeSemanticDiagnosticLedger(smallState, ledgerPath);
    assert.deepEqual(JSON.parse(await readFile(checkpointPath, 'utf8')), smallState);
    assert.deepEqual(JSON.parse(await readFile(ledgerPath, 'utf8')), smallState);
    await assert.rejects(
      writeSemanticDiagnosticCheckpoint(oversizedState, checkpointPath),
      /limit is 1048576 bytes/u,
    );
    await assert.rejects(
      writeSemanticDiagnosticLedger(oversizedState, ledgerPath),
      /limit is 1048576 bytes/u,
    );
    assert.deepEqual(JSON.parse(await readFile(checkpointPath, 'utf8')), smallState);
    assert.deepEqual(JSON.parse(await readFile(ledgerPath, 'utf8')), smallState);
    await writeFile(checkpointPath, Buffer.alloc(SEMANTIC_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT + 1));
    await assert.rejects(
      readSemanticDiagnosticState(checkpointPath),
      /not one bounded regular file/u,
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('stops before the judge when private actor evidence exceeds the checkpoint ceiling', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-diagnostic-actor-limit-'));
  const checkpointPath = join(root, 'checkpoint.json');
  let actorCallCount = 0;
  let judgeCallCount = 0;

  try {
    await assert.rejects(
      runSemanticCaseTrial({
        activeTrial: null,
        actorCommand: ['codex'],
        caseDefinition: CASE,
        cli: { jsonSchemaVersion: 4, version: '7.0.0' },
        evaluateActor: async () => {
          actorCallCount += 1;
          return { response: 'private actor output' };
        },
        evaluateJudge: async () => {
          judgeCallCount += 1;
          return { id: CASE.id, passed: true };
        },
        judgeCommand: ['codex'],
        persistActiveTrial: async (activeTrial) =>
          writeSemanticDiagnosticCheckpoint(
            activeTrial.phase === 'judge-pending'
              ? {
                  activeTrial,
                  padding: 'x'.repeat(SEMANTIC_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT),
                }
              : { activeTrial },
            checkpointPath,
          ),
        runOperationalStage: async ({ operation }) => operation(),
        writeStatus: () => {},
      }),
      /limit is 1048576 bytes/u,
    );
    assert.equal(actorCallCount, 1);
    assert.equal(judgeCallCount, 0);
    assert.equal(
      JSON.parse(await readFile(checkpointPath, 'utf8')).activeTrial.phase,
      'actor-pending',
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('selects every missing initial before any confirmation', () => {
  const caseDefinitions = [{ id: 'failed-first' }, { id: 'pending-second' }];
  const candidate = {
    activeTrial: null,
    confirmations: [],
    results: [{ id: 'failed-first', passed: false }],
  };
  assert.deepEqual(getNextSemanticTrial(candidate, caseDefinitions), {
    caseDefinition: caseDefinitions[1],
    confirmationIndex: null,
  });
  const afterInitials = {
    ...candidate,
    results: [...candidate.results, { id: 'pending-second', passed: true }],
  };
  assert.deepEqual(getNextSemanticTrial(afterInitials, caseDefinitions), {
    caseDefinition: caseDefinitions[0],
    confirmationIndex: 1,
  });
  afterInitials.confirmations.push({
    confirmationIndex: 1,
    id: 'failed-first',
    passed: false,
  });
  assert.equal(getNextSemanticTrial(afterInitials, caseDefinitions), null);
});

test('resumes exact actor and judge boundaries without repeating completed model stages', async () => {
  let actorCallCount = 0;
  let judgeCallCount = 0;
  let durableTrial = null;
  let interruptionPhase = 'judge-pending';
  let timestampIndex = 0;
  const now = () => `2026-09-07T00:00:0${timestampIndex++}.000Z`;
  const persistActiveTrial = async (activeTrial) => {
    durableTrial = structuredClone(activeTrial);
    if (activeTrial.phase === interruptionPhase) {
      throw new Error(`interrupted after ${interruptionPhase}`);
    }
  };
  const parameters = {
    actorCommand: ['codex'],
    caseDefinition: CASE,
    cli: { jsonSchemaVersion: 4, version: '7.0.0' },
    evaluateActor: async () => {
      actorCallCount += 1;
      return { marker: 'actor-evidence' };
    },
    evaluateJudge: async () => {
      judgeCallCount += 1;
      return { id: CASE.id, passed: true };
    },
    judgeCommand: ['codex'],
    now,
    persistActiveTrial,
    runOperationalStage: async ({ operation }) => operation(),
    writeStatus: () => {},
  };

  await assert.rejects(
    runSemanticCaseTrial({ ...parameters, activeTrial: null }),
    /interrupted after judge-pending/u,
  );
  assert.equal(durableTrial.phase, 'judge-pending');
  assert.equal(actorCallCount, 1);
  assert.equal(judgeCallCount, 0);

  interruptionPhase = 'trial-complete';
  await assert.rejects(
    runSemanticCaseTrial({ ...parameters, activeTrial: durableTrial }),
    /interrupted after trial-complete/u,
  );
  assert.equal(durableTrial.phase, 'trial-complete');
  assert.equal(actorCallCount, 1);
  assert.equal(judgeCallCount, 1);

  const resumed = await runSemanticCaseTrial({
    ...parameters,
    activeTrial: durableTrial,
  });
  assert.equal(resumed.activeTrial.phase, 'trial-complete');
  assert.equal(resumed.result.passed, true);
  assert.equal(actorCallCount, 1);
  assert.equal(judgeCallCount, 1);
});

test('reserves the absolute next-stage maximum without double-counting cached input', () => {
  const emptyCandidate = { activeTrial: null, confirmations: [], results: [] };
  const absoluteStageMaximum = 2_097_152;
  assert.deepEqual(
    assertSemanticCandidatePaidStageCapacity(
      emptyCandidate,
      SEMANTIC_CANDIDATE_MAXIMUM_PAID_TOKEN_COUNT - absoluteStageMaximum,
    ),
    {
      consumedTokenCount: SEMANTIC_CANDIDATE_MAXIMUM_PAID_TOKEN_COUNT - absoluteStageMaximum,
      maximumTokenCount: SEMANTIC_CANDIDATE_MAXIMUM_PAID_TOKEN_COUNT,
      reservedTokenCount: absoluteStageMaximum,
    },
  );
  assert.throws(
    () =>
      assertSemanticCandidatePaidStageCapacity(
        emptyCandidate,
        SEMANTIC_CANDIDATE_MAXIMUM_PAID_TOKEN_COUNT - absoluteStageMaximum + 1,
      ),
    /stopped before a paid stage/u,
  );

  assert.equal(
    getSemanticCandidatePaidTokenCount({
      activeTrial: null,
      confirmations: [
        {
          actorUsage: {
            cachedInputTokens: 90,
            inputTokens: 100,
            outputTokens: 10,
          },
          executionOrigin: 'reused',
          judgeUsage: {
            cachedInputTokens: 40,
            inputTokens: 50,
            outputTokens: 5,
          },
          operationalRetries: { actorFailureCount: 0, judgeFailureCount: 0 },
        },
      ],
      results: [
        {
          actorUsage: {
            cachedInputTokens: 90,
            inputTokens: 100,
            outputTokens: 10,
          },
          executionOrigin: 'executed',
          judgeUsage: {
            cachedInputTokens: 40,
            inputTokens: 50,
            outputTokens: 5,
          },
          operationalRetries: { actorFailureCount: 1, judgeFailureCount: 0 },
        },
      ],
    }),
    165 + absoluteStageMaximum,
  );
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
  assert.match(
    prompt,
    /projected `node-test-summary` fact[\s\S]+every discovered test passed[\s\S]+`testKind` establishes the recognized test level/u,
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
    candidatePaidTokenMaximum: 32_000_000,
    caseCount: 74,
    confirmationInclusivePaidStageLimit: 444,
    initialStageCount: 148,
    model: 'gpt-5.6-sol',
    operationalRetryInclusiveInvocationLimit: 888,
    paidInitialStageCount: 148,
    reasoningEffort: 'medium',
    reusedCaseCount: 0,
    reusedStageCount: 0,
    stageReservationTokenCount: 2_097_152,
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
