// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { IQualificationProfileModel } from '../qualification/index.ts';
import type { ISemanticAttemptModel } from '../semantic-evaluation/index.ts';

import type { IReleaseEvidenceModel } from './types.ts';
import {
  getQualificationReleaseEvidenceSummary,
  getSemanticReleaseEvidenceSummary,
} from './utilities.ts';

const pinnedSemanticAttempt = {
  artifactDigest: 'a'.repeat(64),
  attemptId: 'semantic-source',
  createdAt: '2026-09-11T01:00:00.000Z',
  failedCaseCount: 0,
  passedCaseCount: 70,
  pendingCaseCount: 0,
  recoveredCaseCount: 4,
  status: 'passed' as const,
  totalCaseCount: 74,
  updatedAt: '2026-09-11T02:00:00.000Z',
};
const pinnedSemanticSourceAttemptUrl = 'https://example.com/source-attempt';

const pinnedSemanticEvidence: IReleaseEvidenceModel = {
  mode: 'recorded',
  qualification: {
    mode: 'fresh',
    sourceUrl: 'https://example.com/current',
  },
  semantic: {
    attempt: pinnedSemanticAttempt,
    mode: 'pinned',
    reason: 'Presentation-only release correction.',
    sourceAttemptUrl: pinnedSemanticSourceAttemptUrl,
    sourceCommit: 'a'.repeat(40),
    sourceLabel: 'aaaaaaaaaaaa',
    sourceUrl: 'https://example.com/source',
  },
  targetVersion: '5.0.2',
};

const createQualificationProfile = (
  overrides: Partial<IQualificationProfileModel> = {},
): IQualificationProfileModel => ({
  adapterId: 'adapter',
  attempts: [],
  boundBaseline: null,
  cases: [],
  currentAssurance: null,
  currentLastPassing: null,
  currentLatest: null,
  currentStatus: 'not-recorded',
  description: 'Fixture profile.',
  implementationId: 'implementation',
  latest: null,
  pinnedPriorEvidence: null,
  probes: [],
  probesSourceUrl: 'https://example.com/probes',
  route: '/evidence/qualification/adapter/implementation/',
  runtimePackages: [],
  sharedCases: [],
  sourceUrl: 'https://example.com/profile',
  title: 'Fixture profile',
  ...overrides,
});

describe('release evidence summaries', () => {
  test('uses authenticated pinned semantic evidence when no current attempt exists', () => {
    expect(getSemanticReleaseEvidenceSummary(pinnedSemanticEvidence, null)).toStrictEqual({
      kind: 'pinned',
      result: pinnedSemanticAttempt,
      sourceUrl: pinnedSemanticSourceAttemptUrl,
    });
  });

  test('keeps the semantic empty state when neither evidence source exists', () => {
    expect(
      getSemanticReleaseEvidenceSummary({ mode: 'not-recorded', targetVersion: '5.0.2' }, null),
    ).toStrictEqual({ kind: 'not-recorded', result: null, sourceUrl: null });
  });

  test('prefers a fresh current semantic attempt over pinned evidence', () => {
    const currentAttempt = {
      rawEvidenceUrl: 'https://example.com/current-attempt',
      result: { attemptId: 'current-attempt' },
    } as ISemanticAttemptModel;

    expect(getSemanticReleaseEvidenceSummary(pinnedSemanticEvidence, currentAttempt)).toStrictEqual(
      {
        kind: 'current',
        result: currentAttempt.result,
        sourceUrl: currentAttempt.rawEvidenceUrl,
      },
    );
  });

  test('selects current, pinned, and empty qualification states without merging histories', () => {
    const currentLatest = {} as NonNullable<IQualificationProfileModel['currentLatest']>;
    expect(
      getQualificationReleaseEvidenceSummary(
        createQualificationProfile({
          attempts: [currentLatest, currentLatest],
          currentLatest,
          currentStatus: 'passed',
          pinnedPriorEvidence: {
            adapterId: 'adapter',
            attemptId: 'source-attempt',
            completedAt: '2026-09-11T02:00:00.000Z',
            createdAt: '2026-09-11T01:00:00.000Z',
            implementationId: 'implementation',
            packages: [],
            sourceAttemptUrl: 'https://example.com/attempt',
          },
        }),
      ),
    ).toStrictEqual({ attemptCount: 2, kind: 'current', status: 'passed' });
    expect(
      getQualificationReleaseEvidenceSummary(
        createQualificationProfile({
          pinnedPriorEvidence: {
            adapterId: 'adapter',
            attemptId: 'source-attempt',
            completedAt: '2026-09-11T02:00:00.000Z',
            createdAt: '2026-09-11T01:00:00.000Z',
            implementationId: 'implementation',
            packages: [],
            sourceAttemptUrl: 'https://example.com/attempt',
          },
        }),
      ),
    ).toStrictEqual({ attemptCount: 1, kind: 'pinned', status: 'passed' });
    expect(getQualificationReleaseEvidenceSummary(createQualificationProfile())).toStrictEqual({
      attemptCount: 0,
      kind: 'not-recorded',
      status: 'not-recorded',
    });
  });
});
