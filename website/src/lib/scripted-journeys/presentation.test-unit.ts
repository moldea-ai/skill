// @vitest-environment node
import { expect, test } from 'vitest';

import {
  createSyntheticJourneysBundle,
  createSyntheticJourneySnapshot,
  createSyntheticLegacyJourneysBundle,
} from '../../../scripts/evidence-fixture/journeys.ts';
import { parseScriptedJourneysWebsiteModel } from '../../../../src/scripted-journeys/public-evidence/index.ts';

import {
  describeJourneyCheck,
  getJourneyPlatformStatus,
  getJourneyRevisions,
  getJourneysPage,
  getJourneyPagination,
  getJourneyCellProvenance,
  getJourneyProvenanceSummary,
  getJourneyRequestCount,
  getJourneyCatalogCounts,
} from './index.ts';

test('counts the selected historical catalog without multiplying provider observations', () => {
  const model = parseScriptedJourneysWebsiteModel(
    (createSyntheticLegacyJourneysBundle().payload as { websiteModel: unknown }).websiteModel,
  );
  expect(getJourneyCatalogCounts(model)).toStrictEqual({ journeyCount: 19, requestCount: 20 });
  expect(getJourneyRequestCount(model, 'initialize')).toBe(2);
});

test('counts catalog requests without multiplying providers, confirmations or retained rows', () => {
  const model = parseScriptedJourneysWebsiteModel(
    (createSyntheticJourneySnapshot().payload as { websiteModel: unknown }).websiteModel,
  );
  expect(model.journeys).toHaveLength(19);
  expect(getJourneyCatalogCounts(model)).toStrictEqual({ journeyCount: 18, requestCount: 19 });
  expect(getJourneyRequestCount(model, 'initialize')).toBe(2);
  expect(getJourneyRequestCount(model, 'recovered')).toBe(1);
  expect(getJourneyRequestCount(model, 'additional-2')).toBe(1);
  expect(getJourneyRequestCount(model, 'additional-11')).toBe(1);

  model.cells = [];
  expect(getJourneyCatalogCounts(model)).toStrictEqual({ journeyCount: 18, requestCount: 19 });
  expect(getJourneyRequestCount(model, 'initialize')).toBe(2);
});

test('uses the row catalog before current or provider-specific historical definitions', () => {
  const model = parseScriptedJourneysWebsiteModel(
    (createSyntheticJourneySnapshot().payload as { websiteModel: unknown }).websiteModel,
  );
  const row = model.journeys.find(({ id }) => id === 'additional-11')!;
  const earlier = model.sources.find(({ id }) => id === row.catalogSourceId)!;
  if (earlier.kind !== 'campaign') throw new Error('Expected the earlier campaign catalog.');
  const definition = earlier.assessment.definitions.find(({ id }) => id === row.id)!;
  definition.steps.push({ ...definition.steps[0]!, id: 'earlier-follow-up' });
  expect(getJourneyRequestCount(model, row.id)).toBe(2);
  expect(getJourneyCatalogCounts(model)).toStrictEqual({ journeyCount: 18, requestCount: 19 });

  const initial = model.journeys.find(({ id }) => id === 'initialize')!;
  delete initial.catalogSourceId;
  expect(getJourneyRequestCount(model, initial.id)).toBe(2);
});

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
  expect(getJourneysPage(model, 2)).toHaveLength(3);
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
  expect(describeJourneyCheck({ kind: 'no-changes' })).toBe('Expected no file changes');
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

test.each([
  [1, 1, [1]],
  [1, 2, [1, 2]],
  [2, 4, [1, 2, 3, 4]],
  [1, 512, [1, 2, 'ellipsis', 512]],
  [256, 512, [1, 'ellipsis', 255, 256, 257, 'ellipsis', 512]],
  [512, 512, [1, 'ellipsis', 511, 512]],
])('getJourneyPagination(%d, %d) -> %o', (page, pages, expected) => {
  expect(getJourneyPagination(page, pages)).toStrictEqual(expected);
});
