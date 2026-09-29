// @vitest-environment node
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import type { IEvidenceBundle } from '../../../src/evidence/index.ts';
import { prepareSyntheticWebsiteEvidence } from '../../../website/scripts/evidence-fixture/index.ts';
import { createQualificationJourneyCollection as createWebsiteJourneyCollection } from '../../../website/src/lib/qualification/presentation.ts';
import {
  composeQualificationEvidenceBundle,
  QualificationCompositionReviewSchema,
} from './composition.ts';
import { createQualificationJourneyCollection } from './presentation.ts';
import { parseQualificationWebsiteModel } from './validation.ts';

describe('qualification evidence composition', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) await rm(temporaryRoot, { force: true, recursive: true });
  });

  test('selects recorded cases across skill versions and keeps their asset links valid', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-selection-'));
    const { preparedDirectory } = await prepareSyntheticWebsiteEvidence(temporaryRoot);
    const source = JSON.parse(
      await readFile(
        path.join(preparedDirectory, 'snapshots', 'synthetic', 'qualification.json'),
        'utf8',
      ),
    ) as IEvidenceBundle;
    const first = { ...source, classification: 'official' as const };
    const second = structuredClone(first);
    second.run.attemptId = 'second-recorded-run';
    second.run.version = '7.0.0';
    const customProfile = (
      first.payload as {
        websiteModel: {
          profiles: Array<{
            adapterId: string;
            implementationId: string;
            cases: Array<{ id: string }>;
          }>;
        };
      }
    ).websiteModel.profiles.find(({ adapterId }) => adapterId === 'custom');
    const customCaseId = customProfile?.cases[0]?.id;
    if (customCaseId === undefined) throw new Error('Fixture has no Custom case.');
    const review = QualificationCompositionReviewSchema.parse({
      formatVersion: 1,
      caseSources: [
        {
          adapterId: 'custom',
          implementationId: 'custom',
          caseId: customCaseId,
          runId: second.run.attemptId,
        },
      ],
    });
    const composed = composeQualificationEvidenceBundle({
      attemptId: 'selected-recorded-cases',
      review,
      sources: [first, second],
    });
    const model = (
      composed.payload as {
        websiteModel: {
          profiles: Array<{
            adapterId: string;
            selectedAttempts?: Array<{ rawAttemptUrl: string }>;
            selectedJourneys?: Array<{ evidence: { result: { caseId: string } } }>;
          }>;
        };
      }
    ).websiteModel;
    const selectedCustom = model.profiles.find(({ adapterId }) => adapterId === 'custom');
    const parsedCustom = parseQualificationWebsiteModel(model).profiles.find(
      ({ adapterId }) => adapterId === 'custom',
    );
    if (parsedCustom === undefined) throw new Error('Selected Custom profile is missing.');

    expect(composed.run.version).toBe('multiple releases');
    expect(composed.run.status).toBe('passed');
    expect(selectedCustom?.selectedJourneys).toHaveLength(1);
    expect(createQualificationJourneyCollection(parsedCustom).journeys).toHaveLength(1);
    expect(createWebsiteJourneyCollection(parsedCustom).journeys).toHaveLength(1);
    expect(selectedCustom?.selectedAttempts?.[0]?.rawAttemptUrl).toContain('/s/1/');
    expect(
      composed.artifacts.files.some(({ path: artifactPath }) => artifactPath.startsWith('s/1/')),
    ).toBe(true);
    const artifactPaths = new Set(
      composed.artifacts.files.map(({ path: artifactPath }) => artifactPath),
    );
    const referencedPaths = [
      ...JSON.stringify(model).matchAll(/\/evidence-assets\/qualification\/([^"\\]+)/gu),
    ].map((match) => match[1]);
    expect(referencedPaths.length).toBeGreaterThan(0);
    expect(referencedPaths.every((artifactPath) => artifactPaths.has(artifactPath ?? ''))).toBe(
      true,
    );

    const extended = composeQualificationEvidenceBundle({
      attemptId: 'extended-recorded-cases',
      review: QualificationCompositionReviewSchema.parse({
        formatVersion: 1,
        includeCases: [{ adapterId: 'custom', implementationId: 'custom', caseId: customCaseId }],
      }),
      sources: [composed],
    });
    const extendedProfiles = (
      extended.payload as {
        websiteModel: {
          profiles: Array<{
            adapterId: string;
            selectedAttempts?: Array<{ rawAttemptUrl: string }>;
          }>;
        };
      }
    ).websiteModel.profiles;
    expect(
      extendedProfiles.find(({ adapterId }) => adapterId === 'custom')?.selectedAttempts,
    ).toHaveLength(1);
    expect(
      extendedProfiles.find(({ adapterId }) => adapterId === 'custom')?.selectedAttempts?.[0]
        ?.rawAttemptUrl,
    ).toContain('/s/0/');

    const narrowed = composeQualificationEvidenceBundle({
      attemptId: 'selected-custom-case',
      review: QualificationCompositionReviewSchema.parse({
        formatVersion: 1,
        includeCases: [{ adapterId: 'custom', implementationId: 'custom', caseId: customCaseId }],
      }),
      sources: [first],
    });
    expect(
      (narrowed.payload as { websiteModel: { uniqueJourneyCount: number } }).websiteModel
        .uniqueJourneyCount,
    ).toBe(1);
  });
});
