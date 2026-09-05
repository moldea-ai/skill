// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCompatibleMajorRange,
  parseCompatibleMajorRange,
  parseStableVersion,
} from './identity.mjs';

test('parseStableVersion accepts only stable exact versions', () => {
  assert.equal(parseStableVersion('3.3.7'), '3.3.7');

  for (const version of ['v3.3.7', '3.3', '^3.3.7', '3.3.7-beta.1', '03.3.7', 'latest']) {
    assert.throws(() => parseStableVersion(version), /stable exact semantic version/);
  }
});

test('createCompatibleMajorRange keeps patches and minors inside one stable major', () => {
  assert.equal(createCompatibleMajorRange('7.4.2'), '^7.0.0');
  assert.throws(() => createCompatibleMajorRange('7.4.2-beta.1'), /stable exact semantic version/);
});

test('parseCompatibleMajorRange accepts only canonical nonzero-major ranges', () => {
  assert.equal(parseCompatibleMajorRange('^7.0.0'), '^7.0.0');

  for (const versionRange of ['7.0.0', '^7.1.0', '>=7.0.0 <8.0.0', '^0.1.0']) {
    assert.throws(() => parseCompatibleMajorRange(versionRange), /compatible major range/);
  }
});
