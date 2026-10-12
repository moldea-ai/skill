// @vitest-environment node
import { expect, test } from 'vitest';

import { createSyntheticJourneysBundle } from '../../../website/scripts/evidence-fixture/journeys.ts';
import type { IJourneyCampaign, IJourneyOutcome, IJourneyTrial } from '../index.ts';

import { assertRetainedTrials, deriveCampaignStatus, resolveJourneyTrials } from './index.ts';

const makeTrials = (outcomes: IJourneyOutcome[]): IJourneyTrial[] => {
  const assessment = (
    createSyntheticJourneysBundle().payload as {
      websiteModel: { sources: { assessment: IJourneyCampaign }[] };
    }
  ).websiteModel.sources[0]!.assessment;
  const original = assessment.platforms[0]!.trials[0]!;
  return outcomes.map((status, index) => ({
    ...structuredClone(original),
    trialId: index.toString(16).padStart(32, '0'),
    archiveSha256: index.toString(16).padStart(64, '0'),
    kind: index === 0 ? 'initial' : 'confirmation',
    selectedJourneys: ['recovered'],
    confirmationIndex: index === 0 ? null : index,
    journeys: [
      {
        ...structuredClone(original.journeys.find((entry) => entry.id === 'recovered')!),
        status,
        steps: original.journeys
          .find((entry) => entry.id === 'recovered')!
          .steps.map((step) => ({
            ...structuredClone(step),
            status,
            checks: step.checks.map((check) => ({ ...structuredClone(check), status })),
          })),
      },
    ],
  }));
};

test.each([
  [['failed'], 'awaiting-confirmation'],
  [['passed'], 'passed-initially'],
  [['blocked'], 'blocked'],
  [['failed', 'passed'], 'awaiting-confirmation'],
  [['failed', 'failed'], 'awaiting-confirmation'],
  [['failed', 'passed', 'passed'], 'recovered'],
  [['failed', 'failed', 'failed'], 'confirmed-failure'],
  [['failed', 'passed', 'failed', 'passed'], 'recovered'],
  [['failed', 'failed', 'passed', 'failed'], 'confirmed-failure'],
  [['failed', 'blocked'], 'blocked'],
] as [IJourneyOutcome[], string][])('resolveJourneyTrials(%o) -> %s', (outcomes, status) => {
  const resolution = resolveJourneyTrials(makeTrials(outcomes))[0]!;
  expect(resolution.status).toBe(status);
  expect(resolution.confirmationTrialIds).toHaveLength(outcomes.length - 1);
  if (outcomes[0] === 'failed')
    expect(resolution.failedChecks[0]).toStrictEqual({
      trialId: '0'.repeat(32),
      stepId: 'read',
      criterion: 0,
    });
  else expect(resolution.failedChecks).toStrictEqual([]);
});

test.each([
  ['passed', 'passed'],
  ['blocked', 'failed'],
  ['failed', 'passed', 'passed', 'failed'],
  ['failed', 'blocked', 'passed'],
] as IJourneyOutcome[][])('rejects ineligible/post-resolution trials %o', (...outcomes) => {
  expect(() => resolveJourneyTrials(makeTrials(outcomes))).toThrow();
});

test('rejects overlapping baselines, gaps and changed experimental settings while retaining check identities', () => {
  const trials = makeTrials(['failed', 'failed']);
  expect(() => resolveJourneyTrials([trials[0]!, trials[0]!])).toThrow('Overlapping');
  trials[1]!.confirmationIndex = 2;
  expect(() => resolveJourneyTrials(trials)).toThrow('noncontiguous');
  trials[1]!.confirmationIndex = 1;
  trials[1]!.observation!.configuration.settings = { mode: 'Different' };
  expect(() => resolveJourneyTrials(trials)).toThrow('model/settings');
  trials[1]!.observation!.configuration.settings = trials[0]!.observation!.configuration.settings;
  trials[1]!.journeys[0]!.steps[0]!.checks[0]!.criterion = 'nonempty-reply';
  expect(resolveJourneyTrials(trials)[0]!.failedChecks.at(-1)!.criterion).toBe('nonempty-reply');
});

test('scope status and immutable retention preserve unresolved evidence and observation metadata', () => {
  const assessment = (
    createSyntheticJourneysBundle().payload as {
      websiteModel: { sources: { assessment: IJourneyCampaign }[] };
    }
  ).websiteModel.sources[0]!.assessment;
  const current = structuredClone(assessment);
  expect(() => assertRetainedTrials(assessment, current)).not.toThrow();
  current.platforms[0]!.trials[0]!.observation!.observedAt = null;
  expect(() => assertRetainedTrials(assessment, current)).toThrow('omitted or changed');
  current.platforms[0]!.trials.shift();
  expect(() => assertRetainedTrials(assessment, current)).toThrow('omitted or changed');
  expect(
    deriveCampaignStatus(resolveJourneyTrials(makeTrials(['failed', 'passed', 'passed']))),
  ).toBe('passed');
  expect(
    deriveCampaignStatus(resolveJourneyTrials(makeTrials(['failed', 'failed', 'failed']))),
  ).toBe('failed');
  expect(deriveCampaignStatus(resolveJourneyTrials(makeTrials(['failed'])))).toBe('incomplete');
});
