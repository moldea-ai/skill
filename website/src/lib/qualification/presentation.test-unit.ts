// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { loadWebsiteModel } from '../generation/generation.ts';

import {
  createQualificationJourneyCollection,
  resolveQualificationCasePresentation,
} from './presentation.ts';

describe('qualification presentation', () => {
  const customProfile = loadWebsiteModel().qualification.profiles.find(
    ({ adapterId, implementationId }) => adapterId === 'custom' && implementationId === 'custom',
  );
  if (customProfile === undefined) throw new Error('Custom fixture profile is required.');
  const releaseCase = customProfile.cases.find(({ id }) => id === 'release-case');
  if (releaseCase === undefined) throw new Error('Release fixture case is required.');

  test('uses the presentation recorded with each discovered case', () => {
    expect(
      resolveQualificationCasePresentation('custom', 'custom', releaseCase, '0'.repeat(64)),
    ).toStrictEqual({ summary: releaseCase.purpose });
  });

  test('creates the Custom foundation journey from the selected attempt', () => {
    const collection = createQualificationJourneyCollection(customProfile);
    expect(collection.attempts.map(({ result }) => result.attemptId)).toStrictEqual([
      'fixture-qualification-run',
    ]);
    expect(collection.chapters.map(({ id }) => id)).toStrictEqual(['foundation-journeys']);
    expect(collection.chapters[0]?.journeys[0]?.origin).toBe('Core behavior');
  });
});
