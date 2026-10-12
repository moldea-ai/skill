// @vitest-environment node
import { expect, test } from 'vitest';

import { createSyntheticJourneysBundle } from '../../../scripts/evidence-fixture/journeys.ts';
import { parseScriptedJourneysWebsiteModel } from '../../../../src/scripted-journeys/public-evidence/index.ts';

import { describeJourneyCheck, getJourneyPlatformStatus } from './index.ts';

test('preserves all outcomes and distinguishes absent platform results', () => {
  const model = parseScriptedJourneysWebsiteModel(
    (createSyntheticJourneysBundle().payload as { websiteModel: unknown }).websiteModel,
  );
  expect(
    model.journeys.map((journey) => getJourneyPlatformStatus(journey, 'claude')),
  ).toStrictEqual(['passed', 'failed', 'blocked']);
  model.journeys[0]!.steps[0]!.results = [];
  expect(getJourneyPlatformStatus(model.journeys[0]!, 'chatgpt')).toBe('not-recorded');
});

test('labels local checks without treating a reply match as observed execution', () => {
  expect(
    describeJourneyCheck({
      kind: 'reply-matches',
      pattern: 'valid',
      absent: 'invalid',
      skillBehavior: false,
    }),
  ).toBe('Reply matches /valid/ and excludes /invalid/');
  expect(
    describeJourneyCheck({ kind: 'paths-unchanged', paths: ['moldea/**'], since: 'fixture' }),
  ).toBe('Preserved paths since fixture: moldea/**');
});
