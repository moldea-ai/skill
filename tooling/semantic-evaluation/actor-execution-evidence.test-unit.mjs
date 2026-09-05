import assert from 'node:assert/strict';
import { test } from 'node:test';

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

test('enforces abstention and relationship ordering', () => {
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
});
