// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  createQualificationStageIds,
  getQualificationMaximumCallCount,
  getQualificationMaximumTokenCount,
  getQualificationPlannedCallCount,
} from './stages.ts';

describe('qualification stage planning', () => {
  test('derives the exact Custom maximum of seventy-two planned trial calls from twelve cases', () => {
    expect(getQualificationPlannedCallCount(12)).toBe(72);
    expect(getQualificationMaximumCallCount(72)).toBe(144);
  });

  test('bounds one diagnostic initial trial at two planned and four maximum calls', () => {
    expect(getQualificationPlannedCallCount(1, false)).toBe(2);
    expect(getQualificationMaximumCallCount(2)).toBe(4);
    expect(createQualificationStageIds(['release-case'], false)).toStrictEqual([
      'source-state',
      'coverage',
      'candidate',
      'baseline',
      'case:release-case:trial:initial:prepare',
      'case:release-case:trial:initial:deterministic-before',
      'case:release-case:trial:initial:actor',
      'case:release-case:trial:initial:deterministic-after',
      'case:release-case:trial:initial:assertions',
      'case:release-case:trial:initial:judge',
      'case:release-case:result',
    ]);
  });

  test('derives the aggregate token ceiling from the bounded call envelope', () => {
    expect(getQualificationMaximumTokenCount(144)).toBe(150_994_944);
    expect(() => getQualificationMaximumTokenCount(-1)).toThrow(
      'Qualification maximum call count must be a non-negative integer.',
    );
  });

  test('plans every trial stage before the terminal case result', () => {
    expect(createQualificationStageIds(['release-case'])).toStrictEqual([
      'source-state',
      'coverage',
      'candidate',
      'baseline',
      'case:release-case:trial:initial:prepare',
      'case:release-case:trial:initial:deterministic-before',
      'case:release-case:trial:initial:actor',
      'case:release-case:trial:initial:deterministic-after',
      'case:release-case:trial:initial:assertions',
      'case:release-case:trial:initial:judge',
      'case:release-case:trial:confirmation-1:prepare',
      'case:release-case:trial:confirmation-1:deterministic-before',
      'case:release-case:trial:confirmation-1:actor',
      'case:release-case:trial:confirmation-1:deterministic-after',
      'case:release-case:trial:confirmation-1:assertions',
      'case:release-case:trial:confirmation-1:judge',
      'case:release-case:trial:confirmation-2:prepare',
      'case:release-case:trial:confirmation-2:deterministic-before',
      'case:release-case:trial:confirmation-2:actor',
      'case:release-case:trial:confirmation-2:deterministic-after',
      'case:release-case:trial:confirmation-2:assertions',
      'case:release-case:trial:confirmation-2:judge',
      'case:release-case:result',
    ]);
  });
});
