// @vitest-environment node
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
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

test('rejects missing values, required paths, and unknown options', () => {
  assert.throws(() => parsePackArguments([]), /--workspace is required/);
  assert.throws(() => parsePackArguments(['--workspace', './packages']), /--output is required/);
  assert.throws(() => parsePackArguments(['--workspace']), /requires a value/);
  assert.throws(
    () => parsePackArguments(['--unknown', 'value']),
    /Unknown candidate packer option/,
  );
});
