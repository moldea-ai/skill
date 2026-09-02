// @vitest-environment node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { resolveCompatibleSemanticAttemptId } from './compatibility.ts';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

test('selects the source-attested semantic attempt for release 4.0.1', () => {
  expect(resolveCompatibleSemanticAttemptId(REPOSITORY_ROOT)).toBe(
    '20260830T054330932Z-semantic-441e439c',
  );
});
