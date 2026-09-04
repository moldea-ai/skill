import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { inspectReleaseEvidence } from './evidence.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('reports missing exact current evidence', async () => {
  const issues = await inspectReleaseEvidence(REPOSITORY_ROOT);
  assert.ok(issues.length > 0);
  assert.ok(issues.some((issue) => /current|missing|protocol|match|passing/iu.test(issue)));
});
