// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  getLandingExampleLine,
  LANDING_EXAMPLE,
  LANDING_EXAMPLE_INITIAL_FILES,
  LANDING_EXAMPLE_MAINTAINED_FILES,
} from './fixture.ts';
import { LANDING_EXAMPLE_PREVIEW } from './preview.ts';

describe('LANDING_EXAMPLE_PREVIEW', () => {
  test('derives both versions of every refund preview from their canonical sources', () => {
    for (const [key, path, needle] of [
      ['policyDiff', LANDING_EXAMPLE.paths.refundPolicy, 'return completedDays'],
      ['contextDiff', LANDING_EXAMPLE.paths.policyContext, 'Customers may request'],
      ['instructionDiff', LANDING_EXAMPLE.paths.instruction, 'Explain that customers may request'],
    ] as const) {
      expect(LANDING_EXAMPLE_PREVIEW[key]).toStrictEqual({
        path,
        oldValue: getLandingExampleLine(LANDING_EXAMPLE_INITIAL_FILES, path, needle) + '\n',
        newValue: getLandingExampleLine(LANDING_EXAMPLE_MAINTAINED_FILES, path, needle) + '\n',
      });
    }
    expect(LANDING_EXAMPLE_PREVIEW.testDiff).toStrictEqual({
      path: LANDING_EXAMPLE.paths.refundPolicyTest,
      oldValue:
        [
          getLandingExampleLine(
            LANDING_EXAMPLE_INITIAL_FILES,
            LANDING_EXAMPLE.paths.refundPolicyTest,
            'isRefundEligible(30)',
          ),
          getLandingExampleLine(
            LANDING_EXAMPLE_INITIAL_FILES,
            LANDING_EXAMPLE.paths.refundPolicyTest,
            'isRefundEligible(31)',
          ),
        ].join('\n') + '\n',
      newValue:
        [
          getLandingExampleLine(
            LANDING_EXAMPLE_MAINTAINED_FILES,
            LANDING_EXAMPLE.paths.refundPolicyTest,
            'isRefundEligible(14)',
          ),
          getLandingExampleLine(
            LANDING_EXAMPLE_MAINTAINED_FILES,
            LANDING_EXAMPLE.paths.refundPolicyTest,
            'isRefundEligible(15)',
          ),
        ].join('\n') + '\n',
    });
  });
});
