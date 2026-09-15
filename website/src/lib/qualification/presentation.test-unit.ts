// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { createWebsiteModel } from '../generation/generation.ts';

import {
  createQualificationJourneyCollection,
  resolveQualificationCasePresentation,
} from './presentation.ts';

describe('qualification presentation', () => {
  const anthropicProfile = createWebsiteModel().qualification.profiles.find(
    ({ adapterId }) => adapterId === 'anthropic',
  );
  if (anthropicProfile === undefined) throw new Error('Anthropic profile is required.');
  const repairCase = anthropicProfile.cases.find(
    ({ id }) => id === 'repair-anthropic-tool-registration',
  );
  if (repairCase === undefined) throw new Error('Anthropic repair case is required.');

  test('resolves reviewed copy only for the complete matching identity', () => {
    expect(
      resolveQualificationCasePresentation(
        anthropicProfile.adapterId,
        anthropicProfile.implementationId,
        repairCase,
        null,
      ),
    ).toStrictEqual({
      summary:
        'Checks whether the saved Anthropic tool name is repaired to match the project source.',
      toolNameRepair: {
        correctedName: 'lookup_order',
        declaredName: 'find_order',
        manifestPath: 'moldea/moldea.yaml',
        sourcePath: 'src/tools.ts',
      },
    });
    expect(
      resolveQualificationCasePresentation(
        anthropicProfile.adapterId,
        anthropicProfile.implementationId,
        { ...repairCase, sourceProfileDigest: '0'.repeat(64) },
        repairCase.sourceProfileDigest,
      ),
    ).toBeNull();
    expect(
      resolveQualificationCasePresentation(
        anthropicProfile.adapterId,
        anthropicProfile.implementationId,
        repairCase,
        anthropicProfile.currentAssurance?.directAttempt.result.provenance.profileDigest ?? null,
      ),
    ).toBeNull();
  });

  test('orders adapter journeys before the shared foundation', () => {
    const assurance = anthropicProfile.currentAssurance;
    if (assurance === null || assurance.baselineAttempt === null) {
      throw new Error('Anthropic qualification assurance must include its shared foundation.');
    }
    const collection = createQualificationJourneyCollection(anthropicProfile);
    expect(collection.attempts.map(({ result }) => result.attemptId)).toStrictEqual([
      assurance.baselineAttempt.result.attemptId,
      assurance.directAttempt.result.attemptId,
    ]);
    expect(collection.chapters.map(({ id }) => id)).toStrictEqual([
      'adapter-journeys',
      'foundation-journeys',
    ]);
    expect(collection.chapters[0]?.journeys[0]?.origin).toBe('Adapter-specific');
    expect(collection.chapters[1]?.journeys[0]?.origin).toBe('Shared foundation');
  });
});
