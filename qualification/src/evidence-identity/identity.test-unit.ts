// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { isQualificationEvaluatorSourcePath } from './identity.ts';

describe('qualification evaluator source classifier', () => {
  test.each([
    ['qualification/src/storage/index.ts', false],
    ['qualification/src/evidence-identity/identity.ts', false],
    ['qualification/src/baseline/baseline.ts', false],
    ['qualification/src/compatibility/loader.ts', false],
    ['qualification/src/cli/runner.ts', false],
    ['qualification/src/result/contract-reader.ts', false],
    ['qualification/src/result/evidence.ts', false],
    ['qualification/src/result/recorder.ts', false],
    ['qualification/src/result/index.ts', false],
    ['qualification/src/execution/executor.ts', true],
    ['qualification/src/result/sanitizer.ts', true],
    ['qualification/src/compatibility/index.ts', true],
    ['qualification/src/new-production-module.ts', true],
    ['qualification/src/execution/executor.test-unit.ts', false],
    ['qualification/src/contracts/generated.d.ts', false],
    ['tooling/package-candidate/index.mjs', false],
  ] as const)('isQualificationEvaluatorSourcePath(%s) -> %s', (relativePath, expected) => {
    expect(isQualificationEvaluatorSourcePath(relativePath)).toBe(expected);
  });
});
