import assert from 'node:assert/strict';
import { test } from 'vitest';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';
import type { IMoldeaResourceBudget } from '../cases/index.ts';

import {
  createMoldeaResourceEvidence,
  hasPassingMoldeaActivation,
  hasPassingMoldeaResourceBudget,
  hasPassingMoldeaResourceContainment,
  hasValidActorExecutionEvidence,
  hasValidMoldeaResourceEvidence,
  projectActorExecutionEvidenceEvent as projectActorExecutionEvidenceEventRaw,
} from './actor-evidence.ts';
import type {
  IMoldeaResourceEvidence,
  ISemanticActorExecutionEvidence,
  ISemanticActorExecutionEvidenceOptions,
} from './types.ts';

const OPTIONS = {
  cliVersion: '9.0.0',
  jsonSchemaVersion: 5,
} satisfies ISemanticActorExecutionEvidenceOptions;
const LAUNCHER_PREFIX =
  'node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt --';

const createLauncherCommand = (operation: string, ...arguments_: string[]): string =>
  [LAUNCHER_PREFIX, operation, ...arguments_].join(' ');

const GATE_COMMAND = 'node /mnt/.agents/skills/moldea/scripts/relevance-gate.mjs --repository /mnt';
const MANAGED_README_COMMAND =
  'node /mnt/.agents/skills/moldea/scripts/managed-readme.mjs --repository /mnt';

const createEnvelope = (command: string, result: Record<string, unknown>): string => {
  const completeResult =
    command === 'validate'
      ? { diagnosticCount: 0, errorCount: 0, warningCount: 0, valid: true, ...result }
      : command === 'inspect'
        ? {
            counts: { diagnostics: 0, errors: 0, warnings: 0 },
            valid: true,
            ...result,
          }
        : result;
  return JSON.stringify({
    schemaVersion: 5,
    cliVersion: '9.0.0',
    command,
    status: 'valid',
    result: completeResult,
    error: null,
  });
};

const createErrorEnvelope = (command: string): string =>
  JSON.stringify({
    schemaVersion: 5,
    cliVersion: '9.0.0',
    command,
    status: 'error',
    result: null,
    error: {
      code: 'CONTENT_PATH_INVALID',
      details: {},
      message: 'The requested canonical content path is invalid.',
      path: null,
      retryable: false,
      source: 'input',
    },
  });

const createEvent = (
  command: string,
  output: string,
  {
    exitCode = 0,
    status = 'completed',
  }: { exitCode?: number; status?: 'completed' | 'failed' } = {},
): unknown => ({
  type: 'item.completed',
  item: {
    type: 'command_execution',
    command,
    status,
    exit_code: exitCode,
    aggregated_output: output,
  },
});

const projectActorExecutionEvidenceEvent = (
  event: unknown,
  options: ISemanticActorExecutionEvidenceOptions,
): ISemanticActorExecutionEvidence => {
  const evidence = projectActorExecutionEvidenceEventRaw(event, options);
  assert(evidence !== null);
  return evidence;
};

test('projects bounded gate results without counting them as moldea CLI operations', () => {
  const relationshipMiss = projectActorExecutionEvidenceEvent(
    createEvent(GATE_COMMAND, '0\n'),
    OPTIONS,
  );
  const adoptionHit = projectActorExecutionEvidenceEvent(
    createEvent(`${GATE_COMMAND} --adoption-only`, '1\n'),
    OPTIONS,
  );
  assert.deepEqual(relationshipMiss.item.outputEvidence.facts, [
    { kind: 'relevance-gate-result', matched: false, mode: 'relationship' },
  ]);
  assert.deepEqual(adoptionHit.item.outputEvidence.facts, [
    { kind: 'relevance-gate-result', matched: true, mode: 'adoption-only' },
  ]);
  assert.equal(hasValidActorExecutionEvidence([relationshipMiss, adoptionHit], OPTIONS), true);
  assert.deepEqual(
    createMoldeaResourceEvidence([relationshipMiss, adoptionHit], OPTIONS).operations,
    [],
  );

  const malformedOutput = projectActorExecutionEvidenceEvent(
    createEvent(GATE_COMMAND, '1\nextra'),
    OPTIONS,
  );
  assert.equal(malformedOutput.item.outputEvidence.disposition, 'unrecognized');
});

test('projects exact managed README writer results without retaining output text', () => {
  const rejection = projectActorExecutionEvidenceEvent(
    createEvent(
      MANAGED_README_COMMAND,
      'managed README update failed: README.md must contain exactly one moldea marker pair\n',
      { exitCode: 1, status: 'failed' },
    ),
    OPTIONS,
  );
  const unchanged = projectActorExecutionEvidenceEvent(
    createEvent(MANAGED_README_COMMAND, 'unchanged\n'),
    OPTIONS,
  );
  assert.deepEqual(rejection.item.outputEvidence.facts, [
    { kind: 'managed-readme-result', status: 'invalid-marker-pair' },
  ]);
  assert.deepEqual(unchanged.item.outputEvidence.facts, [
    { kind: 'managed-readme-result', status: 'unchanged' },
  ]);
  assert.equal(hasValidActorExecutionEvidence([rejection, unchanged], OPTIONS), true);
  assert.deepEqual(createMoldeaResourceEvidence([rejection, unchanged], OPTIONS).operations, []);

  const unrecognized = projectActorExecutionEvidenceEvent(
    createEvent(MANAGED_README_COMMAND, 'managed README update failed: other error\n', {
      exitCode: 1,
      status: 'failed',
    }),
    OPTIONS,
  );
  assert.equal(unrecognized.item.outputEvidence.disposition, 'unrecognized');
});

const createNodeTestOutput = ({
  cancelled = 0,
  failed = 0,
  passed = 1,
  skipped = 0,
  tests = 1,
  todo = 0,
}: {
  cancelled?: number;
  failed?: number;
  passed?: number;
  skipped?: number;
  tests?: number;
  todo?: number;
} = {}): string =>
  [
    '✔ focused behavior (4.2ms)',
    `ℹ tests ${tests}`,
    'ℹ suites 0',
    `ℹ pass ${passed}`,
    `ℹ fail ${failed}`,
    `ℹ cancelled ${cancelled}`,
    `ℹ skipped ${skipped}`,
    `ℹ todo ${todo}`,
    'ℹ duration_ms 12.5',
  ].join('\n');

test('projects launcher-backed content-free inspect metadata and exact output bytes', () => {
  const output = createEnvelope('inspect', {
    page: { cursor: null, records: [{ kind: 'context', asset: { path: '/moldea/project.md' } }] },
  });
  const evidence = projectActorExecutionEvidenceEvent(
    createEvent(createLauncherCommand('inspect', '--json', '--max-output-bytes', '65536'), output),
    OPTIONS,
  );
  assert.equal(hasValidActorExecutionEvidence([evidence], OPTIONS), true);
  assert.deepEqual(evidence.item.outputEvidence.facts[0], {
    cliVersion: '9.0.0',
    command: 'inspect',
    containsContent: false,
    errorCount: 0,
    errorCode: null,
    errorPresent: false,
    hasNextPage: false,
    kind: 'moldea-cli-envelope',
    pageRecordCount: 1,
    relevant: null,
    resultPresent: true,
    schemaVersion: 5,
    status: 'valid',
    warningCount: 0,
  });
  assert.equal(evidence.item.outputEvidence.byteCount, Buffer.byteLength(output));
});

test('recognizes relationship scope and content only through bounded launcher commands', () => {
  const scope = projectActorExecutionEvidenceEvent(
    createEvent(
      `printf '/src/example.ts\\0' | ${createLauncherCommand(
        'scope',
        '--paths-stdin',
        '--json',
        '--max-output-bytes',
        '65536',
      )}`,
      createEnvelope('scope', {
        relevant: true,
        page: { cursor: null, records: [{ kind: 'match' }] },
      }),
    ),
    OPTIONS,
  );
  const content = projectActorExecutionEvidenceEvent(
    createEvent(
      createLauncherCommand(
        'content',
        '--path',
        '/moldea/project.md',
        '--json',
        '--max-output-bytes',
        '65536',
      ),
      createEnvelope('content', { chunk: { content: 'bounded' } }),
    ),
    OPTIONS,
  );
  const resource = createMoldeaResourceEvidence([scope, content], OPTIONS);
  assert.deepEqual(resource.operations, ['scope', 'content']);
  assert.equal(
    hasPassingMoldeaResourceBudget(resource, {
      activation: 'relationship',
      minimumMoldeaCommands: 1,
      maximumMoldeaCommands: 4,
      maximumMoldeaOutputBytes: 262_144,
    }),
    true,
  );
});

test('projects failed content commands without requiring a canonical body', () => {
  const evidence = projectActorExecutionEvidenceEvent(
    createEvent(
      createLauncherCommand(
        'content',
        '--path',
        '/moldea/missing.md',
        '--json',
        '--max-output-bytes',
        '65536',
      ),
      createErrorEnvelope('content'),
      { exitCode: 2 },
    ),
    OPTIONS,
  );

  assert.equal(hasValidActorExecutionEvidence([evidence], OPTIONS), true);
  assert.deepEqual(evidence.item.outputEvidence.facts[0], {
    cliVersion: '9.0.0',
    command: 'content',
    containsContent: false,
    errorCount: null,
    errorCode: 'CONTENT_PATH_INVALID',
    errorPresent: true,
    hasNextPage: false,
    kind: 'moldea-cli-envelope',
    pageRecordCount: 0,
    relevant: null,
    resultPresent: false,
    schemaVersion: 5,
    status: 'error',
    warningCount: null,
  });
});

test('rejects unsafe CLI error classifications without retaining error bodies', () => {
  const unsafeOutput = JSON.stringify({
    schemaVersion: 5,
    cliVersion: '9.0.0',
    command: 'content',
    status: 'error',
    result: null,
    error: {
      code: '/private/path leaked',
      message: 'sensitive body',
    },
  });
  const evidence = projectActorExecutionEvidenceEvent(
    createEvent(createLauncherCommand('content', '--json'), unsafeOutput, {
      exitCode: 2,
      status: 'failed',
    }),
    OPTIONS,
  );

  assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized');
  assert.equal(JSON.stringify(evidence).includes('private'), false);
  assert.equal(JSON.stringify(evidence).includes('sensitive'), false);
});

test('accepts zero CLI consumption for informational and abstention paths', () => {
  const resource = createMoldeaResourceEvidence([], OPTIONS);
  assert.equal(hasValidMoldeaResourceEvidence(resource), true);

  for (const activation of ['abstain', 'informational'] as const) {
    assert.equal(
      hasPassingMoldeaResourceBudget(resource, {
        activation,
        minimumMoldeaCommands: 0,
        maximumMoldeaCommands: 0,
        maximumMoldeaOutputBytes: 0,
      }),
      true,
    );
  }
});

test('separates valid resource evidence from a case-budget miss', () => {
  const resource = createMoldeaResourceEvidence([], OPTIONS);
  assert.equal(hasValidMoldeaResourceEvidence(resource), true);
  assert.equal(
    hasPassingMoldeaResourceBudget(resource, {
      activation: 'relationship',
      minimumMoldeaCommands: 1,
      maximumMoldeaCommands: 4,
      maximumMoldeaOutputBytes: 262_144,
    }),
    false,
  );
  assert.equal(
    hasValidMoldeaResourceEvidence({ ...resource, commandCount: 1, operations: [] }),
    false,
  );
  assert.equal(hasValidMoldeaResourceEvidence({ ...resource, operations: ['unsupported'] }), false);
});

test('classifies activation and upper resource containment independently', () => {
  const relationshipBudget: IMoldeaResourceBudget = {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262_144,
  };
  const zeroCommandEvidence = createMoldeaResourceEvidence([], OPTIONS);
  assert.equal(hasPassingMoldeaActivation(zeroCommandEvidence, relationshipBudget), false);
  assert.equal(hasPassingMoldeaResourceContainment(zeroCommandEvidence, relationshipBudget), true);
  assert.equal(hasPassingMoldeaResourceBudget(zeroCommandEvidence, relationshipBudget), false);

  const createResourceEvidence = (
    operations: IMoldeaResourceEvidence['operations'],
    stdoutByteCount = operations.length,
  ): IMoldeaResourceEvidence => ({
    commandCount: operations.length,
    maximumInvocationByteCount: operations.length === 0 ? 0 : 1,
    modelVisibleToolOutputByteCount: stdoutByteCount,
    operations,
    stdoutByteCount,
  });
  const wrongOrderEvidence = createResourceEvidence(['content', 'scope']);
  assert.equal(hasPassingMoldeaActivation(wrongOrderEvidence, relationshipBudget), false);
  assert.equal(hasPassingMoldeaResourceContainment(wrongOrderEvidence, relationshipBudget), true);

  const blockedBudget: IMoldeaResourceBudget = {
    ...relationshipBudget,
    activation: 'blocked',
  };
  assert.equal(hasPassingMoldeaActivation(createResourceEvidence(['scope']), blockedBudget), false);
  assert.equal(
    hasPassingMoldeaActivation(createResourceEvidence(['content']), blockedBudget),
    true,
  );

  const excessiveCommandEvidence = createResourceEvidence([
    'content',
    'content',
    'content',
    'content',
    'content',
  ]);
  const directBudget: IMoldeaResourceBudget = { ...relationshipBudget, activation: 'direct' };
  assert.equal(hasPassingMoldeaActivation(zeroCommandEvidence, directBudget), true);
  assert.equal(hasPassingMoldeaActivation(excessiveCommandEvidence, directBudget), true);
  assert.equal(hasPassingMoldeaResourceContainment(excessiveCommandEvidence, directBudget), false);
  assert.equal(hasPassingMoldeaResourceBudget(excessiveCommandEvidence, directBudget), false);
});

test('rejects inspect output that contains canonical document bodies', () => {
  assert.throws(() =>
    projectActorExecutionEvidenceEvent(
      createEvent(
        createLauncherCommand('inspect', '--json', '--max-output-bytes', '65536'),
        createEnvelope('inspect', {
          page: { cursor: null, records: [{ asset: { content: 'leak' } }] },
        }),
      ),
      OPTIONS,
    ),
  );
});

test('recognizes validate and fixed-boundary composition launcher operations', () => {
  const validate = projectActorExecutionEvidenceEvent(
    createEvent(
      createLauncherCommand('validate', '--json', '--max-output-bytes', '65536'),
      createEnvelope('validate', { valid: true }),
    ),
    OPTIONS,
  );
  const composition = projectActorExecutionEvidenceEvent(
    createEvent(
      createLauncherCommand('composition', '--json'),
      createEnvelope('composition', { adapters: [] }),
    ),
    OPTIONS,
  );

  assert.deepEqual(createMoldeaResourceEvidence([validate, composition], OPTIONS).operations, [
    'validate',
    'composition',
  ]);
});

test('projects standalone validation continuation pages independently', () => {
  const createInvalidValidationEnvelope = (cursor: string | null): string =>
    JSON.stringify({
      schemaVersion: 5,
      cliVersion: '9.0.0',
      command: 'validate',
      status: 'invalid',
      result: {
        diagnosticCount: 2,
        errorCount: 1,
        warningCount: 1,
        valid: false,
        page: { cursor, records: [{ kind: 'diagnostic' }] },
      },
      error: null,
    });
  const firstPage = projectActorExecutionEvidenceEvent(
    createEvent(
      createLauncherCommand('validate', '--json', '--max-output-bytes', '65536'),
      createInvalidValidationEnvelope('opaque.snapshot.cursor'),
      { exitCode: 1, status: 'failed' },
    ),
    OPTIONS,
  );
  const finalPage = projectActorExecutionEvidenceEvent(
    createEvent(
      createLauncherCommand(
        'validate',
        '--json',
        '--max-output-bytes',
        '65536',
        '--cursor',
        'opaque.snapshot.cursor',
      ),
      createInvalidValidationEnvelope(null),
      { exitCode: 1, status: 'failed' },
    ),
    OPTIONS,
  );

  assert.deepEqual(
    [firstPage, finalPage].map(({ item }) => {
      const [fact] = item.outputEvidence.facts;
      assert.equal(fact?.kind, 'moldea-cli-envelope');
      return fact?.kind === 'moldea-cli-envelope' ? fact.hasNextPage : null;
    }),
    [true, false],
  );
  assert.deepEqual(createMoldeaResourceEvidence([firstPage, finalPage], OPTIONS).operations, [
    'validate',
    'validate',
  ]);
  assert.equal(JSON.stringify([firstPage, finalPage]).includes('opaque.snapshot.cursor'), false);
});

test('uses complete command totals for warning-only and mixed diagnostic results', () => {
  for (const command of ['validate', 'inspect'] as const) {
    for (const [status, errorCount, warningCount, exitCode] of [
      ['valid', 0, 1, 0],
      ['invalid', 1, 1, 1],
    ] as const) {
      const totals =
        command === 'validate'
          ? { diagnosticCount: errorCount + warningCount, errorCount, warningCount }
          : {
              counts: {
                diagnostics: errorCount + warningCount,
                errors: errorCount,
                warnings: warningCount,
              },
            };
      const output = JSON.stringify({
        cliVersion: OPTIONS.cliVersion,
        command,
        error: null,
        result: { ...totals, page: { cursor: 'next-page', records: [] }, valid: errorCount === 0 },
        schemaVersion: OPTIONS.jsonSchemaVersion,
        status,
      });
      const evidence = projectActorExecutionEvidenceEvent(
        createEvent(
          createLauncherCommand(command, '--json', '--max-output-bytes', '65536'),
          output,
          {
            exitCode,
          },
        ),
        OPTIONS,
      );
      assert.deepEqual(evidence.item.outputEvidence.facts[0], {
        cliVersion: OPTIONS.cliVersion,
        command,
        containsContent: false,
        errorCount,
        errorCode: null,
        errorPresent: false,
        hasNextPage: true,
        kind: 'moldea-cli-envelope',
        pageRecordCount: 0,
        relevant: null,
        resultPresent: true,
        schemaVersion: OPTIONS.jsonSchemaVersion,
        status,
        warningCount,
      });
    }
  }
});

test('does not derive validation conclusions from missing or contradictory totals', () => {
  for (const command of ['validate', 'inspect'] as const) {
    const validTotals =
      command === 'validate'
        ? { diagnosticCount: 1, errorCount: 0, warningCount: 1 }
        : { counts: { diagnostics: 1, errors: 0, warnings: 1 } };
    const malformedResults = [
      { page: { cursor: null, records: [] }, valid: true },
      { ...validTotals, page: { cursor: null, records: [] }, valid: false },
      command === 'validate'
        ? { diagnosticCount: 2, errorCount: 0, warningCount: 1, valid: true }
        : { counts: { diagnostics: 2, errors: 0, warnings: 1 }, valid: true },
      command === 'validate'
        ? {
            diagnosticCount: 1,
            errorCount: 0,
            warningCount: Number.MAX_SAFE_INTEGER + 1,
            valid: true,
          }
        : {
            counts: { diagnostics: 1, errors: 0, warnings: Number.MAX_SAFE_INTEGER + 1 },
            valid: true,
          },
    ];
    for (const result of malformedResults) {
      const output = JSON.stringify({
        cliVersion: OPTIONS.cliVersion,
        command,
        error: null,
        result,
        schemaVersion: OPTIONS.jsonSchemaVersion,
        status: 'valid',
      });
      const evidence = projectActorExecutionEvidenceEvent(
        createEvent(
          createLauncherCommand(command, '--json', '--max-output-bytes', '65536'),
          output,
        ),
        OPTIONS,
      );
      assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized');
      assert.deepEqual(evidence.item.outputEvidence.facts, []);
    }
  }
});

test('counts a valid launcher with malformed output as an unrecognized moldea operation', () => {
  const evidence = projectActorExecutionEvidenceEvent(
    createEvent(
      createLauncherCommand('validate', '--json', '--max-output-bytes', '65536'),
      '{not-json}',
    ),
    OPTIONS,
  );

  assert.equal(evidence.item.commandKind, 'moldea');
  assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized');
  assert.deepEqual(createMoldeaResourceEvidence([evidence], OPTIONS), {
    commandCount: 1,
    maximumInvocationByteCount: 10,
    modelVisibleToolOutputByteCount: 10,
    operations: ['unrecognized'],
    stdoutByteCount: 10,
  });
});

test('projects only the passing totals from a recognized repository test', () => {
  const output = createNodeTestOutput({ passed: 4, tests: 4 });
  const evidence = projectActorExecutionEvidenceEvent(
    createEvent('node --test src/support-agent.test-integration.js', output),
    OPTIONS,
  );

  assert.equal(hasValidActorExecutionEvidence([evidence], OPTIONS), true);
  assert.deepEqual(evidence, {
    eventType: 'item.completed',
    item: {
      commandKind: 'other',
      exitCode: 0,
      outputEvidence: {
        byteCount: Buffer.byteLength(output),
        disposition: 'projected',
        facts: [
          {
            cancelledCount: 0,
            failedCount: 0,
            kind: 'node-test-summary',
            passedCount: 4,
            skippedCount: 0,
            status: 'passed',
            testCount: 4,
            testKind: 'integration',
            todoCount: 0,
          },
        ],
      },
      status: 'completed',
      type: 'command_execution',
    },
  });
  assert.equal(JSON.stringify(evidence).includes('focused behavior'), false);
  assert.deepEqual(createMoldeaResourceEvidence([evidence], OPTIONS), {
    commandCount: 0,
    maximumInvocationByteCount: 0,
    modelVisibleToolOutputByteCount: 0,
    operations: [],
    stdoutByteCount: 0,
  });
});

test('does not project a passing summary from a prohibited package-manager command', () => {
  const output = `\n> fixture@1.0.0 test:integration\n> node --test src/support-agent.test-integration.js\n\n${createNodeTestOutput()}`;
  const evidence = projectActorExecutionEvidenceEvent(
    createEvent('/home/evaluator/bin/npm run test:integration', output),
    OPTIONS,
  );

  assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized');
  assert.deepEqual(evidence.item.outputEvidence.facts, []);
  assert.equal(JSON.stringify(evidence).includes('fixture@1.0.0'), false);
});

test('withholds a test-result fact unless the command and complete passing summary agree', () => {
  const passingOutput = createNodeTestOutput();
  const rejected = [
    createEvent('git status --short', passingOutput),
    createEvent(
      'node --test src/support-agent.test-integration.js',
      createNodeTestOutput({ failed: 1, passed: 0 }),
      { exitCode: 1, status: 'failed' },
    ),
    createEvent(
      'node --test src/support-agent.test-integration.js',
      createNodeTestOutput({ skipped: 1 }),
    ),
    createEvent(
      'node --test src/support-agent.test-integration.js',
      passingOutput.replace('ℹ duration_ms 12.5', ''),
    ),
    createEvent('node --test src/support-agent.test-integration.js', `${passingOutput}\nℹ tests 1`),
  ];

  for (const event of rejected) {
    const evidence = projectActorExecutionEvidenceEvent(event, OPTIONS);
    assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized');
    assert.deepEqual(evidence.item.outputEvidence.facts, []);
  }
});

test('accepts the native TAP summary form and bounds recognized test output', () => {
  const tapOutput = createNodeTestOutput()
    .split('\n')
    .map((line) => line.replace(/^ℹ /u, '# '))
    .join('\n');
  const evidence = projectActorExecutionEvidenceEvent(
    createEvent('node --test src/support-agent.test-integration.js', tapOutput),
    OPTIONS,
  );
  const excessive = projectActorExecutionEvidenceEvent(
    createEvent(
      'node --test src/support-agent.test-integration.js',
      'x'.repeat(MOLDEA_SKILL_RESOURCE_PROFILES.ordinary.maxCommandOutputBytes + 1),
    ),
    OPTIONS,
  );

  assert.equal(evidence.item.outputEvidence.disposition, 'projected');
  assert.equal(excessive.item.outputEvidence.disposition, 'too-large');
  assert.deepEqual(excessive.item.outputEvidence.facts, []);
});

test('bounds ordinary non-moldea command output at the operating peak', () => {
  const maximumCommandOutputBytes = MOLDEA_SKILL_RESOURCE_PROFILES.ordinary.maxCommandOutputBytes;
  const exact = projectActorExecutionEvidenceEvent(
    createEvent('git status --short', 'x'.repeat(maximumCommandOutputBytes)),
    OPTIONS,
  );
  const excessive = projectActorExecutionEvidenceEvent(
    createEvent('git status --short', 'x'.repeat(maximumCommandOutputBytes + 1)),
    OPTIONS,
  );

  assert.deepEqual(exact.item.outputEvidence, {
    byteCount: maximumCommandOutputBytes,
    disposition: 'unrecognized',
    facts: [],
  });
  assert.deepEqual(excessive.item.outputEvidence, {
    byteCount: maximumCommandOutputBytes + 1,
    disposition: 'too-large',
    facts: [],
  });
});

test('preserves a source-recorded too-large classification after the operating peak changes', () => {
  const recordedEvidence = {
    eventType: 'item.completed',
    item: {
      commandKind: 'other',
      exitCode: 0,
      outputEvidence: {
        byteCount: 65_537,
        disposition: 'too-large',
        facts: [],
      },
      status: 'completed',
      type: 'command_execution',
    },
  };

  assert.equal(hasValidActorExecutionEvidence([recordedEvidence], OPTIONS), true);
  assert.equal(
    projectActorExecutionEvidenceEvent(
      createEvent('git status --short', 'x'.repeat(65_537)),
      OPTIONS,
    ).item.outputEvidence.disposition,
    'unrecognized',
  );
});

test('rejects obsolete and malformed launcher command forms', () => {
  for (const command of [
    './node_modules/.bin/moldea validate --json --max-output-bytes 65536',
    'node /mnt/node_modules/@moldea.ai/cli/dist/moldea.js validate --json --max-output-bytes 65536',
    'node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt validate --json --max-output-bytes 65536',
    createLauncherCommand('validate', '--', '--json', '--max-output-bytes', '65536'),
    'node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs validate --repository /mnt -- --json --max-output-bytes 65536',
    createLauncherCommand(
      'scope',
      '--path',
      '/src/example.ts',
      '--json',
      '--max-output-bytes',
      '65536',
    ),
    createLauncherCommand(
      'content',
      '--path',
      '/moldea/../secret.md',
      '--json',
      '--max-output-bytes',
      '65536',
    ),
    createLauncherCommand('inspect', '--json'),
    createLauncherCommand('inspect', '--json', '--max-output-bytes', '65535'),
    createLauncherCommand('composition', '--json', '--max-output-bytes', '65536'),
    `${createLauncherCommand(
      'validate',
      '--json',
      '--max-output-bytes',
      '65536',
    )} && ${createLauncherCommand('inspect', '--json', '--max-output-bytes', '65536')}`,
  ]) {
    const evidence = projectActorExecutionEvidenceEvent(
      createEvent(command, createEnvelope('validate', { valid: true })),
      OPTIONS,
    );
    assert.equal(evidence.item.commandKind, 'other', command);
    assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized', command);
  }
});

test('enforces activation-specific moldea operation ordering', () => {
  const empty = createMoldeaResourceEvidence([], OPTIONS);
  assert.equal(
    hasPassingMoldeaResourceBudget(empty, {
      activation: 'abstain',
      minimumMoldeaCommands: 0,
      maximumMoldeaCommands: 0,
      maximumMoldeaOutputBytes: 0,
    }),
    true,
  );
  assert.equal(
    hasPassingMoldeaResourceBudget(
      { ...empty, commandCount: 1, operations: ['inspect'] },
      {
        activation: 'relationship',
        minimumMoldeaCommands: 1,
        maximumMoldeaCommands: 4,
        maximumMoldeaOutputBytes: 262_144,
      },
    ),
    false,
  );
  assert.equal(
    hasPassingMoldeaResourceBudget(
      { ...empty, commandCount: 2, operations: ['scope', 'inspect'] },
      {
        activation: 'relationship',
        minimumMoldeaCommands: 1,
        maximumMoldeaCommands: 4,
        maximumMoldeaOutputBytes: 262_144,
      },
    ),
    false,
  );
  assert.equal(
    hasPassingMoldeaResourceBudget(
      {
        commandCount: 2,
        maximumInvocationByteCount: 3_037,
        modelVisibleToolOutputByteCount: 3_513,
        operations: ['scope', 'content'],
        stdoutByteCount: 3_513,
      },
      {
        activation: 'direct',
        minimumMoldeaCommands: 1,
        maximumMoldeaCommands: 4,
        maximumMoldeaOutputBytes: 262_144,
      },
    ),
    true,
  );
  assert.equal(
    hasPassingMoldeaResourceBudget(
      { ...empty, commandCount: 1, operations: ['validate'] },
      {
        activation: 'direct',
        minimumMoldeaCommands: 1,
        maximumMoldeaCommands: 4,
        maximumMoldeaOutputBytes: 262_144,
      },
    ),
    true,
  );
  assert.equal(
    hasPassingMoldeaResourceBudget(
      { ...empty, commandCount: 1, operations: ['scope'] },
      {
        activation: 'blocked',
        minimumMoldeaCommands: 0,
        maximumMoldeaCommands: 1,
        maximumMoldeaOutputBytes: 262_144,
      },
    ),
    false,
  );
});

test('projects only completed AGENTS write/check facts and no diagnostic failure hit', () => {
  const helper = 'node /mnt/.agents/skills/moldea/scripts/managed-agents.mjs --repository /mnt';
  for (const [suffix, output, status] of [
    ['', 'created\n', 'created'],
    [' --check', 'ready\n', 'ready'],
    [' --check', 'warning: AGENTS.md is missing\n', 'warning'],
  ]) {
    const result = projectActorExecutionEvidenceEvent(
      createEvent(helper + suffix, output!),
      OPTIONS,
    );
    assert.deepEqual(result.item.outputEvidence.facts, [{ kind: 'managed-agents-result', status }]);
    assert.equal(hasValidActorExecutionEvidence([result], OPTIONS), true);
    assert.deepEqual(createMoldeaResourceEvidence([result], OPTIONS).operations, []);
  }
  for (const [command, output, exitCode] of [
    [helper + ' --print', 'created\n', 0],
    [helper + ' --check', 'ready\n', 1],
    [GATE_COMMAND + ' --diagnose --path README.md', '1\n', 1],
  ] as const) {
    const result = projectActorExecutionEvidenceEvent(
      createEvent(command, output, { exitCode }),
      OPTIONS,
    );
    assert.deepEqual(result.item.outputEvidence.facts, []);
  }
});
