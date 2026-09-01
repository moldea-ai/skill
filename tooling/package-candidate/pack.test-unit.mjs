// @vitest-environment node
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';

import { parsePackArguments } from './pack.mjs';

test('parses required paths and repeatable selected roots', () => {
  assert.deepEqual(
    parsePackArguments([
      '--workspace',
      './packages',
      '--output',
      './artifacts',
      '--runtime-compatibility-publication',
      './packages/apps/website/dist/compatibility/runtimes.json',
      '--root',
      '@moldea.ai/adapter-next',
      '--root',
      '@moldea.ai/adapter-other',
    ]),
    {
      artifactDirectory: resolve('./artifacts'),
      runtimeCompatibilityPublicationPath: resolve(
        './packages/apps/website/dist/compatibility/runtimes.json',
      ),
      selectedRootPackageNames: [
        '@moldea.ai/adapter-next',
        '@moldea.ai/adapter-other',
      ],
      workspaceRoot: resolve('./packages'),
    },
  );
});

test('rejects missing values, required paths, and unknown options', () => {
  assert.throws(() => parsePackArguments([]), /--workspace is required/);
  assert.throws(
    () => parsePackArguments(['--workspace', './packages']),
    /--output is required/,
  );
  assert.throws(
    () =>
      parsePackArguments([
        '--workspace',
        './packages',
        '--output',
        './artifacts',
      ]),
    /--runtime-compatibility-publication is required/,
  );
  assert.throws(() => parsePackArguments(['--workspace']), /requires a value/);
  assert.throws(
    () => parsePackArguments(['--unknown', 'value']),
    /Unknown candidate packer option/,
  );
});
