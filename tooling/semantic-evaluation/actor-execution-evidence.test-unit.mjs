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

test('projects content-free inspect metadata and exact output bytes', () => {
  const output = createEnvelope('inspect', {
    page: { cursor: null, records: [{ kind: 'context', asset: { path: '/moldea/project.md' } }] },
  });
  const evidence = projectActorExecutionEvidenceEvent(
    createEvent('./node_modules/.bin/moldea inspect --json --max-output-bytes 65536', output),
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

test('recognizes relationship scope and content only through bounded direct CLI commands', () => {
  const scope = projectActorExecutionEvidenceEvent(
    createEvent(
      './node_modules/.bin/moldea scope --path /src/example.ts --json --max-output-bytes 65536',
      createEnvelope('scope', {
        relevant: true,
        page: { cursor: null, records: [{ kind: 'match' }] },
      }),
    ),
    OPTIONS,
  );
  const content = projectActorExecutionEvidenceEvent(
    createEvent(
      './node_modules/.bin/moldea content --path /moldea/project.md --json --max-output-bytes 65536',
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
      './node_modules/.bin/moldea content --path /moldea/missing.md --json --max-output-bytes 65536',
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
        './node_modules/.bin/moldea inspect --json --max-output-bytes 65536',
        createEnvelope('inspect', {
          page: { cursor: null, records: [{ asset: { content: 'leak' } }] },
        }),
      ),
      OPTIONS,
    ),
  );
});

test('does not recognize invocations that omit the ordinary page budget', () => {
  const evidence = projectActorExecutionEvidenceEvent(
    createEvent('./node_modules/.bin/moldea inspect --json', createEnvelope('inspect', {})),
    OPTIONS,
  );
  assert.equal(evidence.item.commandKind, 'other');
  assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized');
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
