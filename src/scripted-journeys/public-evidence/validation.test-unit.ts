// @vitest-environment node
import { expect, test } from 'vitest';

import { createSyntheticJourneysBundle } from '../../../website/scripts/evidence-fixture/journeys.ts';

import { parseScriptedJourneysWebsiteModel } from './index.ts';

const fixture = () =>
  parseScriptedJourneysWebsiteModel(
    (createSyntheticJourneysBundle().payload as { websiteModel: unknown }).websiteModel,
  );

test.each([
  'resolution',
  'check',
  'fixture',
  'capture',
  'reference',
  'coverage',
  'status',
  'unsafe-url',
  'duplicate-cell',
])('rejects forged %s instead of presenting false assurance', (mutation) => {
  const model = fixture();
  const source = model.sources[0]!;
  if (source.kind !== 'campaign') throw new Error('Expected campaign.');
  if (mutation === 'resolution')
    source.assessment.platforms[0]!.resolutions[0]!.status = 'confirmed-failure';
  if (mutation === 'check')
    source.assessment.platforms[0]!.trials[0]!.journeys[0]!.steps[0]!.checks[0]!.criterion = 99;
  if (mutation === 'fixture') source.assessment.bundle.journeys[0]!.fixtureSha256 = '0'.repeat(64);
  if (mutation === 'capture') delete source.captures['chatgpt/initialize/initial/initialize'];
  if (mutation === 'reference') model.cells[0]!.sourceId = 'missing';
  if (mutation === 'coverage') model.coverage[0]!.current++;
  if (mutation === 'status') model.status = 'passed';
  if (mutation === 'unsafe-url') source.artifactRoot = '/evidence-assets/journeys/../../';
  if (mutation === 'duplicate-cell') model.cells.push(model.cells[0]!);
  expect(() => parseScriptedJourneysWebsiteModel(model)).toThrow();
});

test('normalizes version 1 presentation without inventing trials, fixture identity or attestations', () => {
  const current = fixture();
  const source = current.sources[0]!;
  if (source.kind !== 'campaign') throw new Error('Expected campaign.');
  const assessment = source.assessment;
  const legacy = {
    route: current.route,
    runId: current.runId,
    evaluatedAt: current.evaluatedAt,
    status: 'failed',
    assessor: assessment.assessor,
    bundleSha256: assessment.bundleSha256,
    skill: assessment.bundle.skill,
    instructions: { ...assessment.bundle.instructions, version: 1 },
    assessmentUrl: '/evidence-assets/journeys/assessment.json',
    definitionsUrl: '/evidence-assets/journeys/definitions.json',
    platforms: assessment.platforms.map((provider) => ({
      platform: provider.platform,
      configuration: provider.trials[0]!.observation!.configuration,
      environment: provider.trials[0]!.environment,
      restartCounts: provider.trials[0]!.restartCounts,
    })),
    journeys: assessment.definitions.map((definition) => ({
      id: definition.id,
      title: definition.title,
      summary: definition.summary,
      route: `/evidence/journeys/${definition.id}/`,
      steps: definition.steps.map((step) => ({
        id: step.id,
        request: step.request,
        results: assessment.platforms.flatMap((provider) => {
          const recorded = provider.trials[0]!.journeys.find(
            (journey) => journey.id === definition.id,
          )?.steps.find((entry) => entry.id === step.id);
          if (!recorded) return [];
          return [
            {
              ...recorded,
              checks: recorded.checks.map(({ criterion: _criterion, ...check }) => check),
              platform: provider.platform,
              ...source.captures[`${provider.platform}/${definition.id}/initial/${step.id}`]!,
              patchUrl: null,
              replyUrl: null,
              activityUrl: null,
            },
          ];
        }),
      })),
    })),
  };
  const model = parseScriptedJourneysWebsiteModel(legacy);
  expect(model.status).toBe('failed');
  expect(model.sources[0]!.kind).toBe('legacy');
  expect(model.sources[0]).not.toHaveProperty('assessment');
  expect(model.coverage.every((entry) => entry.current === 0)).toBe(true);
  expect(parseScriptedJourneysWebsiteModel(model)).toStrictEqual(model);
});
