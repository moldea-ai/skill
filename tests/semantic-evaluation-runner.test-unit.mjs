// @vitest-environment node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

import {
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  isRetryableCodexEvaluationHostError,
} from '../tooling/codex-evaluation-host/index.mjs';

import {
  appendSemanticCandidateConfirmation,
  appendSemanticCandidateInitialResult,
  attachSemanticActiveTrialActorEvidence,
  assessJudgeOutput,
  buildActorPrompt,
  buildJudgePrompt,
  buildSemanticEvaluationHostCommand,
  collectProductionPackageRoots,
  createPortableSkillSemanticDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  createSemanticActiveTrial,
  createSemanticEvaluationCandidate,
  createSemanticEvaluationHostContract,
  createSemanticEvaluationRecord,
  getPendingSemanticCaseDefinitions,
  getSemanticCaseResolution,
  getSemanticCriterionLabels,
  getSemanticToolingSource,
  normalizePortableSkillSemanticEvidence,
  parseSemanticEvaluationArguments,
  parseSemanticEvaluationHostOutput,
  recordSemanticCandidateCheckpoint,
  runSemanticCaseTrial,
  shouldFailSemanticEvaluation,
  validateSemanticCandidateCompatibility,
  validateSemanticCandidateCheckpointCompatibility,
  validateSemanticCaseDefinition,
  validateSemanticResultRecording,
  validateSkillDocument,
  validateSkillEvidenceConfiguration,
} from './semantic-evaluation-runner.mjs';

const EXPECTED_CRITERION = {
  criterion: 'The supplied evidence demonstrates the expected secret behavior.',
  label: 'expected-secret-label',
};
const FORBIDDEN_CRITERION = {
  criterion: 'The supplied evidence demonstrates the forbidden secret behavior.',
  label: 'forbidden-secret-label',
};
const CASE_DEFINITION = {
  expected: [EXPECTED_CRITERION],
  forbidden: [FORBIDDEN_CRITERION],
  id: 'blind-evaluation',
  input: {
    developerDirection: 'Evaluate this repository without changing it.',
    repositoryEvidence: [
      {
        claim: 'The developer requested a read-only repository evaluation.',
        source: { kind: 'developer-direction' },
      },
    ],
  },
  operation: 'evaluate-repository',
  scenario: 'An adopted repository needs a read-only evaluation.',
};
const SECOND_CASE_DEFINITION = {
  expected: [
    {
      criterion: 'The supplied evidence demonstrates the second expected behavior.',
      label: 'second-expected-label',
    },
  ],
  forbidden: [
    {
      criterion: 'The supplied evidence demonstrates the second forbidden behavior.',
      label: 'second-forbidden-label',
    },
  ],
  id: 'second-evaluation',
  input: {
    developerDirection: 'Evaluate a second repository scenario without changing it.',
    repositoryEvidence: [
      {
        claim: 'The developer requested a second read-only evaluation.',
        source: { kind: 'developer-direction' },
      },
    ],
  },
  operation: 'evaluate-repository',
  scenario: 'A second adopted repository needs a read-only evaluation.',
};
const SKILL_CASE_DEFINITION = {
  expected: [EXPECTED_CRITERION],
  forbidden: [FORBIDDEN_CRITERION],
  id: 'skill-evaluation',
  input: {
    developerDirection: 'Create a release-review skill.',
    repositoryEvidence: [
      {
        claim: 'The developer requested a release-review skill.',
        source: { kind: 'developer-direction' },
      },
    ],
  },
  operation: 'create-agent-skill',
  scenario: 'A repository needs a reusable release-review workflow.',
  skillEvidence: {
    activationScenarios: [
      { request: 'Review this release.', shouldActivate: true },
      { request: 'Update package.json.', shouldActivate: false },
    ],
    artifacts: [{ role: 'authoritative-source', root: 'skills/release-review' }],
  },
};
const HOST_INSTRUCTIONS =
  '# Evaluation coding instructions\n\nEnd every `plan` response by stating that no repository files were changed.\n';
const HOST_CASE_DEFINITION = {
  ...SKILL_CASE_DEFINITION,
  hostInstructions: HOST_INSTRUCTIONS,
  id: 'host-plan-command',
  input: {
    developerDirection: SKILL_CASE_DEFINITION.input.developerDirection,
    repositoryEvidence: [
      ...SKILL_CASE_DEFINITION.input.repositoryEvidence,
      {
        claim: 'Repository coding instructions require a read-only planning response.',
        source: { kind: 'host-instructions' },
      },
    ],
  },
};
const ACTOR_HOST = {
  model: 'gpt-5.6-sol',
  name: 'codex',
  reasoningEffort: 'medium',
  version: '1.2.3',
};
const JUDGE_HOST = {
  model: 'gpt-5.6-sol',
  name: 'codex',
  reasoningEffort: 'medium',
  version: '1.2.3',
};
const ARTIFACT_DIGEST = 'a'.repeat(64);
const COVERAGE_DIGEST = 'e'.repeat(64);
const CLI_IDENTITY = {
  integrity: `sha512-${'a'.repeat(86)}`,
  jsonSchemaVersion: 2,
  name: '@moldea.ai/cli',
  packageLockSha256: 'd'.repeat(64),
  version: '4.0.0',
};
const ACTOR_EXECUTION_EVIDENCE_OPTIONS = {
  cliVersion: CLI_IDENTITY.version,
  jsonSchemaVersion: CLI_IDENTITY.jsonSchemaVersion,
};
const BASE_HOST_COMMAND = [
  'codex',
  'exec',
  '--ignore-user-config',
  '--ignore-rules',
  '--ephemeral',
  '--skip-git-repo-check',
  '--dangerously-bypass-approvals-and-sandbox',
  '-c',
  'shell_environment_policy.inherit=none',
  '-',
];
const EVALUATED_AT = '2026-08-16T12:00:00.000Z';
const BEFORE_SNAPSHOT_STATE = {
  content: 'before',
  mode: 33_204,
  omission: null,
  sha256: 'b'.repeat(64),
  type: 'file',
};
const AFTER_SNAPSHOT_STATE = {
  content: 'after',
  mode: 33_204,
  omission: null,
  sha256: 'c'.repeat(64),
  type: 'file',
};
const REPOSITORY_CONTROL_STATE = {
  gitDigest: '1'.repeat(64),
  head: { commit: '2'.repeat(40), symbolicRef: 'refs/heads/main' },
  indexDigest: '3'.repeat(64),
  installedSkillDigest: '4'.repeat(64),
  localConfigDigest: '5'.repeat(64),
  refs: [],
};
const EMPTY_COMMAND_POLICY_EVIDENCE = {
  completedCommandCount: 0,
  indeterminateCommandCount: 0,
  packageManagerExecution: 'not-observed',
  packageManagerInvocationCount: 0,
};

const createScenarioEvidence = (caseDefinition) =>
  caseDefinition.input.repositoryEvidence.map(({ claim, source }) => {
    if (source.kind === 'developer-direction') {
      return {
        claim,
        observation: {
          content: caseDefinition.input.developerDirection,
          type: 'developer-direction',
        },
        source,
      };
    }
    if (source.kind === 'host-instructions') {
      return {
        claim,
        observation: {
          content: caseDefinition.hostInstructions,
          type: 'host-instructions',
        },
        source,
      };
    }
    throw new Error(`Unsupported test scenario evidence source: ${source.kind}`);
  });

const createCaseResult = (caseDefinition, passed) => ({
  actorHost: ACTOR_HOST,
  actorCommandPolicyEvidence: EMPTY_COMMAND_POLICY_EVIDENCE,
  actorExecutionEvidence: [],
  actorResponse: `Actor response for ${caseDefinition.id}`,
  caseId: caseDefinition.id,
  forbidden: [],
  id: caseDefinition.id,
  judgeHost: JUDGE_HOST,
  observed: passed ? getSemanticCriterionLabels(caseDefinition.expected) : [],
  operationalRetries: {
    actorFailureCount: 0,
    judgeFailureCount: 0,
    lastFailure: null,
  },
  passed,
  rationale: passed ? 'The expected behavior was demonstrated.' : 'Expected evidence was missing.',
  readOnlyMountControlEvidence: [],
  repositoryControlEvidence: {
    after: REPOSITORY_CONTROL_STATE,
    before: REPOSITORY_CONTROL_STATE,
    violations: [],
  },
  scenarioEvidence: createScenarioEvidence(caseDefinition),
  skillArtifactEvidence: [],
  workspaceChanges: {
    created: [],
    deleted: [],
    modified: [
      {
        after: AFTER_SNAPSHOT_STATE,
        before: BEFORE_SNAPSHOT_STATE,
        path: 'src/example.js',
      },
    ],
  },
});

const createActorEvidence = (caseDefinition) => {
  const result = createCaseResult(caseDefinition, true);
  return {
    actorHost: result.actorHost,
    actorCommandPolicyEvidence: result.actorCommandPolicyEvidence,
    actorExecutionEvidence: result.actorExecutionEvidence,
    actorResponse: result.actorResponse,
    readOnlyMountControlEvidence: result.readOnlyMountControlEvidence,
    repositoryControlEvidence: result.repositoryControlEvidence,
    scenarioEvidence: result.scenarioEvidence,
    skillArtifactEvidence: result.skillArtifactEvidence,
    workspaceChanges: result.workspaceChanges,
  };
};

test('actor prompt contains only the user scenario', () => {
  const actorPrompt = buildActorPrompt(CASE_DEFINITION);

  assert.equal(actorPrompt, CASE_DEFINITION.input.developerDirection);
  assert.doesNotMatch(actorPrompt, /expected-secret-label|forbidden-secret-label/);
  assert.doesNotMatch(actorPrompt, /expected secret behavior|forbidden secret behavior/);
});

test('semantic evaluation arguments separate runs, diagnostics, and verification', () => {
  assert.deepEqual(parseSemanticEvaluationArguments(['--record']), {
    isPreflightRequested: false,
    isRecordRequested: true,
    isRecordCheckpointRequested: false,
    isRestartRequested: false,
    isVerifyAttemptsRequested: false,
    requestedCaseId: undefined,
  });
  assert.throws(
    () => parseSemanticEvaluationArguments(['--case', 'blind-evaluation', '--record']),
    /diagnostic-only/,
  );
  assert.throws(
    () => parseSemanticEvaluationArguments(['--confirm', 'blind-evaluation', '--record']),
    /Unsupported semantic evaluation option/,
  );
  assert.throws(
    () => parseSemanticEvaluationArguments(['--stop-on-failure']),
    /Unsupported semantic evaluation option/,
  );
  assert.throws(
    () => parseSemanticEvaluationArguments(['--migrate-checkpoint']),
    /Unsupported semantic evaluation option/,
  );
});

test('a recovered case cannot make an incomplete recorded suite exit cleanly', () => {
  const caseDefinitions = [CASE_DEFINITION, SECOND_CASE_DEFINITION];
  let candidate = createSemanticEvaluationCandidate({
    actorHost: ACTOR_HOST,
    artifactDigest: ARTIFACT_DIGEST,
    caseDefinitions,
    cli: CLI_IDENTITY,
    coverageDigest: COVERAGE_DIGEST,
    generatedAt: EVALUATED_AT,
    judgeHost: JUDGE_HOST,
  });
  candidate = appendSemanticCandidateInitialResult(
    candidate,
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, false),
    EVALUATED_AT,
  );
  candidate = appendSemanticCandidateConfirmation(
    candidate,
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, true),
    '2026-08-16T12:01:00.000Z',
  );
  candidate = appendSemanticCandidateConfirmation(
    candidate,
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, true),
    '2026-08-16T12:02:00.000Z',
  );

  assert.equal(
    shouldFailSemanticEvaluation({
      candidate,
      caseDefinitions,
      hasFailures: false,
      isRecordRequested: true,
    }),
    true,
  );
});

test('structured actor prompt excludes evaluation criteria', () => {
  const actorPrompt = buildActorPrompt(HOST_CASE_DEFINITION);

  assert.equal(actorPrompt, HOST_CASE_DEFINITION.input.developerDirection);
  assert.doesNotMatch(actorPrompt, /expected-secret-label|forbidden-secret-label/);
  assert.doesNotMatch(actorPrompt, /expected secret behavior|forbidden secret behavior/);
  assert.doesNotMatch(actorPrompt, /Review this release|shouldActivate|authoritative-source/);
  assert.doesNotMatch(
    actorPrompt,
    /Evaluation coding instructions|no repository files were changed/,
  );
});

test('semantic host command enables runner-owned JSONL events exactly once', () => {
  const command = buildSemanticEvaluationHostCommand(BASE_HOST_COMMAND);

  assert.equal(command.at(-1), '-');
  assert.equal(command.filter((part) => part === '--json').length, 1);
  assert.match(command.join(' '), /--model gpt-5\.6-sol/);
  assert.match(command.join(' '), /model_reasoning_effort=medium/);

  const preconfiguredCommand = buildSemanticEvaluationHostCommand([
    ...BASE_HOST_COMMAND.slice(0, -1),
    '--json',
    '-',
  ]);
  assert.equal(preconfiguredCommand.filter((part) => part === '--json').length, 1);
});

test('semantic host output separates final response from runner-owned execution evidence', () => {
  const commandItem = {
    command: 'bash -lc \"yarn bin -v --json\"',
    id: 'item-1',
    status: 'in_progress',
    type: 'command_execution',
  };
  const completedCommandItem = {
    ...commandItem,
    aggregated_output: '',
    exit_code: 0,
    status: 'completed',
  };
  const focusedTestItem = {
    aggregated_output: 'TAP version 13\n1..1\n',
    command: "/bin/bash -lc 'node --test src/support-agent.test-integration.js'",
    exit_code: 0,
    id: 'item-2',
    status: 'completed',
    type: 'command_execution',
  };
  const toolItem = {
    arguments: { command: 'yarn info @moldea.ai/cli --json' },
    id: 'item-3',
    name: 'exec_command',
    status: 'completed',
    type: 'mcp_tool_call',
  };
  const output = [
    { thread_id: 'thread-1', type: 'thread.started' },
    { item: commandItem, type: 'item.started' },
    { item: completedCommandItem, type: 'item.completed' },
    { item: focusedTestItem, type: 'item.completed' },
    { item: toolItem, type: 'item.completed' },
    {
      item: {
        id: 'item-4',
        text: '{\"observed\":[],\"forbidden\":[],\"rationale\":\"done\"}',
        type: 'agent_message',
      },
      type: 'item.completed',
    },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');

  assert.deepEqual(parseSemanticEvaluationHostOutput(output, ACTOR_EXECUTION_EVIDENCE_OPTIONS), {
    actorCommandPolicyEvidence: {
      completedCommandCount: 2,
      indeterminateCommandCount: 1,
      packageManagerExecution: 'observed',
      packageManagerInvocationCount: 1,
    },
    actorExecutionEvidence: [
      {
        eventType: 'item.completed',
        item: {
          exitCode: 0,
          outputEvidence: { byteCount: 0, disposition: 'empty', facts: [] },
          status: 'completed',
          type: 'command_execution',
        },
      },
      {
        eventType: 'item.completed',
        item: {
          exitCode: 0,
          outputEvidence: {
            byteCount: 20,
            disposition: 'projected',
            facts: [
              {
                kind: 'focused-runtime-test',
                path: '/src/support-agent.test-integration.js',
                status: 'passed',
              },
            ],
          },
          status: 'completed',
          type: 'command_execution',
        },
      },
    ],
    response: '{\"observed\":[],\"forbidden\":[],\"rationale\":\"done\"}',
  });
  assert.doesNotMatch(
    JSON.stringify(parseSemanticEvaluationHostOutput(output, ACTOR_EXECUTION_EVIDENCE_OPTIONS)),
    /yarn bin|yarn info|arguments/u,
  );
});

test('semantic host output does not derive execution evidence from the final response', () => {
  const output = JSON.stringify({
    item: {
      id: 'item-1',
      text: 'I ran yarn bin -v --json and it succeeded.',
      type: 'agent_message',
    },
    type: 'item.completed',
  });

  assert.deepEqual(parseSemanticEvaluationHostOutput(output, ACTOR_EXECUTION_EVIDENCE_OPTIONS), {
    actorCommandPolicyEvidence: EMPTY_COMMAND_POLICY_EVIDENCE,
    actorExecutionEvidence: [],
    response: 'I ran yarn bin -v --json and it succeeded.',
  });
  assert.throws(
    () => parseSemanticEvaluationHostOutput('{not-json}\n', ACTOR_EXECUTION_EVIDENCE_OPTIONS),
    /malformed JSONL output/,
  );
  assert.throws(
    () =>
      parseSemanticEvaluationHostOutput(
        JSON.stringify({
          item: {
            command: 'yarn bin -v --json',
            id: 'item-1',
            type: 'command_execution',
          },
          type: 'item.completed',
        }),
        ACTOR_EXECUTION_EVIDENCE_OPTIONS,
      ),
    /did not include its result evidence/,
  );
});

test('semantic host output classifies provider error events as retryable operational failures', () => {
  assert.throws(
    () =>
      parseSemanticEvaluationHostOutput(
        `${JSON.stringify({ type: 'turn.failed' })}\n`,
        ACTOR_EXECUTION_EVIDENCE_OPTIONS,
      ),
    (error) => {
      assert.equal(isRetryableCodexEvaluationHostError(error), true);
      assert.equal(error.kind, CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed);
      return true;
    },
  );
});

test('semantic host output rejects unbounded evidence without retaining oversized commands', () => {
  const commandEvents = Array.from({ length: 129 }, (_, index) => ({
    item: {
      aggregated_output: '',
      command: `echo ${index}`,
      exit_code: 0,
      id: `item-${index}`,
      status: 'completed',
      type: 'command_execution',
    },
    type: 'item.completed',
  }));
  const finalResponseEvent = {
    item: { id: 'response', text: 'done', type: 'agent_message' },
    type: 'item.completed',
  };

  assert.throws(
    () =>
      parseSemanticEvaluationHostOutput(
        [...commandEvents, finalResponseEvent].map((event) => JSON.stringify(event)).join('\n'),
        ACTOR_EXECUTION_EVIDENCE_OPTIONS,
      ),
    /exceeded its item limit/,
  );
  const oversizedCommandResult = parseSemanticEvaluationHostOutput(
    [
      {
        item: {
          aggregated_output: '',
          command: 'x'.repeat(32_769),
          exit_code: 0,
          id: 'oversized-command',
          status: 'completed',
          type: 'command_execution',
        },
        type: 'item.completed',
      },
      finalResponseEvent,
    ]
      .map((event) => JSON.stringify(event))
      .join('\n'),
    ACTOR_EXECUTION_EVIDENCE_OPTIONS,
  );
  assert.doesNotMatch(JSON.stringify(oversizedCommandResult.actorExecutionEvidence), /x{16}/u);
});

test('judge prompt enforces bidirectional source attribution after actor execution', () => {
  const judgePrompt = buildJudgePrompt(
    HOST_CASE_DEFINITION,
    'Actor response',
    {
      created: [],
      deleted: [],
      modified: [],
    },
    [
      {
        directories: ['skills/release-review'],
        excludedDirectoryCount: 0,
        files: [],
        resourceReferences: [],
        role: 'authoritative-source',
        root: 'skills/release-review',
        rootType: 'directory',
        truncatedDirectoryCount: 0,
        truncatedFileCount: 0,
        validation: {
          description: 'Reviews releases.',
          errors: [],
          name: 'release-review',
          valid: true,
        },
      },
    ],
    [
      {
        eventType: 'item.completed',
        item: {
          exitCode: 0,
          outputEvidence: { byteCount: 0, disposition: 'empty', facts: [] },
          status: 'completed',
          type: 'command_execution',
        },
      },
      {
        eventType: 'item.completed',
        item: {
          exitCode: 0,
          outputEvidence: {
            byteCount: 20,
            disposition: 'projected',
            facts: [
              {
                kind: 'focused-runtime-test',
                path: '/src/support-agent.test-integration.js',
                status: 'passed',
              },
            ],
          },
          status: 'completed',
          type: 'command_execution',
        },
      },
    ],
    createScenarioEvidence(HOST_CASE_DEFINITION),
    {
      after: REPOSITORY_CONTROL_STATE,
      before: REPOSITORY_CONTROL_STATE,
      violations: [],
    },
    [],
    {
      completedCommandCount: 2,
      indeterminateCommandCount: 1,
      packageManagerExecution: 'indeterminate',
      packageManagerInvocationCount: 0,
    },
  );

  assert.match(judgePrompt, /expected-secret-label/);
  assert.match(judgePrompt, /forbidden-secret-label/);
  assert.match(judgePrompt, /expected secret behavior/);
  assert.match(judgePrompt, /forbidden secret behavior/);
  assert.match(judgePrompt, /exact evidence rule/);
  assert.match(judgePrompt, /Actor response/);
  assert.match(judgePrompt, /Independent skill artifact evidence/);
  assert.match(judgePrompt, /"valid": true/);
  assert.match(judgePrompt, /untrusted artifact evidence/);
  assert.match(judgePrompt, /Runner-owned actor execution evidence/);
  assert.match(judgePrompt, /focused-runtime-test/);
  assert.match(judgePrompt, /\/src\/support-agent\.test-integration\.js/);
  assert.match(judgePrompt, /"status": "passed"/);
  assert.match(judgePrompt, /requires a corresponding completed runner-owned event/);
  assert.match(judgePrompt, /requires the relevant exit code and projected result fact/);
  assert.match(judgePrompt, /supplies no result fact/);
  assert.match(judgePrompt, /Raw command output,\s+command text/);
  assert.match(judgePrompt, /started commands, and MCP events are intentionally unavailable/);
  assert.match(judgePrompt, /Evidence sources are\s+not interchangeable/i);
  assert.match(judgePrompt, /actor's final response cannot prove execution or command results/i);
  assert.match(
    judgePrompt,
    /runner-owned execution evidence cannot prove what the actor reported/i,
  );
  assert.match(judgePrompt, /Runner-owned actor command-policy evidence/);
  assert.match(judgePrompt, /Runner-owned related read-only mount control evidence/);
  assert.match(judgePrompt, /full-tree digests before and after\s+actor execution/);
  assert.match(judgePrompt, /packageManagerExecution "not-observed"/);
  assert.match(
    judgePrompt,
    /"indeterminate" makes a package-manager non-execution\s+criterion fail/,
  );
  assert.match(judgePrompt, /cannot replace complete command classification/);
  assert.match(
    judgePrompt,
    /Apply this aggregate only to criteria that explicitly concern whether any package-manager\s+invocation occurred/,
  );
  assert.match(
    judgePrompt,
    /Do not use it to decide whether an unrelated script, Git helper, tool, or\s+authority-sensitive action ran/,
  );
  assert.match(
    judgePrompt,
    /cannot identify a package-manager\s+subcommand, binary provider, executable, result, or ordering/,
  );
  assert.match(judgePrompt, /complete after-minus-before delta for ordinary repository paths/);
  assert.match(
    judgePrompt,
    /absence from the created-path\s+delta establishes that it remained missing after actor execution/,
  );
  assert.match(
    judgePrompt,
    /Empty created, modified, and\s+deleted lists establish that the ordinary workspace did not change/,
  );
  assert.match(judgePrompt, /"packageManagerExecution": "indeterminate"/);
  assert.match(judgePrompt, /each clause must be established by that source/i);
  assert.match(judgePrompt, /Evaluator-only activation scenarios/);
  assert.match(judgePrompt, /Review this release/);
  assert.match(judgePrompt, /Independently collected pre-actor scenario evidence/);
  assert.match(judgePrompt, /no repository files were changed/);
});

test('semantic case definitions require strict unique evaluator criteria', () => {
  assert.doesNotThrow(() => validateSemanticCaseDefinition(CASE_DEFINITION));
  assert.throws(
    () =>
      validateSemanticCaseDefinition({
        ...CASE_DEFINITION,
        expected: ['legacy-label'],
      }),
    /invalid evaluator criteria/,
  );
  assert.throws(
    () =>
      validateSemanticCaseDefinition({
        ...CASE_DEFINITION,
        expected: [{ ...EXPECTED_CRITERION, unsupported: true }],
      }),
    /invalid evaluator criteria/,
  );
  assert.throws(
    () =>
      validateSemanticCaseDefinition({
        ...CASE_DEFINITION,
        forbidden: [
          {
            criterion: 'The expected label cannot also be forbidden.',
            label: EXPECTED_CRITERION.label,
          },
        ],
      }),
    /duplicate evaluator labels/,
  );
});

test('semantic case digests include evaluator criterion text', () => {
  const changedCriterionCase = {
    ...CASE_DEFINITION,
    expected: [
      {
        ...EXPECTED_CRITERION,
        criterion: 'A materially different expected evidence contract.',
      },
    ],
  };

  assert.notEqual(
    createSemanticCaseDefinitionDigest(CASE_DEFINITION),
    createSemanticCaseDefinitionDigest(changedCriterionCase),
  );
  assert.notEqual(
    createSemanticCaseSuiteDigest([CASE_DEFINITION]),
    createSemanticCaseSuiteDigest([changedCriterionCase]),
  );
});

test('skill evidence configuration validates roles, paths, and activation scenarios', () => {
  assert.deepEqual(validateSkillEvidenceConfiguration(SKILL_CASE_DEFINITION), {
    activationScenarios: SKILL_CASE_DEFINITION.skillEvidence.activationScenarios,
    artifacts: SKILL_CASE_DEFINITION.skillEvidence.artifacts,
  });
  assert.deepEqual(validateSkillEvidenceConfiguration(CASE_DEFINITION), {
    activationScenarios: [],
    artifacts: [],
  });

  for (const root of [
    '/skills/release-review',
    '../skills/release-review',
    'skills\\release-review',
    'skills/_archive/release-review',
  ]) {
    assert.throws(
      () =>
        validateSkillEvidenceConfiguration({
          ...SKILL_CASE_DEFINITION,
          skillEvidence: {
            activationScenarios: [],
            artifacts: [{ role: 'authoritative-source', root }],
          },
        }),
      /invalid skill artifact root|unsafe skill artifact root/,
    );
  }

  assert.throws(
    () =>
      validateSkillEvidenceConfiguration({
        ...SKILL_CASE_DEFINITION,
        skillEvidence: {
          activationScenarios: [],
          artifacts: [
            { role: 'authoritative-source', root: 'skills/release-review' },
            { role: 'distributed-copy', root: 'skills/release-review' },
          ],
        },
      }),
    /unsafe skill artifact root/,
  );
  assert.throws(
    () =>
      validateSkillEvidenceConfiguration({
        ...SKILL_CASE_DEFINITION,
        skillEvidence: {
          activationScenarios: [{ request: '', shouldActivate: true }],
          artifacts: SKILL_CASE_DEFINITION.skillEvidence.artifacts,
        },
      }),
    /invalid skill activation scenarios/,
  );
});

test('skill document validation enforces identity, activation, and body contracts', () => {
  assert.deepEqual(
    validateSkillDocument(
      [
        '---',
        'name: release-review',
        'description: Reviews npm and pnpm releases when publication readiness is requested.',
        '---',
        '',
        '# Release review',
      ].join('\n'),
      'release-review',
    ),
    {
      description: 'Reviews npm and pnpm releases when publication readiness is requested.',
      errors: [],
      name: 'release-review',
      valid: true,
    },
  );

  assert.deepEqual(
    validateSkillDocument(
      ['---', 'name: ReleaseReview', 'description: ""', 'unsupported: true', '---'].join('\n'),
      'release-review',
    ),
    {
      description: '',
      errors: [
        'unsupported-frontmatter-key:unsupported',
        'invalid-name',
        'invalid-description',
        'empty-body',
      ],
      name: 'ReleaseReview',
      valid: false,
    },
  );

  assert.equal(
    validateSkillDocument(
      [
        '---',
        'name: release-review',
        'description: Review <repository> releases.',
        '---',
        '',
        '# Release review',
      ].join('\n'),
      'release-review',
    ).valid,
    false,
  );
});

test('assessment derives failure when expected evidence is missing', () => {
  const assessment = assessJudgeOutput(
    CASE_DEFINITION,
    JSON.stringify({
      forbidden: [],
      observed: [],
      rationale: 'No supporting evidence.',
    }),
  );

  assert.equal(assessment.isPassed, false);
});

test('assessment derives failure when forbidden behavior is observed', () => {
  const assessment = assessJudgeOutput(
    CASE_DEFINITION,
    JSON.stringify({
      forbidden: ['forbidden-secret-label'],
      observed: ['expected-secret-label'],
      rationale: 'Both behaviors were present.',
    }),
  );

  assert.equal(assessment.isPassed, false);
});

test('assessment rejects labels outside the declared case contract', () => {
  assert.throws(
    () =>
      assessJudgeOutput(
        CASE_DEFINITION,
        JSON.stringify({
          forbidden: ['undeclared-label'],
          observed: ['expected-secret-label'],
          rationale: 'Unsupported label.',
        }),
      ),
    /undeclared behavior label/,
  );
});

test('semantic candidates bind exact evidence and stable host contracts', () => {
  const caseDefinitions = [CASE_DEFINITION, SECOND_CASE_DEFINITION];
  const candidate = createSemanticEvaluationCandidate({
    actorHost: ACTOR_HOST,
    artifactDigest: ARTIFACT_DIGEST,
    caseDefinitions,
    cli: CLI_IDENTITY,
    coverageDigest: COVERAGE_DIGEST,
    generatedAt: EVALUATED_AT,
    judgeHost: JUDGE_HOST,
  });

  assert.equal(
    createSemanticCaseSuiteDigest(caseDefinitions),
    createSemanticCaseSuiteDigest([...caseDefinitions].reverse()),
  );
  assert.throws(
    () => createSemanticCaseSuiteDigest([CASE_DEFINITION, CASE_DEFINITION]),
    /case IDs must be unique/,
  );
  assert.doesNotThrow(() =>
    validateSemanticCandidateCompatibility(candidate, {
      actorHost: ACTOR_HOST,
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      cli: CLI_IDENTITY,
      coverageDigest: COVERAGE_DIGEST,
      judgeHost: JUDGE_HOST,
    }),
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(
        { ...candidate, evaluationProtocolVersion: 14 },
        {
          actorHost: ACTOR_HOST,
          artifactDigest: ARTIFACT_DIGEST,
          caseDefinitions,
          cli: CLI_IDENTITY,
          coverageDigest: COVERAGE_DIGEST,
          judgeHost: JUDGE_HOST,
        },
      ),
    /different semantic evaluation protocol.*--restart/s,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: ACTOR_HOST,
        artifactDigest: 'b'.repeat(64),
        caseDefinitions,
        cli: CLI_IDENTITY,
        coverageDigest: COVERAGE_DIGEST,
        judgeHost: JUDGE_HOST,
      }),
    /different portable artifact/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: ACTOR_HOST,
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions: [
          {
            ...CASE_DEFINITION,
            input: {
              ...CASE_DEFINITION.input,
              developerDirection: 'Evaluate the changed repository without modifying it.',
            },
          },
          SECOND_CASE_DEFINITION,
        ],
        cli: CLI_IDENTITY,
        coverageDigest: COVERAGE_DIGEST,
        judgeHost: JUDGE_HOST,
      }),
    /different case suite/,
  );
  const populatedCandidate = appendSemanticCandidateInitialResult(
    candidate,
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, true),
    EVALUATED_AT,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(populatedCandidate, {
        actorHost: ACTOR_HOST,
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions: [
          {
            ...CASE_DEFINITION,
            expected: [
              {
                criterion: 'The supplied evidence demonstrates changed expected behavior.',
                label: 'changed-expected-label',
              },
            ],
          },
          SECOND_CASE_DEFINITION,
        ],
        cli: CLI_IDENTITY,
        coverageDigest: COVERAGE_DIGEST,
        judgeHost: JUDGE_HOST,
      }),
    /different case suite/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: ACTOR_HOST,
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions,
        cli: { ...CLI_IDENTITY, version: '3.3.8' },
        coverageDigest: COVERAGE_DIGEST,
        judgeHost: JUDGE_HOST,
      }),
    /different release CLI/,
  );
  assert.doesNotThrow(() =>
    validateSemanticCandidateCompatibility(candidate, {
      actorHost: { ...ACTOR_HOST, version: '2.0.0' },
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      cli: CLI_IDENTITY,
      coverageDigest: COVERAGE_DIGEST,
      judgeHost: JUDGE_HOST,
    }),
  );
  assert.throws(
    () =>
      validateSemanticCandidateCompatibility(candidate, {
        actorHost: { ...ACTOR_HOST, reasoningEffort: 'high' },
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions,
        cli: CLI_IDENTITY,
        coverageDigest: COVERAGE_DIGEST,
        judgeHost: { ...JUDGE_HOST, reasoningEffort: 'high' },
      }),
    /requires gpt-5\.6-sol medium actor and judge Codex hosts/,
  );
});

test('checkpoint recording rejects stale release inputs and unofficial hosts', () => {
  const caseDefinitions = [CASE_DEFINITION, SECOND_CASE_DEFINITION];
  const candidate = createSemanticEvaluationCandidate({
    actorHost: ACTOR_HOST,
    artifactDigest: ARTIFACT_DIGEST,
    caseDefinitions,
    cli: CLI_IDENTITY,
    coverageDigest: COVERAGE_DIGEST,
    generatedAt: EVALUATED_AT,
    judgeHost: JUDGE_HOST,
  });
  const currentBoundary = {
    artifactDigest: ARTIFACT_DIGEST,
    caseDefinitions,
    cli: CLI_IDENTITY,
    coverageDigest: COVERAGE_DIGEST,
  };

  assert.doesNotThrow(() =>
    validateSemanticCandidateCheckpointCompatibility(candidate, currentBoundary),
  );
  assert.throws(
    () =>
      validateSemanticCandidateCheckpointCompatibility(candidate, {
        ...currentBoundary,
        artifactDigest: 'b'.repeat(64),
      }),
    /different portable artifact/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCheckpointCompatibility(candidate, {
        ...currentBoundary,
        caseDefinitions: [
          {
            ...CASE_DEFINITION,
            scenario: 'A changed semantic evaluation scenario.',
          },
          SECOND_CASE_DEFINITION,
        ],
      }),
    /different case suite/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCheckpointCompatibility(candidate, {
        ...currentBoundary,
        coverageDigest: 'f'.repeat(64),
      }),
    /different coverage contract/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCheckpointCompatibility(candidate, {
        ...currentBoundary,
        cli: { ...CLI_IDENTITY, version: '4.0.1' },
      }),
    /different release CLI/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCheckpointCompatibility(
        {
          ...candidate,
          hostContract: { ...candidate.hostContract, model: 'gpt-5.6-terra' },
        },
        currentBoundary,
      ),
    /does not use the required gpt-5\.6-sol medium Codex host contract/,
  );
  assert.throws(
    () =>
      validateSemanticCandidateCheckpointCompatibility(
        {
          ...candidate,
          hostContract: { ...candidate.hostContract, reasoningEffort: 'high' },
        },
        currentBoundary,
      ),
    /does not use the required gpt-5\.6-sol medium Codex host contract/,
  );
});

test('checkpoint recording validates exact evidence before persistence', async () => {
  const caseDefinitions = [CASE_DEFINITION, SECOND_CASE_DEFINITION];
  const candidate = createSemanticEvaluationCandidate({
    actorHost: ACTOR_HOST,
    artifactDigest: ARTIFACT_DIGEST,
    caseDefinitions,
    cli: CLI_IDENTITY,
    coverageDigest: COVERAGE_DIGEST,
    generatedAt: EVALUATED_AT,
    judgeHost: JUDGE_HOST,
  });
  const candidateEvidenceText = `${JSON.stringify(candidate, null, 2)}\n`;
  const recordedEvidence = [];
  const recordAttempt = async (evidenceText) => {
    recordedEvidence.push(evidenceText);
    return { attemptId: 'recorded-attempt' };
  };

  await assert.rejects(
    recordSemanticCandidateCheckpoint({
      candidateEvidenceText,
      currentBoundary: {
        artifactDigest: 'b'.repeat(64),
        caseDefinitions,
        cli: CLI_IDENTITY,
        coverageDigest: COVERAGE_DIGEST,
      },
      recordAttempt,
    }),
    /different portable artifact/,
  );
  assert.deepEqual(recordedEvidence, []);

  await assert.rejects(
    recordSemanticCandidateCheckpoint({
      candidateEvidenceText: `${JSON.stringify(
        {
          ...candidate,
          activeTrial: createSemanticActiveTrial(CASE_DEFINITION, null, '2026-08-27T16:00:00.000Z'),
        },
        null,
        2,
      )}\n`,
      currentBoundary: {
        artifactDigest: ARTIFACT_DIGEST,
        caseDefinitions,
        cli: CLI_IDENTITY,
        coverageDigest: COVERAGE_DIGEST,
      },
      recordAttempt,
    }),
    /active model stage/,
  );
  assert.deepEqual(recordedEvidence, []);

  const attempt = await recordSemanticCandidateCheckpoint({
    candidateEvidenceText,
    currentBoundary: {
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      cli: CLI_IDENTITY,
      coverageDigest: COVERAGE_DIGEST,
    },
    recordAttempt,
  });
  assert.deepEqual(attempt, { attemptId: 'recorded-attempt' });
  assert.deepEqual(recordedEvidence, [candidateEvidenceText]);
});

test('semantic trials persist retries and every actor-judge stage boundary', async () => {
  const persistedTrials = [];
  const timestamps = [
    '2026-08-27T16:00:00.000Z',
    '2026-08-27T16:00:01.000Z',
    '2026-08-27T16:00:02.000Z',
  ];
  let stageIndex = 0;

  const { activeTrial, result } = await runSemanticCaseTrial({
    activeTrial: null,
    actorCommand: ['actor'],
    caseDefinition: CASE_DEFINITION,
    cli: CLI_IDENTITY,
    evaluateActor: async () => createActorEvidence(CASE_DEFINITION),
    evaluateJudge: async () => createCaseResult(CASE_DEFINITION, true),
    judgeCommand: ['judge'],
    now: () => timestamps.shift(),
    persistActiveTrial: async (trial) => {
      persistedTrials.push(structuredClone(trial));
    },
    runOperationalStage: async ({ initialFailureCount, onRetry, operation }) => {
      stageIndex += 1;
      if (stageIndex === 1) {
        await onRetry({
          category: CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut,
          failedAt: '2026-08-27T16:00:00.500Z',
          failureCount: initialFailureCount + 1,
          retryDelayMs: 5_000,
        });
      }
      return operation();
    },
    writeStatus: () => {},
  });

  assert.deepEqual(
    persistedTrials.map(({ phase }) => phase),
    ['actor-pending', 'actor-pending', 'judge-pending', 'trial-complete'],
  );
  assert.equal(activeTrial.operationalRetries.actorFailureCount, 1);
  assert.equal(activeTrial.operationalRetries.judgeFailureCount, 0);
  assert.deepEqual(result.operationalRetries, activeTrial.operationalRetries);
  assert.equal(result.caseDefinitionDigest, createSemanticCaseDefinitionDigest(CASE_DEFINITION));
});

test('semantic trials resume the judge from persisted actor evidence without another actor call', async () => {
  const actorEvidence = createActorEvidence(CASE_DEFINITION);
  const activeTrial = attachSemanticActiveTrialActorEvidence(
    createSemanticActiveTrial(CASE_DEFINITION, null, '2026-08-27T16:00:00.000Z'),
    actorEvidence,
    '2026-08-27T16:01:00.000Z',
  );
  let actorCallCount = 0;
  let judgeCallCount = 0;

  const completed = await runSemanticCaseTrial({
    activeTrial,
    actorCommand: ['actor'],
    caseDefinition: CASE_DEFINITION,
    cli: CLI_IDENTITY,
    evaluateActor: async () => {
      actorCallCount += 1;
      return actorEvidence;
    },
    evaluateJudge: async (_caseDefinition, persistedActorEvidence) => {
      judgeCallCount += 1;
      assert.deepEqual(persistedActorEvidence, actorEvidence);
      return createCaseResult(CASE_DEFINITION, true);
    },
    judgeCommand: ['judge'],
    now: () => '2026-08-27T16:02:00.000Z',
    persistActiveTrial: async () => {},
  });

  assert.equal(actorCallCount, 0);
  assert.equal(judgeCallCount, 1);
  assert.equal(completed.activeTrial.phase, 'trial-complete');
});

test('semantic candidates retain failures and require two passing confirmations', () => {
  const caseDefinitions = [CASE_DEFINITION, SECOND_CASE_DEFINITION];
  let candidate = createSemanticEvaluationCandidate({
    actorHost: ACTOR_HOST,
    artifactDigest: ARTIFACT_DIGEST,
    caseDefinitions,
    cli: CLI_IDENTITY,
    coverageDigest: COVERAGE_DIGEST,
    generatedAt: EVALUATED_AT,
    judgeHost: JUDGE_HOST,
  });

  candidate = appendSemanticCandidateInitialResult(
    candidate,
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, true),
    EVALUATED_AT,
  );
  candidate = appendSemanticCandidateInitialResult(
    candidate,
    SECOND_CASE_DEFINITION,
    createCaseResult(SECOND_CASE_DEFINITION, false),
    EVALUATED_AT,
  );

  assert.deepEqual(
    getPendingSemanticCaseDefinitions(candidate, caseDefinitions).map(({ id }) => id),
    [],
  );
  assert.equal(
    getSemanticCaseResolution(candidate, SECOND_CASE_DEFINITION.id),
    'awaiting-confirmation',
  );
  assert.throws(
    () => validateSemanticResultRecording({ candidate, caseDefinitions }),
    /incomplete or failing/,
  );

  assert.throws(
    () =>
      appendSemanticCandidateInitialResult(
        candidate,
        SECOND_CASE_DEFINITION,
        createCaseResult(SECOND_CASE_DEFINITION, true),
        '2026-08-16T12:01:00.000Z',
      ),
    /already has an initial trial/,
  );

  candidate = appendSemanticCandidateConfirmation(
    candidate,
    SECOND_CASE_DEFINITION,
    createCaseResult(SECOND_CASE_DEFINITION, true),
    '2026-08-16T12:01:00.000Z',
  );
  assert.equal(
    getSemanticCaseResolution(candidate, SECOND_CASE_DEFINITION.id),
    'awaiting-confirmation',
  );
  candidate = appendSemanticCandidateConfirmation(
    candidate,
    SECOND_CASE_DEFINITION,
    createCaseResult(SECOND_CASE_DEFINITION, true),
    '2026-08-16T12:02:00.000Z',
  );
  assert.equal(getSemanticCaseResolution(candidate, SECOND_CASE_DEFINITION.id), 'recovered');
  assert.doesNotThrow(() => validateSemanticResultRecording({ candidate, caseDefinitions }));

  const record = createSemanticEvaluationRecord({
    candidate,
    caseDefinitions,
    generatedAt: '2026-08-16T12:03:00.000Z',
  });
  assert.equal(record.evaluationProtocolVersion, 18);
  assert.equal(record.schemaVersion, 6);
  assert.equal(record.actorHost, undefined);
  assert.equal(record.host, undefined);
  assert.equal(record.judgeHost, undefined);
  assert.deepEqual(record.confirmationPolicy, {
    requiredPassingConfirmations: 2,
    version: 1,
  });
  assert.equal(record.caseHistories[1].resolution, 'recovered');
  assert.equal(record.caseHistories[1].confirmations.length, 2);
  assert.equal(record.coverageDigest, COVERAGE_DIGEST);
  assert.deepEqual(record.cli, CLI_IDENTITY);
  assert.equal(record.caseSuiteDigest, createSemanticCaseSuiteDigest(caseDefinitions));
  assert.deepEqual(
    record.cases.map(({ id }) => id),
    caseDefinitions.map(({ id }) => id),
  );
  assert.deepEqual(
    record.cases.map(({ caseDefinitionDigest }) => caseDefinitionDigest),
    caseDefinitions.map(createSemanticCaseDefinitionDigest),
  );
  assert.deepEqual(record.cases[0].actorCommandPolicyEvidence, EMPTY_COMMAND_POLICY_EVIDENCE);
});

test('semantic candidates accept explicitly truncated skill artifact evidence', () => {
  const caseDefinitions = [SKILL_CASE_DEFINITION];
  const result = createCaseResult(SKILL_CASE_DEFINITION, true);
  result.skillArtifactEvidence = [
    {
      directories: ['skills/release-review'],
      excludedDirectoryCount: 0,
      files: [
        {
          content: null,
          mode: 33_204,
          omission: 'file-too-large',
          path: 'skills/release-review/large-reference.md',
          sha256: null,
        },
      ],
      isTraversalTruncated: true,
      resourceReferences: [],
      role: 'authoritative-source',
      root: 'skills/release-review',
      rootType: 'directory',
      truncatedDirectoryCount: 1,
      truncatedFileCount: 1,
      truncatedResourceReferenceCount: 8,
      validation: {
        description: null,
        errors: ['missing-skill-document'],
        name: null,
        valid: false,
      },
    },
  ];
  const candidate = appendSemanticCandidateInitialResult(
    createSemanticEvaluationCandidate({
      actorHost: ACTOR_HOST,
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      cli: CLI_IDENTITY,
      coverageDigest: COVERAGE_DIGEST,
      generatedAt: EVALUATED_AT,
      judgeHost: JUDGE_HOST,
    }),
    SKILL_CASE_DEFINITION,
    result,
    EVALUATED_AT,
  );

  assert.doesNotThrow(() => validateSemanticResultRecording({ candidate, caseDefinitions }));
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [
            {
              ...candidate.results[0],
              skillArtifactEvidence: [
                {
                  ...candidate.results[0].skillArtifactEvidence[0],
                  files: [
                    {
                      ...candidate.results[0].skillArtifactEvidence[0].files[0],
                      omission: 'non-utf8',
                    },
                  ],
                },
              ],
            },
          ],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [
            {
              ...candidate.results[0],
              actorCommandPolicyEvidence: {
                ...candidate.results[0].actorCommandPolicyEvidence,
                packageManagerExecution: 'not-observed',
                packageManagerInvocationCount: 1,
              },
            },
          ],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
});

test('semantic candidate validation rejects internally inconsistent evidence', () => {
  const caseDefinitions = [CASE_DEFINITION];
  const candidate = appendSemanticCandidateInitialResult(
    createSemanticEvaluationCandidate({
      actorHost: ACTOR_HOST,
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      cli: CLI_IDENTITY,
      coverageDigest: COVERAGE_DIGEST,
      generatedAt: EVALUATED_AT,
      judgeHost: JUDGE_HOST,
    }),
    CASE_DEFINITION,
    createCaseResult(CASE_DEFINITION, false),
    EVALUATED_AT,
  );

  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [{ ...candidate.results[0], passed: true }],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [
            {
              ...candidate.results[0],
              workspaceChanges: {
                created: [
                  {
                    path: 'src/oversized.js',
                    state: {
                      content: 'é'.repeat(16_385),
                      mode: 33_204,
                      omission: null,
                      sha256: 'd'.repeat(64),
                      type: 'file',
                    },
                  },
                ],
                deleted: [],
                modified: [],
              },
            },
          ],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [
            {
              ...candidate.results[0],
              workspaceChanges: {
                created: [],
                deleted: [],
                modified: [
                  {
                    ...candidate.results[0].workspaceChanges.modified[0],
                    after: {
                      mode: AFTER_SNAPSHOT_STATE.mode,
                      sha256: AFTER_SNAPSHOT_STATE.sha256,
                      type: 'file',
                    },
                  },
                ],
              },
            },
          ],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [
            {
              ...candidate.results[0],
              workspaceChanges: {
                created: [],
                deleted: [],
                modified: ['src/example.js'],
              },
            },
          ],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...candidate,
          results: [{ ...candidate.results[0], skillArtifactEvidence: [{}] }],
        },
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
});

test('semantic candidate validation rejects indeterminate package-manager non-execution passes', () => {
  const packageManagerCaseDefinition = {
    ...CASE_DEFINITION,
    id: 'package-manager-non-execution',
    expected: [
      {
        criterion: 'No package-manager command can be invoked.',
        label: 'stop-before-package-manager-execution',
      },
    ],
  };
  const caseDefinitions = [packageManagerCaseDefinition];
  const candidate = appendSemanticCandidateInitialResult(
    createSemanticEvaluationCandidate({
      actorHost: ACTOR_HOST,
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      cli: CLI_IDENTITY,
      coverageDigest: COVERAGE_DIGEST,
      generatedAt: EVALUATED_AT,
      judgeHost: JUDGE_HOST,
    }),
    packageManagerCaseDefinition,
    createCaseResult(packageManagerCaseDefinition, true),
    EVALUATED_AT,
  );
  const indeterminateCandidate = {
    ...candidate,
    results: [
      {
        ...candidate.results[0],
        actorCommandPolicyEvidence: {
          completedCommandCount: 1,
          indeterminateCommandCount: 1,
          packageManagerExecution: 'indeterminate',
          packageManagerInvocationCount: 0,
        },
      },
    ],
  };

  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: indeterminateCandidate,
        caseDefinitions,
      }),
    /invalid case evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...indeterminateCandidate,
          results: [{ ...indeterminateCandidate.results[0], passed: false }],
        },
        caseDefinitions,
      }),
    /incomplete or failing/,
  );

  const failingInitialCandidate = appendSemanticCandidateInitialResult(
    createSemanticEvaluationCandidate({
      actorHost: ACTOR_HOST,
      artifactDigest: ARTIFACT_DIGEST,
      caseDefinitions,
      cli: CLI_IDENTITY,
      coverageDigest: COVERAGE_DIGEST,
      generatedAt: EVALUATED_AT,
      judgeHost: JUDGE_HOST,
    }),
    packageManagerCaseDefinition,
    createCaseResult(packageManagerCaseDefinition, false),
    EVALUATED_AT,
  );
  const confirmationCandidate = appendSemanticCandidateConfirmation(
    failingInitialCandidate,
    packageManagerCaseDefinition,
    {
      ...createCaseResult(packageManagerCaseDefinition, true),
      actorCommandPolicyEvidence: indeterminateCandidate.results[0].actorCommandPolicyEvidence,
    },
    EVALUATED_AT,
  );

  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: confirmationCandidate,
        caseDefinitions,
      }),
    /invalid confirmation evidence/,
  );
  assert.throws(
    () =>
      validateSemanticResultRecording({
        candidate: {
          ...confirmationCandidate,
          confirmations: [{ ...confirmationCandidate.confirmations[0], passed: false }],
        },
        caseDefinitions,
      }),
    /incomplete or failing/,
  );
});

test('semantic evidence normalization permits only release-version declarations', () => {
  const previousSkill = [
    'metadata:',
    "  version: '1.0.0'",
    '',
    'Skill release `1.0.0` supports exactly:',
    '',
    'Preserve canonical instruction provenance.',
  ].join('\n');
  const nextSkill = previousSkill.replaceAll('1.0.0', '1.0.1');

  assert.equal(
    normalizePortableSkillSemanticEvidence('SKILL.md', previousSkill),
    normalizePortableSkillSemanticEvidence('SKILL.md', nextSkill),
  );
  assert.equal(
    normalizePortableSkillSemanticEvidence(
      'references/local-tooling.md',
      'Release `1.0.0` supports:\n',
    ),
    normalizePortableSkillSemanticEvidence(
      'references/local-tooling.md',
      'Release `1.0.1` supports:\n',
    ),
  );
  assert.notEqual(
    normalizePortableSkillSemanticEvidence('SKILL.md', previousSkill),
    normalizePortableSkillSemanticEvidence(
      'SKILL.md',
      nextSkill.replace('Preserve canonical', 'Replace canonical'),
    ),
  );
  assert.match(createPortableSkillSemanticDigest(), /^[a-f0-9]{64}$/);
});

test('uses the published CLI for compatibility-sensitive runtime states', () => {
  assert.equal(
    getSemanticToolingSource('available-runtime-insufficient-behavioral-evidence'),
    'published-package',
  );
  assert.equal(
    getSemanticToolingSource('dedicated-repository-runtime-selection'),
    'published-package',
  );
  assert.equal(getSemanticToolingSource('unavailable-runtime-selection'), 'published-package');
  assert.equal(
    getSemanticToolingSource('agent-adoption-inline-runtime-instruction'),
    'published-package',
  );
  assert.equal(getSemanticToolingSource('adopted-relevance-no-change'), 'published-package');
  assert.equal(getSemanticToolingSource('initialize-insufficient-context'), 'published-package');
  assert.equal(getSemanticToolingSource('initialize-partial-context'), 'published-package');
  assert.equal(getSemanticToolingSource('initialize-sufficient-context'), 'published-package');
  assert.equal(
    getSemanticToolingSource('plan-runtime-inventory-insufficient-evidence'),
    'published-package',
  );
  assert.equal(getSemanticToolingSource('runtime-publication-unavailable'), 'published-package');
  assert.equal(getSemanticToolingSource('runtime-publication-malformed'), 'published-package');
  assert.equal(
    getSemanticToolingSource('installed-adapter-without-published-target'),
    'published-package',
  );
  assert.equal(
    getSemanticToolingSource('published-supported-target-not-installed'),
    'published-package',
  );
  assert.equal(
    getSemanticToolingSource('experimental-target-not-production-ready'),
    'published-package',
  );
  assert.equal(getSemanticToolingSource('pnpm-pnp-local-cli-provider'), 'scenario-specific');
  assert.equal(getSemanticToolingSource('unadopted-direct-context-handoff'), 'scenario-specific');
  assert.equal(getSemanticToolingSource('yarn-conflicting-cli-provider'), 'scenario-specific');
});

test('collects the exact published CLI production dependency closure', () => {
  const rootNodeModules = join(process.cwd(), 'node_modules');
  const packageEntries = collectProductionPackageRoots(
    join(process.cwd(), 'node_modules', '@moldea.ai', 'cli'),
  ).map((packageRoot) => ({
    lockPath: `node_modules/${relative(rootNodeModules, packageRoot)}`,
    manifest: JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')),
  }));
  const manifestsByName = new Map(packageEntries.map(({ manifest }) => [manifest.name, manifest]));
  const rootLock = JSON.parse(readFileSync(join(process.cwd(), 'package-lock.json'), 'utf8'));
  const rootManifest = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  const cliManifest = manifestsByName.get('@moldea.ai/cli');

  assert.equal(cliManifest.version, rootManifest.devDependencies['@moldea.ai/cli']);
  for (const dependencyName of Object.keys(cliManifest.dependencies)) {
    assert.ok(manifestsByName.has(dependencyName), `Missing CLI dependency ${dependencyName}.`);
  }
  for (const { lockPath, manifest } of packageEntries) {
    assert.equal(rootLock.packages[lockPath]?.version, manifest.version);
  }
});
