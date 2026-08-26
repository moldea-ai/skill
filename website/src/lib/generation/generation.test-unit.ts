// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';

vi.mock('../qualification/index.ts', () => {
  return {
    assertPublishableQualificationEvidence: vi.fn(),
    loadQualificationWebsiteModel: vi.fn(() => ({
      profiles: [
        {
          adapterId: 'custom',
          attempts: [],
          cases: [],
          currentLastPassing: null,
          currentLatest: null,
          description: 'Exercises universal behavior.',
          implementationId: 'custom',
          latest: {
            adapterId: 'custom',
            implementationId: 'custom',
            lastPassingAttemptId: 'attempt-pass',
            latestAttemptId: 'attempt-pass',
            latestStatus: 'passed',
            protocolVersion: 4,
            updatedAt: '2026-08-22T12:00:00.000Z',
          },
          probes: [],
          probesSourceUrl: 'https://example.com/probes',
          route: '/evidence/qualification/custom/custom/',
          sourceUrl: 'https://example.com/profile',
          title: 'Custom runtime qualification',
        },
      ],
      route: '/evidence/qualification/',
    })),
  };
});

vi.mock('../semantic-evaluation/index.ts', () => {
  return {
    loadSemanticEvaluationWebsiteModel: vi.fn(() => ({
      artifactDigest: 'a'.repeat(64),
      attempts: [],
      caseCount: 49,
      caseSuiteDigest: 'b'.repeat(64),
      cli: {
        integrity: 'sha512-test',
        jsonSchemaVersion: 2,
        name: '@moldea.ai/cli',
        packageLockSha256: 'c'.repeat(64),
        version: '4.0.0',
      },
      coverageDigest: 'd'.repeat(64),
      coverageUrl: 'https://example.com/semantic-coverage.json',
      evaluatedAt: '2026-08-22T12:00:00.000Z',
      evaluationModel: 'gpt-5.6-sol',
      failedCaseCount: 0,
      groups: [
        {
          cases: [],
          description: 'Adoption behavior.',
          id: 'adoption',
          title: 'Adoption and initialization',
        },
      ],
      lastPassing: null,
      hasCurrentAssuranceAttempt: true,
      latest: {
        rawAttemptUrl: 'https://example.com/semantic-attempt.json',
        rawEvidenceUrl: 'https://example.com/semantic-evidence.json',
        result: {
          attemptId: 'semantic-attempt',
          failedCaseCount: 0,
          passedCaseCount: 49,
          pendingCaseCount: 0,
          recoveredCaseCount: 0,
          status: 'passed',
          stopReason: 'complete',
          totalCaseCount: 49,
        },
        route: '/evidence/semantic/attempts/semantic-attempt/',
      },
      latestPointer: {
        lastPassingAttemptId: 'semantic-attempt',
        latestAttemptId: 'semantic-attempt',
        latestStatus: 'passed',
        schemaVersion: 3,
        updatedAt: '2026-08-22T12:00:00.000Z',
      },
      methodologyUrl: '/docs/semantic-evaluation/',
      passedCaseCount: 49,
      pendingCaseCount: 0,
      recoveredCaseCount: 0,
      route: '/evidence/semantic/',
      status: 'passed',
    })),
  };
});

import { createWebsiteModel } from './generation.ts';
import {
  INSTALL_COMMAND,
  REQUIRED_DOCUMENT_ROUTES,
  SKILLS_DIRECTORY_URL,
} from '../model/constants.ts';

describe('createWebsiteModel', () => {
  test('derives one complete public model from canonical sources', () => {
    const model = createWebsiteModel();

    expect(model.skill.name).toBe('moldea');
    expect(model.skill.version).toBe('3.1.0');
    expect(model.skill.description.length).toBeGreaterThan(0);
    expect(new Set(model.routes).size).toBe(model.routes.length);
    expect(model.documents.length).toBeGreaterThanOrEqual(18);
    expect(model.searchRecords.length).toBeGreaterThan(model.documents.length);
    expect(model.navigation.flatMap(({ documents }) => documents)).toStrictEqual(model.documents);
    expect(model.qualification.route).toBe('/evidence/qualification/');
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
  });

  test('keeps distribution and product-name presentation in generated LLM guidance', () => {
    const model = createWebsiteModel();

    expect(model.llmsText).toContain('# `moldea` Agent Skill');
    expect(model.llmsText).toContain('reusable Agent Skills');
    expect(model.llmsText).toContain(SKILLS_DIRECTORY_URL);
    expect(model.llmsText).toContain(INSTALL_COMMAND);
    expect(model.llmsText).toContain('## Evidence');
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
