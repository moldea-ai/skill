import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createMoldeaResourceEvidence,
  hasPassingMoldeaResourceBudget,
  hasValidActorExecutionEvidence,
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

const createEvent = (command, output) => ({
  type: 'item.completed',
  item: {
    type: 'command_execution',
    command,
    status: 'completed',
    exit_code: 0,
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

test('accepts zero CLI consumption for informational and abstention paths', () => {
  const resource = createMoldeaResourceEvidence([], OPTIONS);

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
});
