import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  CODEX_EVALUATION_LOCAL_PROBE_KINDS,
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CodexEvaluationHostError,
  runCodexEvaluationOperationalStage,
} from '../tooling/codex-evaluation-host/index.mjs';

import {
  assessJudgeOutput,
  assertNoOrphanedSemanticWorkerState,
  assertSemanticCandidatePaidStageCapacity,
  buildActorPrompt,
  buildJudgePrompt,
  createSemanticDiagnosticBatchOutput,
  createSemanticDiagnosticBatchRecord,
  createSemanticDiagnosticOutput,
  createSemanticEvaluationCostEstimate,
  createSemanticResultDimensions,
  getNextSemanticTrial,
  getSemanticCandidatePaidTokenCount,
  getSemanticWorkerPaidTokenCount,
  hasMatchingSemanticReusedSourceTrial,
  isSemanticActiveTrialOperationallyStopped,
  isSemanticCoordinatorStopCaseKnown,
  isSemanticConfirmationEligible,
  parseSemanticEvaluationArguments,
  parseSemanticEvaluationHostOutput,
  readSemanticDiagnosticState,
  resolveSemanticDiagnosticCaseDefinitions,
  runSemanticCaseTrial,
  selectSemanticWorkerTrialHistory,
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

const SEMANTIC_CASES = JSON.parse(
  readFileSync(new URL('../fixtures/conformance-cases.json', import.meta.url), 'utf8'),
).semanticCases;

const PASSING_DIMENSIONS = {
  semantic: true,
  resource: true,
  commandPolicy: true,
  repositoryControl: true,
  mountIntegrity: true,
  operational: true,
};
const SEMANTIC_FAILURE_DIMENSIONS = { ...PASSING_DIMENSIONS, semantic: false };
const createCommandPolicyEvidence = (completedCommandCount = 0) => ({
  completedCommandCount,
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
});

const createRepositoryControlEvidence = () => {
  const state = {
    gitDigest: 'a'.repeat(64),
    head: { commit: 'b'.repeat(40), symbolicRef: 'refs/heads/main' },
    indexDigest: 'c'.repeat(64),
    installedSkillDigest: 'd'.repeat(64),
    localConfigDigest: 'e'.repeat(64),
    refs: [{ name: 'refs/heads/main', oid: 'b'.repeat(40) }],
  };
  return { after: state, before: state, violations: [] };
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
    isResumeStoppedStageRequested: false,
    isVerifyAttemptsRequested: false,
    requestedCaseId: undefined,
    workerCount: 4,
  });
  assert.deepEqual(parseSemanticEvaluationArguments(['--record', '--restart']), {
    diagnosticBatchSelector: null,
    isDiagnoseBatchRequested: false,
    isPreflightRequested: false,
    isRecordCheckpointRequested: false,
    isRecordRequested: true,
    isRestartRequested: true,
    isResumeStoppedStageRequested: false,
    isVerifyAttemptsRequested: false,
    requestedCaseId: undefined,
    workerCount: 4,
  });
  assert.equal(
    parseSemanticEvaluationArguments(['--record', '--resume-stopped-stage'])
      .isResumeStoppedStageRequested,
    true,
  );
  assert.throws(() =>
    parseSemanticEvaluationArguments(['--record', '--restart', '--resume-stopped-stage']),
  );
});

test('keeps a contained activation miss eligible for semantic confirmation', () => {
  const caseDefinition = {
    ...CASE,
    resourceBudget: {
      activation: 'relationship',
      minimumMoldeaCommands: 1,
      maximumMoldeaCommands: 4,
      maximumMoldeaOutputBytes: 262_144,
    },
  };
  const dimensions = createSemanticResultDimensions(
    caseDefinition,
    {
      actorCommandPolicyEvidence: createCommandPolicyEvidence(),
      actorResourceEvidence: {
        commandCount: 0,
        maximumInvocationByteCount: 0,
        modelVisibleToolOutputByteCount: 0,
        operations: [],
        stdoutByteCount: 0,
      },
      judgeCommandPolicyEvidence: createCommandPolicyEvidence(),
      readOnlyMountControlEvidence: [],
      repositoryControlEvidence: createRepositoryControlEvidence(),
    },
    true,
  );

  assert.deepEqual(dimensions, {
    semantic: false,
    resource: true,
    commandPolicy: true,
    repositoryControl: true,
    mountIntegrity: true,
    operational: true,
  });
  assert.equal(isSemanticConfirmationEligible(dimensions), true);
});

test('parses one diagnostic case without authorizing recording', () => {
  assert.deepEqual(parseSemanticEvaluationArguments(['--case', 'unrelated-review']), {
    diagnosticBatchSelector: null,
    isDiagnoseBatchRequested: false,
    isPreflightRequested: false,
    isRecordCheckpointRequested: false,
    isRecordRequested: false,
    isRestartRequested: false,
    isResumeStoppedStageRequested: false,
    isVerifyAttemptsRequested: false,
    requestedCaseId: 'unrelated-review',
    workerCount: null,
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
    isResumeStoppedStageRequested: false,
    isVerifyAttemptsRequested: false,
    requestedCaseId: undefined,
    workerCount: 4,
  });
  assert.equal(
    parseSemanticEvaluationArguments(['--diagnose-batch', '--all', '--workers', '2']).workerCount,
    2,
  );
  assert.throws(
    () => parseSemanticEvaluationArguments(['--record', '--workers', '3']),
    /must be 1, 2, or 4/u,
  );
  assert.deepEqual(
    parseSemanticEvaluationArguments([
      '--diagnose-batch',
      '--claims',
      'activation-abstention,bounded-relevance',
      '--restart',
    ]).diagnosticBatchSelector,
    { kind: 'claims', value: 'activation-abstention,bounded-relevance' },
  );
  assert.equal(
    parseSemanticEvaluationArguments(['--diagnose-batch', '--all', '--resume-stopped-stage'])
      .isResumeStoppedStageRequested,
    true,
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
      actorCommandPolicyEvidence: createCommandPolicyEvidence(3),
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
      confirmationEligible: true,
      dimensions: SEMANTIC_FAILURE_DIMENSIONS,
      failureClassifications: ['semantic'],
      id: 'bounded-diagnostic',
      judgeCommandPolicyEvidence: createCommandPolicyEvidence(),
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
    schemaVersion: 3,
    evaluationProtocolVersion: 25,
    caseId: 'bounded-diagnostic',
    confirmationEligible: true,
    dimensions: SEMANTIC_FAILURE_DIMENSIONS,
    failureClassifications: ['semantic'],
    verdict: 'failed',
    criteria: {
      observed: ['expected-behavior'],
      forbidden: ['forbidden-behavior'],
    },
    rationale: 'The expected behavior was not demonstrated.',
    rationaleTruncated: false,
    resources: {
      commandPolicy: {
        actor: createCommandPolicyEvidence(3),
        judge: createCommandPolicyEvidence(),
      },
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
    actorCommandPolicyEvidence: createCommandPolicyEvidence(64),
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
    confirmationEligible: false,
    dimensions: PASSING_DIMENSIONS,
    failureClassifications: [],
    id: 'large-multibyte-rationale',
    judgeCommandPolicyEvidence: createCommandPolicyEvidence(),
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
    actorCommandPolicyEvidence: createCommandPolicyEvidence(3),
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
    confirmationEligible: true,
    dimensions: SEMANTIC_FAILURE_DIMENSIONS,
    failureClassifications: ['semantic'],
    id: 'bounded-diagnostic',
    judgeCommandPolicyEvidence: createCommandPolicyEvidence(),
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
  assert.equal(record.rationale, 'Failed dimensions: semantic.');
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

test('rejects semantic worker state without an owning candidate', async () => {
  const workerRoot = await mkdtemp(join(tmpdir(), 'moldea-semantic-worker-'));

  try {
    assert.throws(
      () => assertNoOrphanedSemanticWorkerState(null, workerRoot),
      /worker state has no owning candidate/u,
    );
    assert.doesNotThrow(() => assertNoOrphanedSemanticWorkerState({}, workerRoot));
    await rm(workerRoot, { force: true, recursive: true });
    assert.doesNotThrow(() => assertNoOrphanedSemanticWorkerState(null, workerRoot));
  } finally {
    await rm(workerRoot, { force: true, recursive: true });
  }
});

test('recognizes a stopped semantic case before or after durable commit', () => {
  const candidate = {
    confirmations: [{ id: 'confirmed' }],
    results: [{ id: 'recorded' }],
  };
  const trials = [{ caseDefinition: { id: 'pending' } }];

  assert.equal(isSemanticCoordinatorStopCaseKnown(candidate, trials, 'pending'), true);
  assert.equal(isSemanticCoordinatorStopCaseKnown(candidate, trials, 'recorded'), true);
  assert.equal(isSemanticCoordinatorStopCaseKnown(candidate, trials, 'confirmed'), true);
  assert.equal(isSemanticCoordinatorStopCaseKnown(candidate, trials, 'unknown'), false);
});

test('seeds isolated confirmation workers with only their required case history', () => {
  const failedInitial = {
    confirmationEligible: true,
    id: 'failed-case',
    passed: false,
  };
  const firstConfirmation = {
    confirmationIndex: 1,
    id: 'failed-case',
    passed: true,
  };
  const initialSourceCandidate = {
    confirmations: [{ confirmationIndex: 1, id: 'other-case', passed: true }],
    results: [failedInitial, { id: 'other-case', passed: false }],
  };
  const confirmedSourceCandidate = {
    ...initialSourceCandidate,
    confirmations: [firstConfirmation, ...initialSourceCandidate.confirmations],
  };

  assert.deepEqual(selectSemanticWorkerTrialHistory(initialSourceCandidate, 'failed-case', null), {
    confirmations: [],
    results: [],
  });
  assert.deepEqual(selectSemanticWorkerTrialHistory(initialSourceCandidate, 'failed-case', 1), {
    confirmations: [],
    results: [failedInitial],
  });
  assert.deepEqual(selectSemanticWorkerTrialHistory(confirmedSourceCandidate, 'failed-case', 2), {
    confirmations: [firstConfirmation],
    results: [failedInitial],
  });
  assert.deepEqual(
    selectSemanticWorkerTrialHistory(
      {
        confirmations: [{ ...firstConfirmation, passed: false }],
        results: [failedInitial],
      },
      'failed-case',
      2,
    ).confirmations.map(({ passed }) => passed),
    [false],
  );
  assert.throws(
    () =>
      selectSemanticWorkerTrialHistory(
        {
          confirmations: [firstConfirmation, { ...firstConfirmation, confirmationIndex: 2 }],
          results: [failedInitial],
        },
        'failed-case',
        3,
      ),
    /invalid prior case history/u,
  );
  assert.equal(
    getSemanticWorkerPaidTokenCount({
      activeTrial: null,
      confirmations: [firstConfirmation],
      results: [failedInitial],
    }),
    0,
  );
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
    results: [{ id: 'failed-first', passed: false, confirmationEligible: true }],
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
  assert.deepEqual(getNextSemanticTrial(afterInitials, caseDefinitions), {
    caseDefinition: caseDefinitions[0],
    confirmationIndex: 2,
  });
  afterInitials.confirmations.push({
    confirmationIndex: 2,
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

test('persists retry exhaustion and permits only explicit one-attempt resumes', async () => {
  let actorCallCount = 0;
  let durableTrial = null;
  let shouldActorFail = true;
  const parameters = {
    activeTrial: null,
    actorCommand: ['codex'],
    caseDefinition: CASE,
    cli: { jsonSchemaVersion: 4, version: '7.0.0' },
    evaluateActor: async () => {
      actorCallCount += 1;
      if (shouldActorFail) {
        throw new CodexEvaluationHostError(
          CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut,
          'Provider request timed out.',
        );
      }
      return { response: 'actor evidence' };
    },
    evaluateJudge: async () => ({ id: CASE.id, passed: true }),
    judgeCommand: ['codex'],
    persistActiveTrial: async (activeTrial) => {
      durableTrial = structuredClone(activeTrial);
    },
    runOperationalStage: (options) =>
      runCodexEvaluationOperationalStage({
        ...options,
        random: () => 0,
        wait: async () => {},
      }),
    writeStatus: () => {},
  };

  await assert.rejects(runSemanticCaseTrial(parameters), /exhausted 1 operational retry/u);
  assert.equal(actorCallCount, 2);
  assert.equal(durableTrial.operationalRetries.actorFailureCount, 2);
  assert.equal(durableTrial.operationalRetries.lastFailure.retryDelayMs, 0);
  assert.equal(isSemanticActiveTrialOperationallyStopped(durableTrial), true);
  assert.equal(
    getSemanticCandidatePaidTokenCount({
      activeTrial: durableTrial,
      confirmations: [],
      results: [],
    }),
    2 * 2_097_152,
  );

  await assert.rejects(
    runSemanticCaseTrial({ ...parameters, activeTrial: durableTrial }),
    /use --resume-stopped-stage/u,
  );
  assert.equal(actorCallCount, 2);

  await assert.rejects(
    runSemanticCaseTrial({
      ...parameters,
      activeTrial: durableTrial,
      isOperationalResumeRequested: true,
    }),
    /exhausted 1 operational retry/u,
  );
  assert.equal(actorCallCount, 3);
  assert.equal(durableTrial.operationalRetries.actorFailureCount, 3);

  shouldActorFail = false;
  const resumed = await runSemanticCaseTrial({
    ...parameters,
    activeTrial: durableTrial,
    isOperationalResumeRequested: true,
  });
  assert.equal(actorCallCount, 4);
  assert.equal(resumed.result.operationalRetries.actorFailureCount, 3);
  assert.equal(resumed.result.passed, true);
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

test('rebinds reuse provenance without accepting changed source content', () => {
  const sourceTrial = {
    actorResponse: 'Use the canonical project context.',
    executionOrigin: 'executed',
    passed: true,
    stageReuse: null,
  };
  const reusedTrial = {
    ...sourceTrial,
    executionOrigin: 'reused',
    stageReuse: { actor: { source: 'immediate-attempt' } },
  };

  assert.equal(hasMatchingSemanticReusedSourceTrial(sourceTrial, reusedTrial), true);
  assert.equal(
    hasMatchingSemanticReusedSourceTrial(
      {
        ...sourceTrial,
        executionOrigin: 'reused',
        stageReuse: { actor: { source: 'original-attempt' } },
      },
      reusedTrial,
    ),
    true,
  );
  assert.equal(
    hasMatchingSemanticReusedSourceTrial(sourceTrial, {
      ...reusedTrial,
      actorResponse: 'Changed behavior.',
    }),
    false,
  );
});

test('keeps evaluator criteria out of the actor prompt', () => {
  assert.equal(buildActorPrompt(CASE), 'Review docs/example.md.');
});

test('exposes a fixed publication probe only to explicitly granted actor tasks', () => {
  const grantedCase = SEMANTIC_CASES.find(
    ({ id }) => id === 'agent-adoption-inline-runtime-instruction',
  );
  const ungrantedCase = SEMANTIC_CASES.find(
    ({ id }) => id === 'plan-runtime-inventory-insufficient-evidence',
  );
  assert.ok(grantedCase);
  assert.ok(ungrantedCase);

  assert.match(buildActorPrompt(grantedCase), /explicitly provides a fixed local/u);
  assert.match(buildActorPrompt(grantedCase), /compatibility\/runtimes\.json/u);
  assert.equal(buildActorPrompt(ungrantedCase), ungrantedCase.input.developerDirection);
});

test('judges insufficient initialization context without duplicate phrase requirements', () => {
  const caseDefinition = SEMANTIC_CASES.find(({ id }) => id === 'initialize-insufficient-context');
  assert.ok(caseDefinition);

  const expectedByLabel = new Map(
    caseDefinition.expected.map(({ criterion, label }) => [label, criterion]),
  );
  assert.match(
    expectedByLabel.get('report-no-meaningful-project-context'),
    /asking for the missing purpose and audience is an explicit synthesis/u,
  );
  assert.match(
    expectedByLabel.get('report-unadopted-project'),
    /not adopted or was not initialized/u,
  );
  assert.match(
    expectedByLabel.get('ask-focused-foundation-question'),
    /what the project does and who or what it serves/u,
  );
  assert.match(
    expectedByLabel.get('ask-focused-foundation-question'),
    /need not add generic product-benefit prose/u,
  );
});

test('accepts a specific missing integration contract as runtime evidence resolver', () => {
  const caseDefinition = SEMANTIC_CASES.find(
    ({ id }) => id === 'available-runtime-insufficient-behavioral-evidence',
  );
  assert.ok(caseDefinition);

  const limitation = caseDefinition.expected.find(
    ({ label }) => label === 'report-behavioral-evidence-limitation',
  );
  assert.match(limitation?.criterion, /specific missing approved integration contract/u);
  assert.match(limitation?.criterion, /resolve both behavioral fit and integration wiring/u);
});

test('projects every bounded runtime-planning fact the judge may verify', () => {
  const caseDefinition = SEMANTIC_CASES.find(
    ({ id }) => id === 'plan-runtime-inventory-insufficient-evidence',
  );
  assert.ok(caseDefinition);

  assert.deepEqual(
    caseDefinition.input.repositoryEvidence.map(({ source }) => source.path),
    [
      'README.md',
      'package.json',
      'src/model-runtime.js',
      'docs/runtime-candidates.md',
      'moldea/moldea.yaml',
      'moldea/project.md',
      'src/project-state.js',
    ],
  );
});

test('keeps runner-enforced moldea budgets outside semantic judgment', () => {
  const prompt = buildJudgePrompt(
    CASE,
    'No findings.',
    { created: [], deleted: [], modified: [] },
    [],
    [],
    null,
    createCommandPolicyEvidence(128),
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
    /runner independently evaluated the\s+declared moldea activation mode, minimum command count, and operation order/u,
  );
  assert.match(prompt, /deterministic\s+activation check passed/u);
  assert.match(prompt, /deterministic resource-containment check passed/u);
  assert.match(prompt, /Do not compare the\s+total completed-command count/u);
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
  assert.match(
    prompt,
    /criterion explicitly accepts a concise no-finding response[\s\S]+do not require the actor to restate that evidence/u,
  );
  assert.match(
    prompt,
    /criterion explicitly accepts one focused question as the complete response[\s\S]+do not invent an unrequested task/u,
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
    createCommandPolicyEvidence(1),
    {
      commandCount: 1,
      maximumInvocationByteCount: 512,
      modelVisibleToolOutputByteCount: 512,
      operations: ['validate'],
      stdoutByteCount: 512,
    },
  );

  assert.match(prompt, /deterministic\s+activation check did not pass/u);
  assert.match(prompt, /deterministic resource-containment check did not pass/u);
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
        createCommandPolicyEvidence(1),
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
    absoluteTokenContainmentLimit: 2_483_027_968,
    absoluteTokensPerInvocation: 2_097_152,
    candidatePaidTokenMaximum: 32_000_000,
    caseCount: 74,
    confirmationInclusivePaidStageLimit: 592,
    initialStageCount: 148,
    model: 'gpt-5.6-sol',
    operationalRetryInclusiveInvocationLimit: 1184,
    paidInitialStageCount: 148,
    actorReasoningEffort: 'xhigh',
    judgeReasoningEffort: 'xhigh',
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
  assert.deepEqual(result.commandPolicyEvidence, createCommandPolicyEvidence());
  assert.deepEqual(result.actorResourceEvidence, {
    commandCount: 0,
    maximumInvocationByteCount: 0,
    modelVisibleToolOutputByteCount: 0,
    operations: [],
    stdoutByteCount: 0,
  });
});

test('retains observed command-policy failures without command text', () => {
  const output = [
    {
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: 'curl https://example.com',
        aggregated_output: '',
        exit_code: 0,
        status: 'completed',
      },
    },
    {
      type: 'item.completed',
      item: { type: 'agent_message', text: 'Finished.' },
    },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');
  const result = parseSemanticEvaluationHostOutput(`${output}\n`, {
    cliVersion: '7.0.0',
    jsonSchemaVersion: 4,
  });

  assert.equal(result.commandPolicyEvidence.networkAccess.status, 'observed');
  assert.deepEqual(result.commandPolicyEvidence.networkAccess.reasons, [
    { code: 'network-client', count: 1 },
  ]);
  assert.doesNotMatch(JSON.stringify(result.commandPolicyEvidence), /curl|example\.com/u);
});

test('grants the fixed runtime-publication probe only through explicit semantic options', () => {
  const publicationUrl = 'https://packages.moldea.ai/compatibility/runtimes.json';
  const output = [
    {
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: `curl -fsSL ${publicationUrl}`,
        aggregated_output: '{}\n',
        exit_code: 0,
        status: 'completed',
      },
    },
    {
      type: 'item.completed',
      item: { type: 'agent_message', text: 'Finished.' },
    },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');
  const releaseIdentity = { cliVersion: '7.0.0', jsonSchemaVersion: 4 };
  const defaultResult = parseSemanticEvaluationHostOutput(output, releaseIdentity);
  const runtimeResult = parseSemanticEvaluationHostOutput(output, {
    ...releaseIdentity,
    localProbeKind: CODEX_EVALUATION_LOCAL_PROBE_KINDS.RuntimeCompatibilityPublication,
  });

  assert.equal(defaultResult.commandPolicyEvidence.networkAccess.status, 'observed');
  assert.equal(runtimeResult.commandPolicyEvidence.networkAccess.status, 'not-observed');
  assert.doesNotMatch(
    JSON.stringify(runtimeResult.commandPolicyEvidence),
    /curl|packages\.moldea/u,
  );
});
