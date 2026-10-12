// @vitest-environment node
import { expect, test } from 'vitest';

import {
  createSyntheticJourneysBundle,
  createSyntheticJourneySnapshot,
} from '../../../scripts/evidence-fixture/journeys.ts';
import { parseScriptedJourneysWebsiteModel } from '../../../../src/scripted-journeys/public-evidence/index.ts';

import {
  describeJourneyCheck,
  getJourneyPlatformStatus,
  getJourneyRevisions,
  getJourneysPage,
  getJourneyCellProvenance,
  getJourneyProvenanceSummary,
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

test('keeps mixed revisions, historical requests, earlier-only rows and single-provider coverage distinct', () => {
  const model = parseScriptedJourneysWebsiteModel(
    (createSyntheticJourneySnapshot().payload as { websiteModel: unknown }).websiteModel,
  );
  const revisions = getJourneyRevisions(model, 'additional-1');
  expect(revisions.map((revision) => revision.steps[0]!.request)).toStrictEqual([
    'Read the revised policy and preserve all saved project knowledge.',
    'Read the saved project policy without editing files.',
  ]);
  expect(revisions[0]!.steps[0]!.results.map(({ platform }) => platform)).toStrictEqual([
    'chatgpt',
  ]);
  expect(revisions[1]!.steps[0]!.results.map(({ platform }) => platform)).toStrictEqual(['claude']);
  expect(getJourneyPlatformStatus(model, 'additional-2', 'claude')).toBe('not-run');
  expect(getJourneyRevisions(model, 'additional-3')[1]!.label).toContain(
    'fixture identity unavailable',
  );
  expect(getJourneyRevisions(model, 'additional-11')[0]!.label).toBe('Earlier catalog requests');
  expect(getJourneyCellProvenance(model, 'additional-1', 'claude')).toContain(
    'Earlier skill or test revision',
  );
  expect(getJourneyProvenanceSummary(model)).toBe(
    'Multiple skill versions are present. Multiple evaluation methods are present.',
  );
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
