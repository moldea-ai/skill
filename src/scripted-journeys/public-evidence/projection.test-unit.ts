// @vitest-environment node
import { expect, test } from 'vitest';

import { createSyntheticJourneysBundle } from '../../../website/scripts/evidence-fixture/journeys.ts';
import type { IJourneyCampaign } from '../index.ts';

import { createJourneysEvidenceBundle, parseScriptedJourneysWebsiteModel } from './index.ts';

test('projects retained trials, original requests and complete source artifacts with partial coverage', () => {
  const bundle = createSyntheticJourneysBundle();
  const model = parseScriptedJourneysWebsiteModel(
    (bundle.payload as { websiteModel: unknown }).websiteModel,
  );
  const source = model.sources[0]!;
  expect(source.kind).toBe('campaign');
  if (source.kind !== 'campaign') throw new Error('Expected campaign.');
  expect(source.assessment.definitions[0]!.steps[0]!.request).toBe('Initialize moldea.');
  expect(source.captures['chatgpt/initialize/initial/initialize']!.files).toStrictEqual([
    { path: 'moldea/project.md', status: 'created' },
    { path: 'moldea/moldea.yaml', status: 'created' },
  ]);
  const recovered = source.assessment.platforms[0]!.resolutions.find(
    (entry) => entry.journeyId === 'recovered',
  )!;
  expect(recovered.status).toBe('recovered');
  expect(recovered.confirmationTrialIds).toHaveLength(2);
  expect(recovered.failedChecks).toHaveLength(1);
  expect(
    source.assessment.platforms[0]!.trials[0]!.journeys.find((entry) => entry.id === 'recovered')!
      .status,
  ).toBe('failed');
  expect(model.coverage[0]!.current).toBe(model.coverage[0]!.total - 1);
  expect(model.status).toBe('incomplete');
  expect(bundle.artifacts.files.map(({ path }) => path)).toContain(
    'chatgpt/recovered/c2/read/reply.md',
  );
  expect(bundle.artifacts.files.map(({ path }) => path)).toContain('assessment.json');
});

test('refuses to fabricate missing captures and incomplete selected steps', () => {
  const bundle = createSyntheticJourneysBundle();
  const assessment = (
    bundle.payload as { websiteModel: { sources: { assessment: IJourneyCampaign }[] } }
  ).websiteModel.sources[0]!.assessment;
  const input = {
    assessment,
    definitions: assessment.definitions,
    skill: assessment.bundle.skill,
    instructions: assessment.bundle.instructions,
    artifacts: [],
  };
  expect(() => createJourneysEvidenceBundle(input)).toThrow(
    'Missing journey presentation artifact',
  );
  const model = parseScriptedJourneysWebsiteModel(
    (bundle.payload as { websiteModel: unknown }).websiteModel,
  );
  const source = model.sources[0]!;
  if (source.kind !== 'campaign') throw new Error('Expected campaign.');
  source.assessment.platforms[0]!.trials[0]!.journeys[0]!.steps = [];
  expect(() => parseScriptedJourneysWebsiteModel(model)).toThrow(
    'Campaign step inventory mismatch',
  );
});

test('blocked evidence keeps actual captures without becoming a missing provider', () => {
  const model = parseScriptedJourneysWebsiteModel(
    (createSyntheticJourneysBundle().payload as { websiteModel: unknown }).websiteModel,
  );
  const source = model.sources[0]!;
  if (source.kind !== 'campaign') throw new Error('Expected campaign.');
  expect(source.captures['chatgpt/repair/initial/repair']!.patch).toBe('');
  expect(
    source.assessment.platforms[0]!.resolutions.find((entry) => entry.journeyId === 'repair')!
      .status,
  ).toBe('blocked');
  expect(
    model.cells.some((cell) => cell.platform === 'chatgpt' && cell.journeyId === 'claude-only'),
  ).toBe(false);
});
