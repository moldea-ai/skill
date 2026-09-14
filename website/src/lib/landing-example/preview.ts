import {
  getLandingExampleLine,
  LANDING_EXAMPLE,
  LANDING_EXAMPLE_INITIAL_FILES,
  LANDING_EXAMPLE_MAINTAINED_FILES,
} from './fixture.ts';

const createLineDiff = (initialLine: string, maintainedLine: string): string =>
  `-${initialLine}\n+${maintainedLine}`;

const initialBoundaryAssertions = [
  getLandingExampleLine(
    LANDING_EXAMPLE_INITIAL_FILES,
    LANDING_EXAMPLE.paths.refundPolicyTest,
    `isRefundEligible(${LANDING_EXAMPLE.initialRefundWindowDays})`,
  ),
  getLandingExampleLine(
    LANDING_EXAMPLE_INITIAL_FILES,
    LANDING_EXAMPLE.paths.refundPolicyTest,
    `isRefundEligible(${LANDING_EXAMPLE.initialRefundWindowDays + 1})`,
  ),
];
const maintainedBoundaryAssertions = [
  getLandingExampleLine(
    LANDING_EXAMPLE_MAINTAINED_FILES,
    LANDING_EXAMPLE.paths.refundPolicyTest,
    `isRefundEligible(${LANDING_EXAMPLE.maintainedRefundWindowDays})`,
  ),
  getLandingExampleLine(
    LANDING_EXAMPLE_MAINTAINED_FILES,
    LANDING_EXAMPLE.paths.refundPolicyTest,
    `isRefundEligible(${LANDING_EXAMPLE.maintainedRefundWindowDays + 1})`,
  ),
];

// source-derived previews shared by the landing and visual product pages
export const LANDING_EXAMPLE_PREVIEW = {
  contextDiff: {
    path: LANDING_EXAMPLE.paths.policyContext,
    source: createLineDiff(
      getLandingExampleLine(
        LANDING_EXAMPLE_INITIAL_FILES,
        LANDING_EXAMPLE.paths.policyContext,
        'Customers may request',
      ),
      getLandingExampleLine(
        LANDING_EXAMPLE_MAINTAINED_FILES,
        LANDING_EXAMPLE.paths.policyContext,
        'Customers may request',
      ),
    ),
  },
  instructionDiff: {
    path: LANDING_EXAMPLE.paths.instruction,
    source: createLineDiff(
      getLandingExampleLine(
        LANDING_EXAMPLE_INITIAL_FILES,
        LANDING_EXAMPLE.paths.instruction,
        'Explain that refunds',
      ),
      getLandingExampleLine(
        LANDING_EXAMPLE_MAINTAINED_FILES,
        LANDING_EXAMPLE.paths.instruction,
        'Explain that refunds',
      ),
    ),
  },
  policyDiff: {
    path: LANDING_EXAMPLE.paths.refundPolicy,
    source: createLineDiff(
      getLandingExampleLine(
        LANDING_EXAMPLE_INITIAL_FILES,
        LANDING_EXAMPLE.paths.refundPolicy,
        'return completedDays',
      ),
      getLandingExampleLine(
        LANDING_EXAMPLE_MAINTAINED_FILES,
        LANDING_EXAMPLE.paths.refundPolicy,
        'return completedDays',
      ),
    ),
  },
  testDiff: {
    path: LANDING_EXAMPLE.paths.refundPolicyTest,
    source: [
      ...initialBoundaryAssertions.map((line) => `-${line}`),
      ...maintainedBoundaryAssertions.map((line) => `+${line}`),
    ].join('\n'),
  },
} as const;
