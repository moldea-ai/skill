// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  createQualificationStageIds,
  getQualificationMaximumPlannedTrialCallCount,
} from './stages.ts';

describe('qualification stage planning', () => {
  test('derives the exact Custom maximum of forty-eight planned trial calls from eight cases', () => {
    expect(getQualificationMaximumPlannedTrialCallCount(8)).toBe(48);
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
