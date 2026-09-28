// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { formatProjectToolInput } from './utilities.ts';

describe('formatProjectToolInput', () => {
  test('shows a recorded patch as readable lines', () => {
    const patch = '*** Begin Patch\n*** Add File: moldea/project.md\n+Example\n*** End Patch';
    const input = 'const p = ' + JSON.stringify(patch) + ';\ntext(await tools.apply_patch(p));\n';

    expect(formatProjectToolInput(input)).toStrictEqual({ source: patch, language: 'diff' });
  });

  test('keeps other tool input unchanged', () => {
    const input = 'const result = await tools.exec_command({ cmd: "pwd" });';

    expect(formatProjectToolInput(input)).toStrictEqual({
      source: input,
      language: 'javascript',
    });
  });

  test('does not unwrap malformed or unrelated patch-like input', () => {
    const input = 'const p = "bad";\ntext(await tools.apply_patch(p));';

    expect(formatProjectToolInput(input)).toStrictEqual({
      source: input,
      language: 'javascript',
    });
  });
});
