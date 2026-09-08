import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../resource-calibration/profiles.mjs';

import {
  createMoldeaResourceEvidence,
  hasPassingMoldeaResourceBudget,
  hasValidActorExecutionEvidence,
  hasValidMoldeaResourceEvidence,
  projectActorExecutionEvidenceEvent,
} from './actor-execution-evidence.mjs';

const OPTIONS = { cliVersion: '7.0.0', jsonSchemaVersion: 4 };
const LAUNCHER_PREFIX =
  'node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt --';

const createLauncherCommand = (operation, ...arguments_) =>
  [LAUNCHER_PREFIX, operation, ...arguments_].join(' ');

const createEnvelope = (command, result) =>
  JSON.stringify({
    schemaVersion: 4,
    cliVersion: '7.0.0',
    command,
    status: 'valid',
    result,
    error: null,
  });

const createErrorEnvelope = (command) =>
  JSON.stringify({
    schemaVersion: 4,
    cliVersion: '7.0.0',
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

const createEvent = (command, output, { exitCode = 0, status = 'completed' } = {}) => ({
  type: 'item.completed',
  item: {
    type: 'command_execution',
    command,
    status,
    exit_code: exitCode,
    aggregated_output: output,
  },
});

const createNodeTestOutput = ({
  cancelled = 0,
  failed = 0,
  passed = 1,
  skipped = 0,
  tests = 1,
  todo = 0,
} = {}) =>
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
    cliVersion: '7.0.0',
    command: 'inspect',
    containsContent: false,
    errorCode: null,
    errorPresent: false,
    hasNextPage: false,
    kind: 'moldea-cli-envelope',
    pageRecordCount: 1,
    relevant: null,
    resultPresent: true,
    schemaVersion: 4,
    status: 'valid',
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
    cliVersion: '7.0.0',
    command: 'content',
    containsContent: false,
    errorCode: 'CONTENT_PATH_INVALID',
    errorPresent: true,
    hasNextPage: false,
    kind: 'moldea-cli-envelope',
    pageRecordCount: 0,
    relevant: null,
    resultPresent: false,
    schemaVersion: 4,
    status: 'error',
  });
});

test('rejects unsafe CLI error classifications without retaining error bodies', () => {
  const unsafeOutput = JSON.stringify({
    schemaVersion: 4,
    cliVersion: '7.0.0',
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

  for (const activation of ['abstain', 'informational']) {
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
  const createInvalidValidationEnvelope = (cursor) =>
    JSON.stringify({
      schemaVersion: 4,
      cliVersion: '7.0.0',
      command: 'validate',
      status: 'invalid',
      result: { page: { cursor, records: [{ kind: 'diagnostic' }] } },
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
    [firstPage, finalPage].map(({ item }) => item.outputEvidence.facts[0].hasNextPage),
    [true, false],
  );
  assert.deepEqual(createMoldeaResourceEvidence([firstPage, finalPage], OPTIONS).operations, [
    'validate',
    'validate',
  ]);
  assert.equal(JSON.stringify([firstPage, finalPage]).includes('opaque.snapshot.cursor'), false);
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

test('recognizes a passing npm correctness-test summary without retaining its preamble', () => {
  const output = `\n> fixture@1.0.0 test:integration\n> node --test src/support-agent.test-integration.js\n\n${createNodeTestOutput()}`;
  const evidence = projectActorExecutionEvidenceEvent(
    createEvent('/home/evaluator/bin/npm run test:integration', output),
    OPTIONS,
  );

  assert.equal(evidence.item.outputEvidence.disposition, 'projected');
  assert.equal(evidence.item.outputEvidence.facts[0].kind, 'node-test-summary');
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
