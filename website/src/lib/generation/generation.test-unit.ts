// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

import type {
  IQualificationPriorEvidenceModel,
  IQualificationWebsiteModel,
} from '../qualification/index.ts';

vi.mock('../qualification/index.ts', () => {
  return {
    assertPublishableQualificationEvidence: vi.fn(),
    attachPinnedQualificationEvidence: vi.fn(
      (qualification: IQualificationWebsiteModel, targets: IQualificationPriorEvidenceModel[]) => ({
        ...qualification,
        profiles: qualification.profiles.map((profile) => ({
          ...profile,
          pinnedPriorEvidence: targets.find(
            (target) =>
              target.adapterId === profile.adapterId &&
              target.implementationId === profile.implementationId,
          ),
        })),
      }),
    ),
    loadQualificationWebsiteModel: vi.fn(() => ({
      profiles: [
        {
          adapterId: 'custom',
          attempts: [],
          boundBaseline: null,
          cases: [],
          currentAssurance: null,
          currentLastPassing: null,
          currentLatest: null,
          currentStatus: 'not-recorded',
          description: 'Exercises universal behavior.',
          implementationId: 'custom',
          sharedCases: [],
          latest: {
            adapterId: 'custom',
            implementationId: 'custom',
            lastPassingAttemptId: 'attempt-pass',
            latestAttemptId: 'attempt-pass',
            latestStatus: 'passed',
            protocolVersion: 10,
            updatedAt: '2026-08-22T12:00:00.000Z',
          },
          probes: [],
          probesSourceUrl: 'https://example.com/probes',
          pinnedPriorEvidence: null,
          route: '/evidence/qualification/custom/custom/',
          runtimePackages: [],
          sourceUrl: 'https://example.com/profile',
          title: 'Custom runtime qualification',
        },
      ],
      route: '/evidence/qualification/',
      uniqueJourneyCount: 0,
    })),
  };
});

vi.mock('../semantic-evaluation/index.ts', () => {
  return {
    loadSemanticEvaluationWebsiteModel: vi.fn(() => ({
      artifactDigest: 'a'.repeat(64),
      attempts: [],
      caseCount: 14,
      caseSuiteDigest: 'b'.repeat(64),
      cli: {
        integrity: 'sha512-test',
        jsonSchemaVersion: 3,
        name: '@moldea.ai/cli',
        packageLockSha256: 'c'.repeat(64),
        version: '6.0.0',
      },
      coverageDigest: 'd'.repeat(64),
      coverageUrl: 'https://example.com/semantic-coverage.json',
      currentAssurance: {
        cases: [],
        rawAttemptUrl: 'https://example.com/semantic-attempt.json',
        rawEvidenceUrl: 'https://example.com/semantic-evidence.json',
        result: {
          artifactDigest: 'a'.repeat(64),
          attemptId: 'semantic-attempt',
          failedCaseCount: 0,
          cases: [],
          passedCaseCount: 14,
          pendingCaseCount: 0,
          recoveredCaseCount: 0,
          status: 'passed',
          stopReason: 'complete',
          totalCaseCount: 14,
        },
        route: '/evidence/semantic/attempts/semantic-attempt/',
      },
      evidenceMatch: 'exact',
      evaluatedAt: '2026-08-22T12:00:00.000Z',
      evaluationModel: 'gpt-5.6-sol',
      failedCaseCount: 0,
      groups: [
        {
          cases: [
            {
              expectedCriteria: [{ criterion: 'Expected criterion.', label: 'expected' }],
              forbiddenCriteria: [],
              hasCurrentCaseDefinition: true,
              id: 'semantic-case',
              replay: {
                trials: [
                  {
                    steps: [
                      {
                        content: 'REPLAY_TRANSCRIPT_SENTINEL',
                        kind: 'message',
                        role: 'coding-agent',
                        source: 'recorded',
                      },
                    ],
                  },
                ],
              },
              scenario: 'A bounded scenario.',
              title: 'Semantic case',
            },
          ],
          description: 'Abstention behavior.',
          id: 'abstention',
          title: 'Unrelated work and host precedence',
        },
      ],
      lastPassing: null,
      hasAttempt: true,
      latest: {
        rawAttemptUrl: 'https://example.com/semantic-attempt.json',
        rawEvidenceUrl: 'https://example.com/semantic-evidence.json',
        result: {
          attemptId: 'semantic-attempt',
          failedCaseCount: 0,
          passedCaseCount: 14,
          pendingCaseCount: 0,
          recoveredCaseCount: 0,
          status: 'passed',
          stopReason: 'complete',
          totalCaseCount: 14,
        },
        route: '/evidence/semantic/attempts/semantic-attempt/',
      },
      latestPointer: {
        lastPassingAttemptId: 'semantic-attempt',
        latestAttemptId: 'semantic-attempt',
        latestStatus: 'passed',
        schemaVersion: 1,
        updatedAt: '2026-08-22T12:00:00.000Z',
      },
      methodologyUrl: '/docs/semantic-evaluation/',
      passedCaseCount: 14,
      pendingCaseCount: 0,
      recoveredCaseCount: 0,
      route: '/evidence/semantic/',
      status: 'passed',
    })),
  };
});

vi.mock('../release-evidence/index.ts', () => ({
  loadReleaseEvidenceModel: vi.fn(() => ({
    mode: 'not-recorded',
    targetVersion: '5.0.1',
  })),
}));

import { createWebsiteModel } from './generation.ts';
import {
  assertPublishableQualificationEvidence,
  attachPinnedQualificationEvidence,
} from '../qualification/index.ts';
import { loadReleaseEvidenceModel } from '../release-evidence/index.ts';
import { loadSemanticEvaluationWebsiteModel } from '../semantic-evaluation/index.ts';
import {
  INSTALL_COMMAND,
  REQUIRED_DOCUMENT_ROUTES,
  SKILLS_DIRECTORY_URL,
} from '../model/constants.ts';

describe('createWebsiteModel', () => {
  test('derives one complete public model from canonical sources', () => {
    const model = createWebsiteModel();

    expect(model.skill.name).toBe('moldea');
    expect(model.skill.version).toBe('5.0.1');
    expect(model.skill.description.length).toBeGreaterThan(0);
    expect(new Set(model.routes).size).toBe(model.routes.length);
    expect(model.documents.length).toBeGreaterThanOrEqual(18);
    expect(model.searchRecords.length).toBeGreaterThan(model.documents.length);
    expect(model.navigation.flatMap(({ documents }) => documents)).toStrictEqual(model.documents);
    expect(model.qualification.route).toBe('/evidence/qualification/');
    expect(model.releaseEvidence).toStrictEqual({ mode: 'not-recorded', targetVersion: '5.0.1' });
    expect(model.currentSemanticAssurance).toBe(model.semanticEvaluation.currentAssurance);
    expect(model.semanticEvaluation.route).toBe('/evidence/semantic/');
    expect(model.qualification.profiles).toHaveLength(1);
    const qualificationProfile = model.qualification.profiles[0];
    expect(qualificationProfile).toMatchObject({
      adapterId: 'custom',
      implementationId: 'custom',
    });
    expect(qualificationProfile?.attempts).toHaveLength(0);
    expect(qualificationProfile?.latest?.latestStatus).toBe('passed');

    for (const route of REQUIRED_DOCUMENT_ROUTES) expect(model.routes).toContain(route);
    for (const document of model.documents) {
      expect(model.routes).toContain(document.route);
      expect(model.searchRecords.some(({ route }) => route === document.route)).toBe(true);
      expect(model.llmsText).toContain(`- [${document.title}](${document.route})`);
    }
    for (const profile of model.qualification.profiles) {
      expect(model.routes).toContain(profile.route);
      expect(model.searchRecords.some(({ route }) => route === profile.route)).toBe(true);
      expect(model.llmsText).toContain(`- [${profile.title}](${profile.route})`);
    }
    expect(model.routes).toContain('/evidence/');
    expect(model.routes).toContain('/evidence/semantic/');
    expect(model.routes).toContain('/evidence/qualification/');
    expect(model.searchRecords.some(({ route }) => route === '/evidence/')).toBe(true);
    expect(JSON.stringify(model.semanticEvaluation)).toContain('REPLAY_TRANSCRIPT_SENTINEL');
    expect(JSON.stringify(model.searchRecords)).not.toContain('REPLAY_TRANSCRIPT_SENTINEL');
    expect(model.llmsText).not.toContain('REPLAY_TRANSCRIPT_SENTINEL');
  });

  test('keeps distribution and product-name presentation in generated LLM guidance', () => {
    const model = createWebsiteModel();

    expect(model.llmsText).toContain('# `moldea` Agent Skill');
    expect(model.llmsText).toContain('reusable Agent Skills');
    expect(model.llmsText).toContain(SKILLS_DIRECTORY_URL);
    expect(model.llmsText).toContain(INSTALL_COMMAND);
    expect(model.llmsText).toContain('## Evidence');
  });

  test('bypasses current qualification checks only when qualification evidence is pinned', () => {
    const publicationCheck = vi.mocked(assertPublishableQualificationEvidence);
    publicationCheck.mockClear();
    vi.mocked(loadReleaseEvidenceModel).mockReturnValueOnce({
      mode: 'recorded',
      qualification: {
        mode: 'pinned',
        reason: 'Release tooling only.',
        sourceCommit: 'a'.repeat(40),
        sourceLabel: 'v5.0.0',
        sourceUrl: 'https://github.com/moldea-ai/skill/tree/v5.0.0',
        targets: [
          {
            adapterId: 'custom',
            attemptId: 'qualification-attempt',
            completedAt: '2026-08-20T10:01:00.000Z',
            createdAt: '2026-08-20T10:00:00.000Z',
            implementationId: 'custom',
            packages: [{ name: '@moldea.ai/cli', version: '8.0.0' }],
          },
        ],
      },
      semantic: {
        mode: 'fresh',
        sourceUrl: 'https://github.com/moldea-ai/skill/tree/v6.0.0',
      },
      targetVersion: '6.0.0',
    });

    const model = createWebsiteModel();

    expect(model.releaseEvidence.mode).toBe('recorded');
    expect(publicationCheck).not.toHaveBeenCalled();
    expect(model.qualification.profiles[0]).toMatchObject({
      attempts: [],
      currentAssurance: null,
      currentLatest: null,
      currentStatus: 'not-recorded',
      pinnedPriorEvidence: {
        attemptId: 'qualification-attempt',
        packages: [{ name: '@moldea.ai/cli', version: '8.0.0' }],
      },
    });
    expect(model.llmsText).toContain(
      'Qualification release provenance uses verified prior evidence from',
    );
    expect(model.llmsText).toContain(
      'Current qualification contracts: 0/1 profiles have exact current assurance.',
    );
  });

  test('does not attach release provenance to an alternate qualification evidence root', () => {
    const attachment = vi.mocked(attachPinnedQualificationEvidence);
    attachment.mockClear();
    vi.mocked(loadReleaseEvidenceModel).mockReturnValueOnce({
      mode: 'recorded',
      qualification: {
        mode: 'pinned',
        reason: 'Release tooling only.',
        sourceCommit: 'a'.repeat(40),
        sourceLabel: 'v5.0.0',
        sourceUrl: 'https://github.com/moldea-ai/skill/tree/v5.0.0',
        targets: [
          {
            adapterId: 'custom',
            attemptId: 'qualification-attempt',
            completedAt: '2026-08-20T10:01:00.000Z',
            createdAt: '2026-08-20T10:00:00.000Z',
            implementationId: 'custom',
            packages: [{ name: '@moldea.ai/cli', version: '8.0.0' }],
          },
        ],
      },
      semantic: {
        mode: 'fresh',
        sourceUrl: 'https://github.com/moldea-ai/skill/tree/v6.0.0',
      },
      targetVersion: '6.0.0',
    });

    const model = createWebsiteModel('alternate-qualification-root');

    expect(attachment).not.toHaveBeenCalled();
    expect(model.qualification.profiles[0]?.pinnedPriorEvidence).toBeNull();
  });

  test('keeps pinned semantic provenance separate from unmatched current assurance', () => {
    const semanticEvaluation = loadSemanticEvaluationWebsiteModel('unused');
    const pinnedAttempt = semanticEvaluation.currentAssurance;
    if (pinnedAttempt === null) throw new Error('Expected a semantic test attempt.');
    vi.mocked(loadSemanticEvaluationWebsiteModel).mockReturnValueOnce({
      ...semanticEvaluation,
      attempts: [],
      currentAssurance: null,
      evidenceMatch: null,
      failedCaseCount: 0,
      passedCaseCount: 0,
      pendingCaseCount: semanticEvaluation.caseCount,
      recoveredCaseCount: 0,
      status: 'not-recorded',
    });
    vi.mocked(loadReleaseEvidenceModel).mockReturnValueOnce({
      mode: 'recorded',
      qualification: {
        mode: 'fresh',
        sourceUrl: 'https://github.com/moldea-ai/skill/tree/v5.0.0',
      },
      semantic: {
        mode: 'pinned',
        reason: 'The release changes only deterministic tooling.',
        sourceAttemptId: pinnedAttempt.result.attemptId,
        sourceCommit: 'a'.repeat(40),
        sourceLabel: 'aaaaaaaaaaaa',
        sourceUrl: `https://github.com/moldea-ai/skill/tree/${'a'.repeat(40)}`,
      },
      targetVersion: '5.0.1',
    });

    const model = createWebsiteModel();

    expect(model.currentSemanticAssurance).toBeNull();
    expect(model.semanticEvaluation.attempts).toStrictEqual([]);
    expect(model.llmsText).toContain(
      'Semantic release provenance uses verified prior evidence from',
    );
    expect(model.llmsText).toContain(
      `Current semantic contract: 0/${semanticEvaluation.caseCount} scenarios have exact current assurance.`,
    );
    expect(model.llmsText).not.toContain(pinnedAttempt.result.attemptId);
  });

  test('requires reader-facing product mentions in Markdown to use inline code', () => {
    const model = createWebsiteModel();

    for (const document of model.documents) {
      const readerFacingText = document.markdown
        .replaceAll(/```[\s\S]*?```/g, '')
        .replaceAll(/\]\([^)]+\)/g, ']()')
        .replaceAll(/`[^`]+`/g, '');

      expect(readerFacingText, document.sourcePath).not.toMatch(/\bmoldea\b/iu);
      expect(document.title).not.toMatch(/\bmoldea\b/iu);
      expect(document.description).not.toMatch(/\bmoldea\b/iu);
      expect(document.navigationTitle).not.toMatch(/\bmoldea\b/iu);
    }
  });
});
