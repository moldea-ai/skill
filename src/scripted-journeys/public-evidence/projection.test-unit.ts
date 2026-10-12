// @vitest-environment node
import { expect, test } from 'vitest';

import { createSyntheticJourneysBundle } from '../../../website/scripts/evidence-fixture/journeys.ts';
import type { IJourneyAssessment, IJourneyDefinition, IJourneysBundle } from '../index.ts';

import { createJourneysEvidenceBundle, parseScriptedJourneysWebsiteModel } from './index.ts';

test('projects exact requests, platform outcomes, provenance and recorded artifact sources', () => {
  const bundle = createSyntheticJourneysBundle();
  const payload = bundle.payload as { websiteModel: unknown };
  const model = parseScriptedJourneysWebsiteModel(payload.websiteModel);
  expect(model.platforms.map(({ platform }) => platform)).toStrictEqual(['chatgpt', 'claude']);
  expect(model.journeys[0]?.steps[0]?.request).toBe('Initialize moldea.');
  const result = model.journeys[0]!.steps[0]!.results[0]!;
  expect(result.files).toStrictEqual([{ path: 'moldea/project.md', status: 'created' }]);
  expect(result.patch).toContain('+# Project');
  expect(result.patchUrl).toBe(
    '/evidence-assets/journeys/chatgpt/initialize/initialize/changes.patch',
  );
  expect(result.unverified).toStrictEqual(['Validation ran after the final write.']);
  expect(bundle.artifacts.files.map(({ path }) => path)).toContain('assessment.json');
  expect(bundle.artifacts.files.map(({ path }) => path)).toContain('definitions.json');
});

test('refuses to invent missing assessed steps or captured file artifacts', () => {
  const bundle = createSyntheticJourneysBundle();
  const payload = bundle.payload as {
    assessment: IJourneyAssessment;
    definitions: IJourneyDefinition[];
    skill: IJourneysBundle['skill'];
    instructions: IJourneysBundle['instructions'];
  };
  expect(() => createJourneysEvidenceBundle({ ...payload, artifacts: [] })).toThrow(
    'Missing journey presentation artifact',
  );
  payload.assessment.platforms[0]!.journeys[0]!.steps = [];
  expect(() => createJourneysEvidenceBundle({ ...payload, artifacts: [] })).toThrow(
    'Missing assessed journey step',
  );
});

test('keeps an unrecorded blocked step distinct from an empty captured patch', () => {
  const payload = createSyntheticJourneysBundle().payload as {
    assessment: IJourneyAssessment;
    definitions: IJourneyDefinition[];
    skill: IJourneysBundle['skill'];
    instructions: IJourneysBundle['instructions'];
  };
  payload.definitions = [payload.definitions[0]!];
  payload.definitions[0]!.steps = [payload.definitions[0]!.steps[0]!];
  payload.assessment.platforms = [payload.assessment.platforms[0]!];
  const step = payload.assessment.platforms[0]!.journeys[0]!.steps[0]!;
  step.facts = null;
  step.status = 'blocked';
  const model = parseScriptedJourneysWebsiteModel(
    (
      createJourneysEvidenceBundle({ ...payload, artifacts: [] }).payload as {
        websiteModel: unknown;
      }
    ).websiteModel,
  );
  expect(model.journeys[0]!.steps[0]!.results[0]!.patchUrl).toBeNull();
  expect(model.journeys[0]!.steps[0]!.results[0]!.files).toStrictEqual([]);
});
