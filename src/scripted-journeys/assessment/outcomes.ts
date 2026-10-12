import type { IJourneyCheckResult, IJourneyOutcome, IJourneyPlatform } from '../index.ts';

/** Derives a step outcome without treating unavailable evidence as passing. */
export const deriveStepOutcome = (
  checks: IJourneyCheckResult[],
  dependencies: IJourneyOutcome[],
): IJourneyOutcome => {
  if (checks.some((check) => check.status === 'failed')) return 'failed';
  if (
    checks.length === 0 ||
    dependencies.some((status) => status !== 'passed') ||
    checks.some((check) => check.status === 'blocked')
  )
    return 'blocked';
  return 'passed';
};

/** Requires every step to pass before a journey passes. */
export const deriveJourneyOutcome = (steps: IJourneyOutcome[]): IJourneyOutcome =>
  steps.includes('failed')
    ? 'failed'
    : steps.length > 0 && steps.every((status) => status === 'passed')
      ? 'passed'
      : 'blocked';

/** Distinguishes complete failures from diagnostic runs missing a platform. */
export const deriveRunOutcome = (
  platforms: { platform: IJourneyPlatform; journeys: { status: IJourneyOutcome }[] }[],
): 'passed' | 'failed' | 'incomplete' => {
  if (new Set(platforms.map((entry) => entry.platform)).size !== 2) return 'incomplete';
  return platforms.every(
    (entry) =>
      entry.journeys.length > 0 && entry.journeys.every((journey) => journey.status === 'passed'),
  )
    ? 'passed'
    : 'failed';
};
