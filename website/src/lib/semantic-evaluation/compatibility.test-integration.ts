// @vitest-environment node
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { resolveCompatibleSemanticAttemptId } from './compatibility.ts';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

test('selects the chained source attempt only after the 4.0.2 attestation exists', () => {
  const hasCompatibilityBridge = existsSync(
    join(REPOSITORY_ROOT, 'fixtures/release-evidence/compatibility-bridge-4.0.2.json'),
  );
  expect(resolveCompatibleSemanticAttemptId(REPOSITORY_ROOT)).toBe(
    hasCompatibilityBridge ? '20260830T054330932Z-semantic-441e439c' : null,
  );
});
