// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { createCodexExecArgs } from './utilities.ts';

describe('createCodexExecArgs', () => {
  test.each([
    ['actor', 'workspace-write'],
    ['judge', 'read-only'],
  ] as const)('creates the fixed %s host contract', (_role, sandbox) => {
    const args = createCodexExecArgs({
      outputPath: '/attempt/output.json',
      sandbox,
      schemaPath: '/attempt/schema.json',
      workspaceDirectory: '/attempt/workspace',
    });

    expect(args).toContain('gpt-5.6-terra');
    expect(args).toContain('model_reasoning_effort="medium"');
    expect(args).toContain('approval_policy="never"');
    expect(args).toContain('web_search="disabled"');
    expect(args).toContain('--ephemeral');
    expect(args).toContain('--ignore-user-config');
    expect(args).toContain('--ignore-rules');
    expect(args).toContain('--output-schema');
    expect(args).toContain('--output-last-message');
    expect(args.slice(-1)).toStrictEqual(['-']);
    expect(args[args.indexOf('--sandbox') + 1]).toBe(sandbox);
  });
});
