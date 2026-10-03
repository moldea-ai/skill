// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { ISemanticCase } from '../cases/index.ts';
import { SEMANTIC_COVERAGE_CLAIMS } from '../coverage/index.ts';
import {
  createSemanticCatalogWebsiteModel,
  createSemanticEvidenceBundle,
  parseSemanticWebsiteModel,
  type ISemanticAttemptRecord,
} from './index.ts';

const createCase = (claimId: string): ISemanticCase => ({
  coverageClaimIds: [claimId],
  expected: [{ criterion: 'The expected behavior is present.', label: 'expected-behavior' }],
  forbidden: [{ criterion: 'No result is invented.', label: 'invented-result' }],
  id: `case-${claimId}`,
  input: {
    developerDirection: 'Inspect the current behavior definition.',
    repositoryEvidence: [],
  },
  operation: 'inspect-current-definition',
  resourceBudget: {
    activation: 'direct',
    maximumMoldeaCommands: 1,
    maximumMoldeaOutputBytes: 128,
    minimumMoldeaCommands: 0,
  },
  scenario: `Current scenario for ${claimId}.`,
});

describe('createSemanticCatalogWebsiteModel', () => {
  test('presents current cases without creating recorded evidence', () => {
    const definitions = SEMANTIC_COVERAGE_CLAIMS.map(({ id }) => createCase(id));
    const model = createSemanticCatalogWebsiteModel(definitions);

    expect(parseSemanticWebsiteModel(model)).toStrictEqual(model);
    expect(model).toMatchObject({
      artifactDigest: null,
      attempts: [],
      caseCount: definitions.length,
      cli: null,
      coverageUrl: null,
      currentAssurance: null,
      evaluatedAt: null,
      evaluationModel: null,
      failedCaseCount: 0,
      hasAttempt: false,
      lastPassing: null,
      latest: null,
      latestPointer: null,
      passedCaseCount: 0,
      pendingCaseCount: definitions.length,
      recoveredCaseCount: 0,
      status: 'not-recorded',
    });
    expect(model.groups.flatMap(({ cases }) => cases)).toHaveLength(definitions.length);
    expect(model.groups.find(({ id }) => id === 'pre-adoption-boundary')).toMatchObject({
      title: 'Pre adoption boundary',
      cases: [
        {
          title: 'Case pre adoption boundary',
          presentation: { title: 'Case pre adoption boundary' },
        },
      ],
    });
    expect(
      model.groups
        .flatMap(({ cases }) => cases)
        .every(
          (semanticCase) =>
            semanticCase.status === 'pending' &&
            semanticCase.replay === null &&
            semanticCase.trials.length === 0,
        ),
    ).toBe(true);
  });
});

// partial presentation fixtures intentionally omit execution provenance
describe('selected semantic cases', () => {
  test('displays a passing selection without claiming exact current assurance', () => {
    const definition = createCase(SEMANTIC_COVERAGE_CLAIMS[0].id);
    const recordedAt = '2026-09-29T00:00:00.000Z';
    const result = {
      artifactDigest: 'a'.repeat(64),
      attemptId: 'sem-selected-cases',
      caseSuiteDigest: 'b'.repeat(64),
      cases: [
        { confirmationStatus: 'not-required', id: definition.id, status: 'passed', trials: [] },
      ],
      cli: {
        integrity: 'sha512-test',
        jsonSchemaVersion: 5,
        name: '@moldea.ai/cli',
        packageLockSha256: 'c'.repeat(64),
        version: '9.0.1',
      },
      coverageDigest: 'd'.repeat(64),
      createdAt: recordedAt,
      failedCaseCount: 0,
      hostContract: { actor: { model: 'gpt-6-sol' } },
      passedCaseCount: 1,
      pendingCaseCount: 0,
      recoveredCaseCount: 0,
      status: 'passed',
      totalCaseCount: 1,
      updatedAt: recordedAt,
    } as unknown as ISemanticAttemptRecord;
    const bundle = createSemanticEvidenceBundle({
      classification: 'official',
      definitions: [definition],
      presentationOnly: true,
      result,
      version: 'multiple releases',
    });
    const recordedCase = parseSemanticWebsiteModel(
      (bundle.payload as { websiteModel: unknown }).websiteModel,
    ).latest?.cases[0];
    if (recordedCase === undefined) throw new Error('Expected a recorded case.');
    const selectedBundle = createSemanticEvidenceBundle({
      caseModels: new Map([
        [definition.id, { ...recordedCase, developerDirection: 'The original recorded request.' }],
      ]),
      classification: 'official',
      definitions: [
        {
          ...definition,
          input: { developerDirection: 'A new request.', repositoryEvidence: [] },
        },
      ],
      presentationOnly: true,
      result,
      version: 'multiple releases',
    });
    const model = parseSemanticWebsiteModel(
      (selectedBundle.payload as { websiteModel: unknown }).websiteModel,
    );

    expect(model.status).toBe('passed');
    expect(model.coverageUrl).toBeNull();
    expect(model.currentAssurance).toBeNull();
    expect(model.evidenceMatch).toBeNull();
    expect(model.groups.flatMap(({ cases }) => cases)).toHaveLength(1);
    expect(model.latest?.cases[0]?.developerDirection).toBe('The original recorded request.');

    const trial = {
      actorUsage: null,
      confirmationIndex: null,
      dimensions: {
        commandPolicy: true,
        mountIntegrity: true,
        operational: true,
        repositoryControl: true,
        resource: true,
        semantic: true,
      },
      evaluatedAt: recordedAt,
      forbidden: [],
      judgeUsage: null,
      kind: 'initial',
      observed: [],
      passed: true,
      rationale: 'Maintainer reassessment accepted the initial trial.',
    } as unknown as ISemanticAttemptRecord['cases'][number]['trials'][number];
    const selectedHistory = createSemanticEvidenceBundle({
      classification: 'official',
      definitions: [definition],
      presentationOnly: true,
      result: {
        ...result,
        cases: [
          {
            confirmationStatus: 'not-required',
            id: definition.id,
            status: 'passed',
            trials: [
              trial,
              {
                ...trial,
                confirmationIndex: 1,
                kind: 'confirmation',
                passed: false,
                rationale: 'The recorded confirmation failed.',
              },
            ],
          },
        ],
      },
      version: 'multiple releases',
    });
    const historyModel = parseSemanticWebsiteModel(
      (selectedHistory.payload as { websiteModel: unknown }).websiteModel,
    );
    expect(historyModel.latest?.cases[0]?.rationale).toBe(
      'Maintainer reassessment accepted the initial trial.',
    );
    expect(historyModel.latest?.cases[0]?.trials).toHaveLength(2);
  });
});
