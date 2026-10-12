// @vitest-environment node
import { expect, test } from 'vitest';

import { createSyntheticJourneysBundle } from '../../../scripts/evidence-fixture/journeys.ts';
import { parseScriptedJourneysWebsiteModel } from '../../../../src/scripted-journeys/public-evidence/index.ts';

import {
  describeJourneyCheck,
  getJourneyPlatformStatus,
  getJourneyRevisions,
  getJourneysPage,
} from './index.ts';

test('preserves all outcomes and distinguishes absent platform results', () => {
  const model = parseScriptedJourneysWebsiteModel(
    (createSyntheticJourneysBundle().payload as { websiteModel: unknown }).websiteModel,
  );
  expect(
    model.journeys
      .slice(0, 3)
      .map((journey) => getJourneyPlatformStatus(model, journey.id, 'claude')),
  ).toStrictEqual(['passed-initially', 'awaiting-confirmation', 'blocked']);
  expect(getJourneyPlatformStatus(model, 'claude-only', 'chatgpt')).toBe('not-run');
  expect(
    getJourneyRevisions(model, 'recovered')[0]!
      .steps[0]!.results.filter((result) => result.platform === 'chatgpt')
      .map((result) => [result.label, result.status]),
  ).toStrictEqual([
    ['Initial observation', 'failed'],
    ['Confirmation 1', 'passed'],
    ['Confirmation 2', 'passed'],
  ]);
  expect(getJourneysPage(model, 1)).toHaveLength(16);
  expect(getJourneysPage(model, 2)).toHaveLength(2);
  for (const page of [0, 3, 1.5, NaN]) expect(() => getJourneysPage(model, page)).toThrow();
  model.journeys = model.journeys.slice(0, 16);
  expect(() => getJourneysPage(model, 2)).toThrow();
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
