// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasValidActorExecutionEvidence,
  projectActorExecutionEvidenceEvent,
} from './actor-execution-evidence.mjs';

const PROJECTION_OPTIONS = {
  cliVersion: '4.0.1',
  jsonSchemaVersion: 2,
};
const PNP_PATH_COMMAND = [
  'realpath /mnt/.pnp/node_modules/@moldea.ai/cli',
  'realpath /mnt/.pnp/node_modules/@moldea.ai/cli/dist/moldea.js',
].join('; ');

const createMoldeaCommand = (operation) =>
  `pnpm node .pnp/node_modules/@moldea.ai/cli/dist/moldea.js ${operation} --json`;

const createCompletedCommandEvent = ({
  command = createMoldeaCommand('inspect'),
  exitCode = 0,
  output = '',
  status = 'completed',
} = {}) => ({
  item: {
    aggregated_output: output,
    command,
    exit_code: exitCode,
    id: 'command-1',
    status,
    type: 'command_execution',
  },
  type: 'item.completed',
});

test('omits started commands and MCP events with actor-controlled payloads', () => {
  const sensitive = 'sk-sensitive-value';
  const startedCommand = projectActorExecutionEvidenceEvent(
    {
      item: {
        command: `printf ${sensitive}`,
        id: 'command-1',
        status: 'in_progress',
        type: 'command_execution',
      },
      type: 'item.started',
    },
    PROJECTION_OPTIONS,
  );
  const mcpEvent = projectActorExecutionEvidenceEvent(
    {
      item: {
        arguments: { command: `printf ${sensitive}` },
        id: 'tool-1',
        input: { token: sensitive },
        name: 'exec_command',
        result: { output: sensitive },
        status: 'completed',
        type: 'mcp_tool_call',
      },
      type: 'item.completed',
    },
    PROJECTION_OPTIONS,
  );

  assert.equal(startedCommand, null);
  assert.equal(mcpEvent, null);
});

test('projects empty completed-command output without retaining content', () => {
  const evidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({ output: ' \n' }),
    PROJECTION_OPTIONS,
  );

  assert.deepEqual(evidence.item.outputEvidence, {
    byteCount: 2,
    disposition: 'empty',
    facts: [],
  });
  assert.equal(evidence.item.exitCode, 0);
  assert.equal(Object.hasOwn(evidence.item, 'command'), false);
  assert.equal(Object.hasOwn(evidence.item, 'id'), false);
  assert.equal(hasValidActorExecutionEvidence([evidence], PROJECTION_OPTIONS), true);
});

test('projects normalized workspace paths without the sandbox mount prefix', () => {
  const output = [
    '/mnt/.pnp/node_modules/@moldea.ai/cli',
    '/mnt/.pnp/node_modules/@moldea.ai/cli/dist/moldea.js',
  ].join('\n');
  const evidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({ command: PNP_PATH_COMMAND, output }),
    PROJECTION_OPTIONS,
  );

  assert.deepEqual(evidence.item.outputEvidence, {
    byteCount: Buffer.byteLength(output),
    disposition: 'projected',
    facts: [
      {
        kind: 'workspace-paths',
        paths: [
          '/.pnp/node_modules/@moldea.ai/cli',
          '/.pnp/node_modules/@moldea.ai/cli/dist/moldea.js',
        ],
      },
    ],
  });
  assert.doesNotMatch(JSON.stringify(evidence), /\/mnt/u);
});

test('projects exact Yarn package and effective-provider inspections', () => {
  const packageOutput = JSON.stringify({
    value: '@moldea.ai/cli@npm:4.0.1',
    children: {
      Version: '4.0.1',
      'Exported Binaries': ['moldea'],
    },
  });
  const providerOutput = JSON.stringify({
    name: 'moldea',
    source: 'conflicting-moldea-provider',
    path: '/mnt/node_modules/conflicting-moldea-provider/bin/moldea.cjs',
  });
  const packageEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({
      command: 'yarn info @moldea.ai/cli --json',
      output: packageOutput,
    }),
    PROJECTION_OPTIONS,
  );
  const providerEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({
      command: 'yarn bin -v --json',
      output: providerOutput,
    }),
    PROJECTION_OPTIONS,
  );

  assert.deepEqual(packageEvidence.item.outputEvidence.facts, [
    {
      binaries: ['moldea'],
      kind: 'yarn-package-info',
      packageName: '@moldea.ai/cli',
      version: '4.0.1',
    },
  ]);
  assert.deepEqual(providerEvidence.item.outputEvidence.facts, [
    {
      binaryName: 'moldea',
      kind: 'yarn-binary-provider',
      source: 'conflicting-moldea-provider',
    },
  ]);
  assert.equal(
    hasValidActorExecutionEvidence([packageEvidence, providerEvidence], PROJECTION_OPTIONS),
    true,
  );
  assert.doesNotMatch(JSON.stringify(providerEvidence), /\/mnt|node_modules/u);
});

test('rejects malformed or near-match Yarn inspection evidence', () => {
  const packageOutput = {
    value: '@moldea.ai/cli@npm:4.0.1',
    children: {
      Version: '4.0.1',
      'Exported Binaries': ['moldea'],
    },
  };
  const providerOutput = {
    name: 'moldea',
    source: 'conflicting-moldea-provider',
    path: '/mnt/node_modules/conflicting-moldea-provider/bin/moldea.cjs',
  };
  const cases = [
    ['yarn info @moldea.ai/cli', packageOutput, 0],
    ['yarn info @moldea.ai/cli --json', { ...packageOutput, private: 'secret' }, 0],
    [
      'yarn info @moldea.ai/cli --json',
      {
        ...packageOutput,
        children: { ...packageOutput.children, Version: '4.0.2' },
      },
      0,
    ],
    ['yarn bin --json', providerOutput, 0],
    ['yarn bin -v --json', { ...providerOutput, source: '@moldea.ai/cli' }, 0],
    ['yarn bin -v --json', { ...providerOutput, private: 'secret' }, 0],
    ['yarn bin -v --json', providerOutput, 1],
  ];

  for (const [command, output, exitCode] of cases) {
    const evidence = projectActorExecutionEvidenceEvent(
      createCompletedCommandEvent({
        command,
        exitCode,
        output: JSON.stringify(output),
        status: exitCode === 0 ? 'completed' : 'failed',
      }),
      PROJECTION_OPTIONS,
    );

    assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized');
    assert.deepEqual(evidence.item.outputEvidence.facts, []);
    assert.doesNotMatch(JSON.stringify(evidence), /secret/u);
  }
});

test('projects the exact focused runtime-test result without retaining output', () => {
  const output = 'TAP version 13\n# token=sk-sensitive-value\n1..1\n';
  const passedEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({
      command: "/bin/bash -lc 'node --test src/support-agent.test-integration.js'",
      output,
    }),
    PROJECTION_OPTIONS,
  );
  const failedEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({
      command: 'node --test src/support-agent.test-integration.js',
      exitCode: 1,
      output: 'TAP version 13\nnot ok 1 - runtime provenance\n',
      status: 'failed',
    }),
    PROJECTION_OPTIONS,
  );

  assert.deepEqual(passedEvidence.item.outputEvidence, {
    byteCount: Buffer.byteLength(output),
    disposition: 'projected',
    facts: [
      {
        kind: 'focused-runtime-test',
        path: '/src/support-agent.test-integration.js',
        status: 'passed',
      },
    ],
  });
  assert.deepEqual(failedEvidence.item.outputEvidence.facts, [
    {
      kind: 'focused-runtime-test',
      path: '/src/support-agent.test-integration.js',
      status: 'failed',
    },
  ]);
  assert.equal(hasValidActorExecutionEvidence([passedEvidence], PROJECTION_OPTIONS), true);
  assert.equal(hasValidActorExecutionEvidence([failedEvidence], PROJECTION_OPTIONS), true);
  assert.doesNotMatch(JSON.stringify(passedEvidence), /token|sk-sensitive-value|node --test/u);
});

test('does not project near-match runtime-test commands', () => {
  for (const command of [
    'node --test src/other.test-integration.js',
    'node --test ./src/support-agent.test-integration.js',
    'node --test src/support-agent.test-integration.js --test-name-pattern provenance',
    "/bin/bash -lc 'node --test src/support-agent.test-integration.js; cat /mnt/secret'",
    'npm test',
  ]) {
    const evidence = projectActorExecutionEvidenceEvent(
      createCompletedCommandEvent({ command, output: 'TAP version 13\n1..1\n' }),
      PROJECTION_OPTIONS,
    );

    assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized');
    assert.deepEqual(evidence.item.outputEvidence.facts, []);
  }
});

test('does not project a focused runtime-test result from empty or oversized output', () => {
  const command = 'node --test src/support-agent.test-integration.js';
  const emptyEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({ command }),
    PROJECTION_OPTIONS,
  );
  const oversizedEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({ command, output: 'x'.repeat(32_769) }),
    PROJECTION_OPTIONS,
  );

  assert.deepEqual(emptyEvidence.item.outputEvidence, {
    byteCount: 0,
    disposition: 'empty',
    facts: [],
  });
  assert.deepEqual(oversizedEvidence.item.outputEvidence, {
    byteCount: 32_769,
    disposition: 'too-large',
    facts: [],
  });
});

test('projects release-bound valid and invalid Moldea envelope facts', () => {
  const validOutput = JSON.stringify({
    cliVersion: '4.0.1',
    command: 'validate',
    error: null,
    result: { valid: true },
    schemaVersion: 2,
    status: 'valid',
  });
  const invalidOutput = JSON.stringify({
    cliVersion: '4.0.1',
    command: 'inspect',
    error: null,
    privateDiagnostic: 'must never be retained',
    result: {
      issues: [{ path: '/mnt/private-file', value: 'must never be retained' }],
    },
    schemaVersion: 2,
    status: 'invalid',
  });

  const validEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({ command: createMoldeaCommand('validate'), output: validOutput }),
    PROJECTION_OPTIONS,
  );
  const invalidEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({
      exitCode: 1,
      output: invalidOutput,
      status: 'failed',
    }),
    PROJECTION_OPTIONS,
  );

  assert.deepEqual(validEvidence.item.outputEvidence.facts, [
    {
      cliVersion: '4.0.1',
      command: 'validate',
      errorPresent: false,
      kind: 'moldea-cli-envelope',
      resultPresent: true,
      schemaVersion: 2,
      status: 'valid',
    },
  ]);
  assert.deepEqual(invalidEvidence.item.outputEvidence.facts, [
    {
      cliVersion: '4.0.1',
      command: 'inspect',
      errorPresent: false,
      kind: 'moldea-cli-envelope',
      resultPresent: true,
      schemaVersion: 2,
      status: 'invalid',
    },
  ]);
  assert.equal(invalidEvidence.item.exitCode, 1);
  assert.doesNotMatch(
    JSON.stringify(invalidEvidence),
    /privateDiagnostic|private-file|must never/u,
  );
});

test('projects valid compatibility envelopes but rejects impossible invalid ones', () => {
  const compatibilityEnvelope = {
    cliVersion: '4.0.1',
    command: 'compatibility',
    error: null,
    result: {
      adapters: [{ id: 'custom', privateConfiguration: 'must never be retained' }],
    },
    schemaVersion: 2,
    status: 'valid',
  };
  const validEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({
      command: createMoldeaCommand('compatibility'),
      output: JSON.stringify(compatibilityEnvelope),
    }),
    PROJECTION_OPTIONS,
  );
  const invalidEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({
      command: createMoldeaCommand('compatibility'),
      exitCode: 1,
      output: JSON.stringify({ ...compatibilityEnvelope, status: 'invalid' }),
      status: 'failed',
    }),
    PROJECTION_OPTIONS,
  );

  assert.deepEqual(validEvidence.item.outputEvidence.facts, [
    {
      cliVersion: '4.0.1',
      command: 'compatibility',
      errorPresent: false,
      kind: 'moldea-cli-envelope',
      resultPresent: true,
      schemaVersion: 2,
      status: 'valid',
    },
  ]);
  assert.doesNotMatch(JSON.stringify(validEvidence), /privateConfiguration|must never/u);
  assert.equal(invalidEvidence.item.outputEvidence.disposition, 'unrecognized');
});

test('projects operational error envelopes without retaining diagnostics', () => {
  const output = JSON.stringify({
    cliVersion: '4.0.1',
    command: 'inspect',
    error: {
      message: 'private operational diagnostic',
      path: '/mnt/private-file',
    },
    result: null,
    schemaVersion: 2,
    status: 'error',
  });
  const evidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({ exitCode: 2, output, status: 'failed' }),
    PROJECTION_OPTIONS,
  );

  assert.deepEqual(evidence.item.outputEvidence.facts, [
    {
      cliVersion: '4.0.1',
      command: 'inspect',
      errorPresent: true,
      kind: 'moldea-cli-envelope',
      resultPresent: false,
      schemaVersion: 2,
      status: 'error',
    },
  ]);
  assert.doesNotMatch(JSON.stringify(evidence), /operational diagnostic|private-file/u);
});

test('does not project inconsistent, malformed, secret-bearing, or non-workspace output', () => {
  const outputs = [
    '{not-json}',
    '/home/developer/.codex/auth.json',
    '/mnt/project/../secret',
    '/mnt/sk-sensitive-value',
    '/mnt/project\0secret',
    '/mnt/repeated\n/mnt/repeated',
    Array.from({ length: 9 }, (_, index) => `/mnt/path-${index}`).join('\n'),
    'token=sk-sensitive-value',
    JSON.stringify({ tokens: { access_token: 'copied-auth-token' } }),
    JSON.stringify({
      cliVersion: '4.0.1',
      command: 'inspect',
      error: null,
      result: { valid: true },
      schemaVersion: 2,
      secret: 'sk-sensitive-value',
      status: 'valid',
    }),
    JSON.stringify({
      cliVersion: '4.0.2',
      command: 'inspect',
      error: null,
      result: { valid: true },
      schemaVersion: 2,
      status: 'valid',
    }),
    JSON.stringify({
      cliVersion: '4.0.1',
      command: 'inspect',
      error: null,
      result: { valid: true },
      schemaVersion: 3,
      status: 'valid',
    }),
    JSON.stringify({
      cliVersion: '4.0.1',
      command: 'initialize',
      error: null,
      result: { valid: true },
      schemaVersion: 2,
      status: 'valid',
    }),
  ];

  for (const output of outputs) {
    const evidence = projectActorExecutionEvidenceEvent(
      createCompletedCommandEvent({
        exitCode: output.startsWith('{"') ? 1 : 0,
        output,
      }),
      PROJECTION_OPTIONS,
    );
    const serializedEvidence = JSON.stringify(evidence);

    assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized');
    assert.deepEqual(evidence.item.outputEvidence.facts, []);
    assert.equal(serializedEvidence.includes(output), false);
    assert.doesNotMatch(serializedEvidence, /sk-sensitive-value|auth\.json|copied-auth-token/u);
  }
});

test('marks oversized output without retaining or hashing its content', () => {
  const output = `credential=${'x'.repeat(32_768)}`;
  const evidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({ output }),
    PROJECTION_OPTIONS,
  );

  assert.deepEqual(evidence.item.outputEvidence, {
    byteCount: Buffer.byteLength(output),
    disposition: 'too-large',
    facts: [],
  });
  assert.doesNotMatch(JSON.stringify(evidence), /credential|sha|hash/u);

  const whitespaceEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({ output: ' '.repeat(32_769) }),
    PROJECTION_OPTIONS,
  );
  assert.equal(whitespaceEvidence.item.outputEvidence.disposition, 'too-large');
});

test('drops actor-controlled command metadata from completed evidence', () => {
  const sensitive = 'sk-sensitive-value';
  const evidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({ command: `printf ${sensitive}` }),
    PROJECTION_OPTIONS,
  );

  assert.deepEqual(evidence, {
    eventType: 'item.completed',
    item: {
      exitCode: 0,
      outputEvidence: { byteCount: 0, disposition: 'empty', facts: [] },
      status: 'completed',
      type: 'command_execution',
    },
  });
  assert.doesNotMatch(JSON.stringify(evidence), /printf|sk-sensitive-value/u);
});

test('does not project recognized-looking output from an unrecognized command', () => {
  const pathOutput = [
    '/mnt/.pnp/node_modules/@moldea.ai/cli',
    '/mnt/.pnp/node_modules/@moldea.ai/cli/dist/moldea.js',
  ].join('\n');
  const envelopeOutput = JSON.stringify({
    cliVersion: '4.0.1',
    command: 'inspect',
    error: null,
    result: { valid: true },
    schemaVersion: 2,
    status: 'valid',
  });

  for (const output of [pathOutput, envelopeOutput]) {
    const evidence = projectActorExecutionEvidenceEvent(
      createCompletedCommandEvent({ command: 'printf fabricated-result', output }),
      PROJECTION_OPTIONS,
    );

    assert.equal(evidence.item.outputEvidence.disposition, 'unrecognized');
    assert.deepEqual(evidence.item.outputEvidence.facts, []);
  }
});

test('rejects malformed completed results without retaining oversized command text', () => {
  const missingExitCode = createCompletedCommandEvent();
  delete missingExitCode.item.exit_code;
  const missingOutput = createCompletedCommandEvent();
  delete missingOutput.item.aggregated_output;

  assert.throws(
    () => projectActorExecutionEvidenceEvent(missingExitCode, PROJECTION_OPTIONS),
    /did not include its result evidence/u,
  );
  assert.throws(
    () => projectActorExecutionEvidenceEvent(missingOutput, PROJECTION_OPTIONS),
    /did not include its result evidence/u,
  );
  const oversizedCommandEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({ command: 'x'.repeat(32_769) }),
    PROJECTION_OPTIONS,
  );
  assert.doesNotMatch(JSON.stringify(oversizedCommandEvidence), /x{16}/u);
});

test('ignores unrelated and incomplete started events', () => {
  assert.equal(
    projectActorExecutionEvidenceEvent(
      {
        item: { id: 'message-1', text: 'done', type: 'agent_message' },
        type: 'item.completed',
      },
      PROJECTION_OPTIONS,
    ),
    null,
  );
  assert.equal(
    projectActorExecutionEvidenceEvent(
      {
        item: {
          command: 'pnpm --version',
          id: 'command-1',
          type: 'command_execution',
        },
        type: 'item.started',
      },
      PROJECTION_OPTIONS,
    ),
    null,
  );
});

test('strict validation rejects injected raw output, extra keys, and misplaced results', () => {
  const completedEvidence = projectActorExecutionEvidenceEvent(
    createCompletedCommandEvent({
      command: 'realpath /mnt/.pnp/node_modules/@moldea.ai/cli',
      output: '/mnt/.pnp/node_modules/@moldea.ai/cli',
    }),
    PROJECTION_OPTIONS,
  );

  for (const invalidEvidence of [
    [{ ...completedEvidence, rawOutput: 'secret' }],
    [
      {
        ...completedEvidence,
        item: { ...completedEvidence.item, aggregated_output: 'secret' },
      },
    ],
    [{ ...completedEvidence, eventType: 'item.started' }],
    [
      {
        ...completedEvidence,
        item: { ...completedEvidence.item, command: 'secret' },
      },
    ],
    [
      {
        ...completedEvidence,
        item: { ...completedEvidence.item, id: 'command-1' },
      },
    ],
    [
      {
        ...completedEvidence,
        item: {
          ...completedEvidence.item,
          outputEvidence: {
            byteCount: 1,
            disposition: 'projected',
            facts: [{ kind: 'workspace-paths', paths: ['/mnt/private'] }],
          },
        },
      },
    ],
    [
      {
        ...completedEvidence,
        item: {
          ...completedEvidence.item,
          outputEvidence: {
            byteCount: 1,
            disposition: 'projected',
            facts: [
              {
                kind: 'focused-runtime-test',
                path: '/src/support-agent.test-integration.js',
                status: 'failed',
              },
            ],
          },
        },
      },
    ],
    [
      {
        ...completedEvidence,
        item: {
          ...completedEvidence.item,
          outputEvidence: { byteCount: 1, disposition: 'too-large', facts: [] },
        },
      },
    ],
    [
      {
        ...completedEvidence,
        item: {
          ...completedEvidence.item,
          outputEvidence: {
            byteCount: 32_769,
            disposition: 'empty',
            facts: [],
          },
        },
      },
    ],
  ]) {
    assert.equal(hasValidActorExecutionEvidence(invalidEvidence, PROJECTION_OPTIONS), false);
  }

  assert.equal(
    hasValidActorExecutionEvidence(
      Array.from({ length: 129 }, () => completedEvidence),
      PROJECTION_OPTIONS,
    ),
    false,
  );
});
