// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { parseSemanticEvaluationHostOutput } from './host-output.ts';

const OPTIONS = { cliVersion: '8.0.0', jsonSchemaVersion: 4 } as const;

describe('semantic host output', () => {
  test('projects the final response and usage without retaining raw command content', () => {
    const output = [
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
