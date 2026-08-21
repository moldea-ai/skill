// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseStableVersion } from './identity.mjs';

test('parseStableVersion accepts only stable exact versions', () => {
  assert.equal(parseStableVersion('3.3.7'), '3.3.7');

  for (const version of ['v3.3.7', '3.3', '^3.3.7', '3.3.7-beta.1', '03.3.7', 'latest']) {
    assert.throws(() => parseStableVersion(version), /stable exact semantic version/);
  }
});
