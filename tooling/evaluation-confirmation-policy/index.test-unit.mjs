import assert from 'node:assert/strict';
import test from 'node:test';

import { EVALUATION_CONFIRMATION_POLICY, getEvaluationConfirmationResolution } from './index.mjs';

test('confirmation policy exposes the bounded two-vote quorum', () => {
  assert.deepEqual(EVALUATION_CONFIRMATION_POLICY, {
    version: 2,
    requiredPassingConfirmations: 2,
    requiredFailingConfirmations: 2,
    maximumConfirmations: 3,
  });
});

test('confirmation policy resolves every valid ordered sequence', () => {
  const cases = [
    [[], 'awaiting-confirmation'],
    [[true], 'awaiting-confirmation'],
    [[false], 'awaiting-confirmation'],
    [[true, true], 'recovered'],
    [[false, false], 'confirmed-failure'],
    [[true, false], 'awaiting-confirmation'],
    [[false, true], 'awaiting-confirmation'],
    [[true, false, true], 'recovered'],
    [[false, true, true], 'recovered'],
    [[true, false, false], 'confirmed-failure'],
    [[false, true, false], 'confirmed-failure'],
  ];

  for (const [confirmations, expectedResolution] of cases) {
    assert.equal(getEvaluationConfirmationResolution(confirmations), expectedResolution);
  }
});

test('confirmation policy rejects invalid and post-quorum sequences', () => {
  assert.throws(() => getEvaluationConfirmationResolution([true, true, false]), /after/u);
  assert.throws(() => getEvaluationConfirmationResolution([false, false, true]), /after/u);
  assert.throws(() => getEvaluationConfirmationResolution([true, false, true, false]), /bounded/u);
  assert.throws(() => getEvaluationConfirmationResolution([true, 'pass']), /bounded/u);
});
