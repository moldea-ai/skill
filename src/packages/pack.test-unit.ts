// @vitest-environment node
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { expectToThrowCode } from 'jg-exception/testing';
import { ERRORS as PROCESS_ERRORS } from 'jg-process';
import { test } from 'vitest';

import { parsePackArguments } from './pack.ts';

test('parses required paths and repeatable selected roots', () => {
  assert.deepEqual(
    parsePackArguments([
      '--workspace',
      './packages',
      '--output',
      './artifacts',
      '--root',
      '@moldea.ai/extension-next',
      '--root',
      '@moldea.ai/extension-other',
    ]),
    {
      artifactDirectory: resolve('./artifacts'),
      selectedRootPackageNames: ['@moldea.ai/extension-next', '@moldea.ai/extension-other'],
      workspaceRoot: resolve('./packages'),
    },
  );
});

test.each([
  [[]],
  [['--workspace', './packages']],
  [['--workspace']],
  [['--workspace', './packages', '--output', './artifacts', '--unknown', 'value']],
  [['--workspace', './a', '--workspace', './b', '--output', './artifacts']],
])('rejects missing values, required paths, and unknown options %o', (arguments_) => {
  expectToThrowCode(() => parsePackArguments(arguments_), PROCESS_ERRORS.INVALID_ARGUMENTS);
});
