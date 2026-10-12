// @vitest-environment node
import { expect, test } from 'vitest';

import { createSyntheticJourneysBundle } from '../../../scripts/evidence-fixture/journeys.ts';
import { parseScriptedJourneysWebsiteModel } from '../../../../src/scripted-journeys/public-evidence/index.ts';

import { getRecordedJourneyPreview, getRecordedJourneyPreviewFiles } from './utilities.ts';

const createModel = () =>
  parseScriptedJourneysWebsiteModel(
    (createSyntheticJourneysBundle().payload as { websiteModel: unknown }).websiteModel,
  );

test('the homepage prefers captured agent creation while the evidence overview retains its first excerpt', () => {
  const model = createModel();
  const preview = getRecordedJourneyPreview(model, true)!;
  expect(preview.step.id).toBe('create');
  expect(preview.step.request).toBe('Create a triage agent.');
  expect(preview.result.platform).toBe('claude');
  expect(preview.result.label).toBe('Initial observation');
  expect(getRecordedJourneyPreview(model)!.step.id).toBe('initialize');
});

test('agent creation remains available when only ChatGPT has a captured result', () => {
  const model = createModel();
  model.cells = model.cells.filter(
    ({ journeyId, platform }) => journeyId !== 'agents' || platform !== 'claude',
  );
  const preview = getRecordedJourneyPreview(model, true)!;
  expect(preview.step.id).toBe('create');
  expect(preview.result.platform).toBe('chatgpt');
});

test('missing creation evidence falls back to the first available captured step', () => {
  const model = createModel();
  model.cells = model.cells.filter(({ journeyId }) => journeyId !== 'agents');
  expect(getRecordedJourneyPreview(model, true)!.step.id).toBe('initialize');
  model.cells = model.cells.filter(({ journeyId }) => journeyId !== 'initialize');
  const preview = getRecordedJourneyPreview(model, true)!;
  expect(preview.step.id).toBe('edit');
  expect(preview.result.platform).toBe('claude');
  expect(preview.result.status).toBe('failed');
});

test('a catalog without captures has no invented preview', () => {
  const model = createModel();
  model.cells = [];
  expect(getRecordedJourneyPreview(model, true)).toBeNull();
  expect(getRecordedJourneyPreview(model)).toBeNull();
  model.journeys = [];
  expect(getRecordedJourneyPreview(model, true)).toBeNull();
});

test('compact creation files preserve their statuses and leave the complete capture unchanged', () => {
  const result = getRecordedJourneyPreview(createModel(), true)!.result;
  const original = structuredClone(result.files);
  expect(getRecordedJourneyPreviewFiles(result, true)).toStrictEqual([
    { path: 'moldea/agents/parcel-triage/description.md', status: 'created' },
    { path: 'moldea/agents/parcel-triage/instruction.md', status: 'created' },
    { path: 'moldea/moldea.yaml', status: 'modified' },
  ]);
  expect(getRecordedJourneyPreviewFiles(result, false)).toStrictEqual(original);
  expect(result.files).toStrictEqual(original);
  result.files = result.files.filter(({ path }) => path !== 'moldea/moldea.yaml');
  expect(getRecordedJourneyPreviewFiles(result, true)).toStrictEqual(original.slice(0, 2));
});

test('ordinary captured files remain visible when no canonical agent files were changed', () => {
  const result = getRecordedJourneyPreview(createModel())!.result;
  expect(getRecordedJourneyPreviewFiles(result, true)).toStrictEqual(result.files);
  result.files = [];
  expect(getRecordedJourneyPreviewFiles(result, true)).toStrictEqual([]);
});
