import type { IJourneyCheck } from '../../../../src/scripted-journeys/index.ts';

import type { IScriptedJourneysWebsiteModel } from './types.ts';

// the two product surfaces under test, rather than underlying API model providers
export const JOURNEY_PLATFORM_LABELS = { chatgpt: 'ChatGPT', claude: 'Claude' } as const;

/** Derives a journey cell from every recorded step, preserving missing-platform evidence. */
export const getJourneyPlatformStatus = (
  journey: IScriptedJourneysWebsiteModel['journeys'][number],
  platform: keyof typeof JOURNEY_PLATFORM_LABELS,
): 'passed' | 'failed' | 'blocked' | 'not-recorded' => {
  const results = journey.steps.map((step) =>
    step.results.find((result) => result.platform === platform),
  );
  if (results.some((result) => !result)) return 'not-recorded';
  if (results.some((result) => result?.status === 'failed')) return 'failed';
  return results.every((result) => result?.status === 'passed') ? 'passed' : 'blocked';
};

/** Describes the exact local criterion without implying that agent activity was observed. */
export const describeJourneyCheck = (check: IJourneyCheck): string => {
  switch (check.kind) {
    case 'path-exists':
      return `File exists: ${check.path}`;
    case 'path-absent':
      return `File absent: ${check.path}`;
    case 'no-changes':
      return 'No file changes in this step';
    case 'paths-changed':
      return `Changed paths: ${check.paths.join(', ')}`;
    case 'paths-unchanged':
      return `Preserved paths since ${check.since}: ${check.paths.join(', ')}`;
    case 'content-matches':
      return `Content in ${check.path} matches /${check.pattern}/`;
    case 'validate':
      return `Local CLI validation: ${check.result}`;
    case 'reply-matches':
      return `Reply matches /${check.pattern}/${check.absent ? ` and excludes /${check.absent}/` : ''}`;
  }
};
