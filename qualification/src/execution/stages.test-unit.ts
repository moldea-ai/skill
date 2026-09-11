// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { QUALIFICATION_CANDIDATE_TOKEN_LIMIT } from '../constants/index.ts';
import {
  assertQualificationCandidateTokenReservation,
  createQualificationStageIds,
  getQualificationMaximumCallCount,
  getQualificationMaximumTokenCount,
  getQualificationPlannedCallCount,
} from './stages.ts';

describe('qualification stage planning', () => {
  test('derives the exact Custom maximum of ninety-six planned trial calls from twelve cases', () => {
    expect(getQualificationPlannedCallCount(12)).toBe(96);
    expect(getQualificationMaximumCallCount(96)).toBe(192);
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
    expect(getQualificationMaximumTokenCount(192)).toBe(402_653_184);
    expect(() => getQualificationMaximumTokenCount(-1)).toThrow(
      'Qualification maximum call count must be a non-negative integer.',
    );
  });

  test('accepts an exact candidate reservation boundary and refuses one token over', () => {
    const reservation = getQualificationMaximumTokenCount(1);

    expect(() =>
      assertQualificationCandidateTokenReservation(
        QUALIFICATION_CANDIDATE_TOKEN_LIMIT - reservation,
        0,
      ),
    ).not.toThrow();
    expect(() =>
      assertQualificationCandidateTokenReservation(
        QUALIFICATION_CANDIDATE_TOKEN_LIMIT - reservation + 1,
        0,
      ),
    ).toThrow('Qualification candidate token stop reached');
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
      'case:release-case:trial:confirmation-3:prepare',
      'case:release-case:trial:confirmation-3:deterministic-before',
      'case:release-case:trial:confirmation-3:actor',
      'case:release-case:trial:confirmation-3:deterministic-after',
      'case:release-case:trial:confirmation-3:assertions',
      'case:release-case:trial:confirmation-3:judge',
      'case:release-case:result',
    ]);
  });
});
