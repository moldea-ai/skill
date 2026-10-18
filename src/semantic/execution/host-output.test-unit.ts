// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { parseSemanticEvaluationHostOutput } from './host-output.ts';

const EMPTY_CLI_CAPTURE = { type: 'moldea.cli-invocations', invocations: [] };

const OPTIONS = { cliVersion: '9.0.0', jsonSchemaVersion: 5 } as const;

test('requires startup capture and refuses validation credit from command text or an unsuccessful envelope', () => {
  const envelope = JSON.stringify({
    schemaVersion: 5,
    cliVersion: '9.0.0',
    command: 'scope',
    status: 'valid',
    result: { relevant: true },
    error: null,
  });
  const events = [
    {
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command:
          'node .agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt -- scope --json --path src/code.js --max-output-bytes 65536',
        aggregated_output: envelope,
        exit_code: 0,
        status: 'completed',
      },
    },
    { type: 'item.completed', item: { type: 'agent_message', text: 'Done.' } },
    {
      type: 'moldea.git-invocations',
      evidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
    },
  ];
  const stream = (capture: unknown[]) =>
    [...events, ...capture].map((event) => JSON.stringify(event)).join('\n');
  expect(() => parseSemanticEvaluationHostOutput(stream([]), OPTIONS)).toThrow(
    'CLI invocation capture is missing',
  );
  expect(() =>
    parseSemanticEvaluationHostOutput(stream([EMPTY_CLI_CAPTURE, EMPTY_CLI_CAPTURE]), OPTIONS),
  ).toThrow('CLI invocation capture is duplicated');
  const notRun = parseSemanticEvaluationHostOutput(stream([EMPTY_CLI_CAPTURE]), OPTIONS);
  expect(notRun.actorResourceEvidence.commandCount).toBe(0);
  expect(notRun.commandPolicyEvidence.moldeaCommandCount).toBe(0);
  expect(
    notRun.actorExecutionEvidence.flatMap(({ item }) => item.outputEvidence.facts),
  ).toStrictEqual([]);
  for (const [stdout, exitCode, repository] of [
    [envelope, 1, '/mnt'],
    ['malformed JSON', 0, '/mnt'],
    [envelope, 0, '/other-repository'],
  ] as const) {
    const failed = parseSemanticEvaluationHostOutput(
      stream([
        {
          type: 'moldea.cli-invocations',
          invocations: [
            {
              arguments: [
                '--repository',
                repository,
                '--',
                'scope',
                '--json',
                '--path',
                'src/code.js',
                '--max-output-bytes',
                '65536',
              ],
              exitCode,
              stdout,
              outputByteCount: Buffer.byteLength(stdout),
            },
          ],
        },
      ]),
      OPTIONS,
    );
    expect(failed.actorResourceEvidence.commandCount).toBe(1);
    expect(
      failed.actorExecutionEvidence.flatMap(({ item }) => item.outputEvidence.facts),
    ).toStrictEqual([]);
  }
});

test('host output preserves per-request usage when a session total exceeds the host ceiling', () => {
  const output = [
    EMPTY_CLI_CAPTURE,
    { type: 'item.completed', item: { type: 'agent_message', text: 'Request complete.' } },
    {
      type: 'turn.completed',
      usage: { input_tokens: 3_000_000, cached_input_tokens: 1_500_000, output_tokens: 600 },
    },
    {
      type: 'moldea.git-invocations',
      evidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
    },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');
  const result = parseSemanticEvaluationHostOutput(output, OPTIONS, {
    inputTokens: 2_000_000,
    cachedInputTokens: 1_000_000,
    outputTokens: 400,
  });
  expect(result.response).toBe('Request complete.');
  expect(result.usage).toStrictEqual({
    inputTokens: 1_000_000,
    cachedInputTokens: 500_000,
    outputTokens: 200,
  });
});

describe('semantic host output', () => {
  test('projects the final response and usage without retaining raw command content', () => {
    const output = [
      JSON.stringify(EMPTY_CLI_CAPTURE),
      JSON.stringify({
        type: 'item.completed',
        item: {
          type: 'command_execution',
          command: 'git status --short',
          aggregated_output: ' M README.md\n',
          exit_code: 0,
          status: 'completed',
        },
      }),
      JSON.stringify({
        type: 'item.completed',
        item: { type: 'agent_message', text: 'The repository has one modified file.' },
      }),
      JSON.stringify({
        type: 'turn.completed',
        usage: { input_tokens: 7, cached_input_tokens: 2, output_tokens: 3 },
      }),
      JSON.stringify({
        type: 'moldea.git-invocations',
        evidence: {
          invocationCount: 0,
          hostInvocationCount: 0,
          repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
        },
      }),
    ].join('\n');

    const result = parseSemanticEvaluationHostOutput(output, OPTIONS);

    expect(result.response).toBe('The repository has one modified file.');
    expect(result.usage).toStrictEqual({ cachedInputTokens: 2, inputTokens: 7, outputTokens: 3 });
    expect(result.commandPolicyEvidence.completedCommandCount).toBe(1);
    expect(JSON.stringify(result)).not.toContain('git status');
    expect(JSON.stringify(result)).not.toContain('README.md');
  });

  test('rejects malformed streams and operational failures without a final response', () => {
    expect(() => parseSemanticEvaluationHostOutput('{invalid', OPTIONS)).toThrow(
      /malformed JSONL/u,
    );
    expect(() =>
      parseSemanticEvaluationHostOutput(JSON.stringify({ type: 'turn.failed' }), OPTIONS),
    ).toThrow(/operational failure/u);
  });
});

test('requires one complete invocation capture independently of actor claims', () => {
  const response = JSON.stringify({
    type: 'item.completed',
    item: { type: 'agent_message', text: 'Done.' },
  });
  const capture = JSON.stringify({
    type: 'moldea.git-invocations',
    evidence: {
      invocationCount: 0,
      hostInvocationCount: 0,
      repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
    },
  });
  expect(() => parseSemanticEvaluationHostOutput(response, OPTIONS)).toThrow('capture is missing');
  expect(() =>
    parseSemanticEvaluationHostOutput([response, capture, capture].join('\n'), OPTIONS),
  ).toThrow('capture is duplicated');
  const malformed = JSON.stringify({
    type: 'moldea.git-invocations',
    evidence: { invocationCount: 0 },
  });
  expect(() =>
    parseSemanticEvaluationHostOutput([response, malformed].join('\n'), OPTIONS),
  ).toThrow();
});

test('does not treat a failed wrapper capture as an empty successful log', () => {
  const stream = [
    EMPTY_CLI_CAPTURE,
    {
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: 'node task.js',
        aggregated_output: 'MOLDEA_GIT_CAPTURE_FAILED\n',
        exit_code: 3,
        status: 'failed',
      },
    },
    { type: 'item.completed', item: { type: 'agent_message', text: 'Stopped.' } },
    {
      type: 'moldea.git-invocations',
      evidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
    },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');
  expect(() => parseSemanticEvaluationHostOutput(stream, OPTIONS)).toThrow(
    'capture failed during actor execution',
  );
});

test('reading wrapper source does not signal an invocation-capture failure', () => {
  const stream = [
    EMPTY_CLI_CAPTURE,
    {
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: 'cat /usr/bin/git',
        aggregated_output: 'process.stderr.write("MOLDEA_GIT_CAPTURE_FAILED\\n");\n',
        exit_code: 0,
        status: 'completed',
      },
    },
    { type: 'item.completed', item: { type: 'agent_message', text: 'Read the wrapper.' } },
    {
      type: 'moldea.git-invocations',
      evidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
    },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');
  expect(parseSemanticEvaluationHostOutput(stream, OPTIONS).response).toBe('Read the wrapper.');
});

test('keeps completed Codex patches as ordered moldea events without command credit', () => {
  const output = [
    {
      type: 'item.started',
      item: { type: 'file_change', changes: [{ path: '/mnt/moldea/project.md', kind: 'update' }] },
    },
    {
      type: 'item.completed',
      item: {
        type: 'file_change',
        changes: [{ path: '/mnt/moldea/project.md', kind: 'update' }],
        status: 'completed',
      },
    },
    { type: 'item.completed', item: { type: 'agent_message', text: 'Done.' } },
    {
      type: 'moldea.git-invocations',
      evidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
    },
    EMPTY_CLI_CAPTURE,
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');
  const parsed = parseSemanticEvaluationHostOutput(output, OPTIONS);
  expect(parsed.commandPolicyEvidence.moldeaEvents).toStrictEqual([
    { kind: 'file-change', moldeaPath: 'touching' },
  ]);
  expect(parsed.commandPolicyEvidence.completedCommandCount).toBe(0);
  expect(parsed.actorExecutionEvidence).toStrictEqual([]);
});
