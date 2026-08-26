// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { createCodexExecCommand } from './utilities.ts';

describe('createCodexExecCommand', () => {
  test('creates the shared externally sandboxed fixed-model contract', () => {
    const command = createCodexExecCommand({
      outputPath: '/home/evaluator/output.json',
      schemaPath: '/home/evaluator/schema.json',
    });

    expect(command.slice(0, 2)).toStrictEqual(['codex', 'exec']);
    expect(command).toContain('gpt-5.6-sol');
    expect(command).toContain('model_reasoning_effort=medium');
    expect(command).toContain('shell_environment_policy.inherit=none');
    expect(command).toContain('web_search=disabled');
    expect(command).toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(command).toContain('--skip-git-repo-check');
    expect(command).toContain('--ephemeral');
    expect(command).toContain('--ignore-user-config');
    expect(command).toContain('--ignore-rules');
    expect(command).toContain('--output-schema');
    expect(command).toContain('--output-last-message');
    expect(command).not.toContain('--sandbox');
    expect(command).not.toContain('--cd');
    expect(command.slice(-1)).toStrictEqual(['-']);
  });
});
