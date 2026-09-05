import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CALIBRATION_MINIMUM_HEADROOM_PERCENT,
  MOLDEA_SKILL_RESOURCE_PROFILES,
} from './profiles.mjs';

test('keeps ordinary, large, and absolute output profiles ordered without raising page peaks', () => {
  const { absolute, largeTraversal, ordinary } = MOLDEA_SKILL_RESOURCE_PROFILES;

  assert.equal(CALIBRATION_MINIMUM_HEADROOM_PERCENT, 25);
  assert.equal(largeTraversal.maxOutputPageBytes, ordinary.maxOutputPageBytes);
  assert.ok(largeTraversal.maxMoldeaCommandCount > ordinary.maxMoldeaCommandCount);
  assert.ok(largeTraversal.maxAggregateMoldeaOutputBytes > ordinary.maxAggregateMoldeaOutputBytes);
  assert.ok(absolute.maxMoldeaCommandCount > largeTraversal.maxMoldeaCommandCount);
  assert.ok(absolute.maxMoldeaOutputBytes > largeTraversal.maxAggregateMoldeaOutputBytes);
  assert.ok(absolute.maxHostOutputBytes >= absolute.maxMoldeaOutputBytes);
  assert.equal(absolute.maxHostTokenCount, 262_144);
  assert.ok(absolute.maxModelVisibleToolOutputBytes >= absolute.maxMoldeaOutputBytes);
});
