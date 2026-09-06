import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CALIBRATION_MINIMUM_HEADROOM_PERCENT,
  MOLDEA_SKILL_RESOURCE_PROFILES,
} from './profiles.mjs';

test('keeps ordinary, large, and absolute profiles ordered without raising CLI page peaks', () => {
  const { absolute, largeTraversal, ordinary } = MOLDEA_SKILL_RESOURCE_PROFILES;

  assert.equal(CALIBRATION_MINIMUM_HEADROOM_PERCENT, 25);
  assert.deepEqual(ordinary, {
    maxCompletedCommandCount: 64,
    maxCommandOutputBytes: 131_072,
    maxHostTokenCount: 1_250_000,
    maxModelVisibleToolOutputBytes: 1_048_576,
    maxAggregateMoldeaOutputBytes: 262_144,
    maxMoldeaCommandCount: 16,
    maxOutputPageBytes: 65_536,
  });
  assert.deepEqual(largeTraversal, {
    maxCompletedCommandCount: 64,
    maxCommandOutputBytes: 131_072,
    maxHostTokenCount: 1_250_000,
    maxModelVisibleToolOutputBytes: 4_194_304,
    maxAggregateMoldeaOutputBytes: 1_048_576,
    maxMoldeaCommandCount: 16,
    maxOutputPageBytes: 65_536,
  });
  assert.equal(largeTraversal.maxOutputPageBytes, ordinary.maxOutputPageBytes);
  assert.equal(largeTraversal.maxCommandOutputBytes, ordinary.maxCommandOutputBytes);
  assert.equal(ordinary.maxOutputPageBytes, 65_536);
  assert.ok(ordinary.maxCommandOutputBytes > ordinary.maxOutputPageBytes);
  assert.ok(largeTraversal.maxCompletedCommandCount >= ordinary.maxCompletedCommandCount);
  assert.ok(largeTraversal.maxHostTokenCount >= ordinary.maxHostTokenCount);
  assert.ok(
    largeTraversal.maxModelVisibleToolOutputBytes > ordinary.maxModelVisibleToolOutputBytes,
  );
  assert.ok(largeTraversal.maxMoldeaCommandCount >= ordinary.maxMoldeaCommandCount);
  assert.ok(largeTraversal.maxAggregateMoldeaOutputBytes > ordinary.maxAggregateMoldeaOutputBytes);
  assert.ok(absolute.maxMoldeaCommandCount > largeTraversal.maxMoldeaCommandCount);
  assert.ok(absolute.maxCompletedCommandCount > largeTraversal.maxCompletedCommandCount);
  assert.ok(absolute.maxHostTokenCount >= largeTraversal.maxHostTokenCount);
  assert.ok(
    absolute.maxModelVisibleToolOutputBytes > largeTraversal.maxModelVisibleToolOutputBytes,
  );
  assert.ok(absolute.maxMoldeaOutputBytes > largeTraversal.maxAggregateMoldeaOutputBytes);
  assert.ok(absolute.maxHostOutputBytes >= absolute.maxMoldeaOutputBytes);
  assert.equal(absolute.maxHostTokenCount, 2_097_152);
  assert.ok(absolute.maxModelVisibleToolOutputBytes >= absolute.maxMoldeaOutputBytes);
});
