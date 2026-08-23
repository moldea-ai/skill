// @vitest-environment node
import { expect, test } from 'vitest';

import { matchesWorkspacePathContract } from './validations.ts';

test.each([
  ['moldea/moldea.yaml', ['moldea/moldea.yaml'], [], true],
  ['moldea/runtimes/custom.md', [], ['moldea/runtimes/**/*.md'], true],
  ['moldea/runtimes/order/custom.md', [], ['moldea/runtimes/**/*.md'], true],
  ['moldea/runtimes/custom.ts', [], ['moldea/runtimes/**/*.md'], false],
  ['moldea/runtime/custom.md', [], ['moldea/runtimes/**/*.md'], false],
  ['src/unrelated.ts', ['moldea/moldea.yaml'], ['moldea/runtimes/**/*.md'], false],
])(
  'matchesWorkspacePathContract(%s) -> %s',
  (candidatePath, exactPaths, pathPatterns, expectedResult) => {
    expect(matchesWorkspacePathContract(candidatePath, exactPaths, pathPatterns)).toBe(
      expectedResult,
    );
  },
);
