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
  test('derives every refund preview from its canonical source file', () => {
    expect(LANDING_EXAMPLE_PREVIEW.policyDiff).toStrictEqual({
      path: LANDING_EXAMPLE.paths.refundPolicy,
      source: [
        `-${getLandingExampleLine(LANDING_EXAMPLE_INITIAL_FILES, LANDING_EXAMPLE.paths.refundPolicy, 'return completedDays')}`,
        `+${getLandingExampleLine(LANDING_EXAMPLE_MAINTAINED_FILES, LANDING_EXAMPLE.paths.refundPolicy, 'return completedDays')}`,
      ].join('\n'),
    });
    expect(LANDING_EXAMPLE_PREVIEW.contextDiff).toStrictEqual({
      path: LANDING_EXAMPLE.paths.policyContext,
      source: [
        `-${getLandingExampleLine(LANDING_EXAMPLE_INITIAL_FILES, LANDING_EXAMPLE.paths.policyContext, 'Customers may request')}`,
        `+${getLandingExampleLine(LANDING_EXAMPLE_MAINTAINED_FILES, LANDING_EXAMPLE.paths.policyContext, 'Customers may request')}`,
      ].join('\n'),
    });
    expect(LANDING_EXAMPLE_PREVIEW.instructionDiff).toStrictEqual({
      path: LANDING_EXAMPLE.paths.instruction,
      source: [
        `-${getLandingExampleLine(LANDING_EXAMPLE_INITIAL_FILES, LANDING_EXAMPLE.paths.instruction, 'Explain that customers may request')}`,
        `+${getLandingExampleLine(LANDING_EXAMPLE_MAINTAINED_FILES, LANDING_EXAMPLE.paths.instruction, 'Explain that customers may request')}`,
      ].join('\n'),
    });
    expect(LANDING_EXAMPLE_PREVIEW.testDiff).toStrictEqual({
      path: LANDING_EXAMPLE.paths.refundPolicyTest,
      source: [
        `-${getLandingExampleLine(LANDING_EXAMPLE_INITIAL_FILES, LANDING_EXAMPLE.paths.refundPolicyTest, `isRefundEligible(${LANDING_EXAMPLE.initialRefundWindowDays})`)}`,
        `-${getLandingExampleLine(LANDING_EXAMPLE_INITIAL_FILES, LANDING_EXAMPLE.paths.refundPolicyTest, `isRefundEligible(${LANDING_EXAMPLE.initialRefundWindowDays + 1})`)}`,
        `+${getLandingExampleLine(LANDING_EXAMPLE_MAINTAINED_FILES, LANDING_EXAMPLE.paths.refundPolicyTest, `isRefundEligible(${LANDING_EXAMPLE.maintainedRefundWindowDays})`)}`,
        `+${getLandingExampleLine(LANDING_EXAMPLE_MAINTAINED_FILES, LANDING_EXAMPLE.paths.refundPolicyTest, `isRefundEligible(${LANDING_EXAMPLE.maintainedRefundWindowDays + 1})`)}`,
      ].join('\n'),
    });
  });
});
