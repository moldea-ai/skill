import {
  getLandingExampleFile,
  getLandingExampleLine,
  LANDING_EXAMPLE,
  LANDING_EXAMPLE_INITIAL_FILES,
  LANDING_EXAMPLE_MAINTAINED_FILES,
} from './fixture.ts';

const createLineDiff = (initialLine: string, maintainedLine: string): string =>
  `-${initialLine}\n+${maintainedLine}`;

/**
 * Selects a current-source excerpt and removes its surrounding indentation.
 * @throws
 * - Landing example file is missing
 * - Landing example excerpt is missing
 */
const getHeroExcerpt = (path: string, firstLine: string, lastLine: string): string => {
  const lines = getLandingExampleFile(LANDING_EXAMPLE_INITIAL_FILES, path).split('\n');
  const start = lines.findIndex((line) => line.trim() === firstLine);
  const end = lines.findIndex((line, index) => index >= start && line.trim() === lastLine);
  if (start < 0 || end < start) throw new Error(`Landing example excerpt is missing: ${path}`);

  const indentation = lines[start]!.length - lines[start]!.trimStart().length;
  return lines
    .slice(start, end + 1)
    .map((line) => line.slice(indentation))
    .join('\n');
};

const lookupOutline = getHeroExcerpt(
  LANDING_EXAMPLE.paths.orderLookup,
  'export const lookupOrder = async (orderId: string) => ({',
  '});',
)
  .split('\n')[0]!
  .replace('=> ({', '=> ({ ... });');

// concise current-state excerpts; the full fixture remains available to deterministic checks
export const LANDING_EXAMPLE_HERO_SOURCES: Readonly<Record<string, string>> = {
  [LANDING_EXAMPLE.paths.project]: getHeroExcerpt(
    LANDING_EXAMPLE.paths.project,
    'Trailside sells hiking and camping gear online. Customers contact support about deliveries and returns.',
    'Support can explain the policy and look up orders. It cannot approve refunds or change orders.',
  ),
  [LANDING_EXAMPLE.paths.agent]: getHeroExcerpt(
    LANDING_EXAMPLE.paths.agent,
    'const response = await client.responses.create({',
    '});',
  ),
  [LANDING_EXAMPLE.paths.contracts]: [
    getHeroExcerpt(
      LANDING_EXAMPLE.paths.contracts,
      'export const SupportInput = z.strictObject({',
      '});',
    ),
    getHeroExcerpt(
      LANDING_EXAMPLE.paths.contracts,
      'export const SupportOutput = z.strictObject({',
      '});',
    ),
  ].join('\n\n'),
  [LANDING_EXAMPLE.paths.orderLookup]: [
    lookupOutline,
    getHeroExcerpt(
      LANDING_EXAMPLE.paths.orderLookup,
      'export const lookupOrderTool = {',
      '} as const;',
    ),
  ].join('\n\n'),
  [LANDING_EXAMPLE.paths.policyContext]: getHeroExcerpt(
    LANDING_EXAMPLE.paths.policyContext,
    `Customers may request a refund within ${LANDING_EXAMPLE.initialRefundWindowDays} completed days of purchase.`,
    'The application decides eligibility. The support agent explains the decision and looks up the order when needed.',
  ),
};

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
        'Explain that customers may request',
      ),
      getLandingExampleLine(
        LANDING_EXAMPLE_MAINTAINED_FILES,
        LANDING_EXAMPLE.paths.instruction,
        'Explain that customers may request',
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
