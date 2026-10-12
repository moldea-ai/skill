// @vitest-environment node
import { expect, test } from 'vitest';

import { defineScriptedJourney } from './define.ts';
import { createJourneyDefinitionDigest } from './evidence.ts';

const definition = {
  id: 'sample',
  title: 'Sample',
  summary: 'Sample definition',
  order: 0,
  fixture: { adopted: false, installCli: false },
  steps: [
    {
      id: 'read',
      request: 'Read the policy.',
      dependsOn: [],
      checks: [{ kind: 'reply-matches', pattern: '30' }],
      unverified: ['Read the policy.'],
    },
  ],
};

test('definition digest is stable and includes private criteria and procedure claims', () => {
  const journey = defineScriptedJourney(definition);
  expect(createJourneyDefinitionDigest(journey)).toBe(
    createJourneyDefinitionDigest(defineScriptedJourney(structuredClone(definition))),
  );
  expect(
    createJourneyDefinitionDigest(
      defineScriptedJourney({
        ...definition,
        steps: [{ ...definition.steps[0], checks: [{ kind: 'reply-matches', pattern: '60' }] }],
      }),
    ),
  ).not.toBe(createJourneyDefinitionDigest(journey));
  expect(
    createJourneyDefinitionDigest(defineScriptedJourney({ ...definition, summary: 'Revised' })),
  ).not.toBe(createJourneyDefinitionDigest(journey));
});

test('definitions reject unsupported ordering, patterns, fixture drift, and uncited skill behavior', () => {
  expect(() =>
    defineScriptedJourney({
      ...definition,
      fixture: { ...definition.fixture, integrationDrift: true },
    }),
  ).toThrow(/Integration drift requires an adopted fixture/u);
  expect(() =>
    defineScriptedJourney({
      ...definition,
      steps: [{ ...definition.steps[0], dependsOn: ['later'] }],
    }),
  ).toThrow(/dependency/u);
  expect(() =>
    defineScriptedJourney({
      ...definition,
      steps: [
        {
          ...definition.steps[0],
          checks: [{ kind: 'reply-matches', pattern: 'valid', skillBehavior: true }],
        },
      ],
    }),
  ).toThrow(/reference/u);
  expect(() =>
    defineScriptedJourney({
      ...definition,
      steps: [{ ...definition.steps[0], checks: [{ kind: 'reply-matches', pattern: '[' }] }],
    }),
  ).toThrow(/pattern/u);
});
