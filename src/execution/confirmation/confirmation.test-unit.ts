// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  EVALUATION_CONFIRMATION_POLICY,
  getEvaluationConfirmationResolution,
} from './confirmation.ts';
import type { IEvaluationConfirmationResolution } from './types.ts';

describe('evaluation confirmation policy', () => {
  test('exposes the bounded two-vote quorum', () => {
    expect(EVALUATION_CONFIRMATION_POLICY).toStrictEqual({
      version: 2,
      requiredPassingConfirmations: 2,
      requiredFailingConfirmations: 2,
      maximumConfirmations: 3,
    });
  });

  test.each<readonly [readonly boolean[], IEvaluationConfirmationResolution]>([
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
  ])('getEvaluationConfirmationResolution(%o) -> %s', (confirmations, expectedResolution) => {
    expect(getEvaluationConfirmationResolution(confirmations)).toBe(expectedResolution);
  });

  test('rejects invalid and post-quorum sequences', () => {
    expect(() => getEvaluationConfirmationResolution([true, true, false])).toThrow(/after/u);
    expect(() => getEvaluationConfirmationResolution([false, false, true])).toThrow(/after/u);
    expect(() => getEvaluationConfirmationResolution([true, false, true, false])).toThrow(
      /bounded/u,
    );
    expect(() =>
      getEvaluationConfirmationResolution([true, 'pass'] as unknown as readonly boolean[]),
    ).toThrow(/bounded/u);
  });
});
