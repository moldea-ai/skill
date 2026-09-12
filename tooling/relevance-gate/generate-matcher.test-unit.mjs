import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPortableMatcher, generatePortableMatcher } from './generate-matcher.mjs';

test('bundles locked dependencies with licenses and no package runtime imports', async () => {
  const result = await buildPortableMatcher();
  assert.ok(Buffer.byteLength(result.source) < 1_048_576);
  assert.ok(result.imports.every((entry) => entry.path.startsWith('node:')));
  assert.equal(result.packageCount, 5);
  for (const name of [
    '@moldea.ai/core',
    '@moldea.ai/repository',
    'yaml',
    'zod',
    'error-message-utils',
  ]) {
    assert.ok(result.licenses.includes(`${name}@`));
  }
  assert.ok(result.licenses.includes('Permission is hereby granted'));
  await generatePortableMatcher({ check: true });
});
