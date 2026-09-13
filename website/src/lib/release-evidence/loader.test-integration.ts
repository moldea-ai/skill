// @vitest-environment node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256 } from '../../../../tooling/codex-evaluation-host/index.mjs';

import { loadReleaseEvidenceWebsiteState } from './loader.ts';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('loadReleaseEvidenceWebsiteState', () => {
  test('hydrates complete authenticated semantic and qualification models', () => {
    const state = loadReleaseEvidenceWebsiteState(REPOSITORY_ROOT, '5.0.7');

    expect(state.releaseEvidence.mode).toBe('recorded');
    if (state.releaseEvidence.mode !== 'recorded') {
      throw new Error('The committed release fixture must select recorded evidence.');
    }
    expect(state.releaseEvidence.semantic).toMatchObject({
      mode: 'pinned',
      sourceCommit: '926907e26feac6a55929f68ca134aeaf41a6a4b5',
      sourceLabel: '926907e26fea',
    });
    expect(state.releaseEvidence.qualification).toMatchObject({
      mode: 'pinned',
      sourceCommit: 'c3416c52ae69a3f26d2e38c07ba98aa8531e358d',
      sourceLabel: 'v5.0.0',
    });
    if (state.releaseEvidence.qualification.mode !== 'pinned') {
      throw new Error('The committed release fixture must select pinned qualification evidence.');
    }
    expect(state.releaseEvidence.qualification.targets).toHaveLength(14);
    expect(state.releaseEvidence.qualification.targets[0]?.sourceAttemptUrl).toContain(
      '/c3416c52ae69a3f26d2e38c07ba98aa8531e358d/',
    );
    expect(state.pinnedSemantic?.attempts).toHaveLength(1);
    expect(
      state.pinnedSemantic?.currentAssurance?.result.hostContract.actor.developerInstructionsSha256,
    ).not.toBe(CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256);
    expect(state.pinnedSemantic?.currentAssurance?.cases).toHaveLength(74);
    expect(
      state.pinnedSemantic?.groups
        .find(({ id }) => id === 'source-contract')
        ?.cases.map(({ id }) => id),
    ).toStrictEqual([
      'runtime-publication-unavailable',
      'runtime-publication-malformed',
      'installed-adapter-without-published-target',
      'published-supported-target-not-installed',
      'experimental-target-not-production-ready',
    ]);
    expect(state.pinnedSemantic?.currentAssurance?.rawAttemptUrl).toContain(
      '/926907e26feac6a55929f68ca134aeaf41a6a4b5/',
    );

    const profiles = state.pinnedQualification?.profiles ?? [];
    expect(profiles).toHaveLength(14);
    for (const profile of profiles) {
      const assurance = profile.currentAssurance;
      expect(assurance, `${profile.adapterId}/${profile.implementationId}`).not.toBeNull();
      expect(assurance?.directAttempt.evidenceSource.kind).toBe('pinned');
      expect(assurance?.directAttempt.rawAttemptUrl).toContain(
        '/c3416c52ae69a3f26d2e38c07ba98aa8531e358d/',
      );
      expect(profile.pinnedPriorEvidence?.attemptId).toBe(
        assurance?.directAttempt.result.attemptId,
      );

      if (profile.adapterId === 'custom' && profile.implementationId === 'custom') {
        expect(assurance?.baselineAttempt).toBeNull();
        expect(assurance?.directAttempt.cases).toHaveLength(12);
      } else {
        expect(assurance?.baselineAttempt?.cases).toHaveLength(12);
        expect(assurance?.directAttempt.cases).toHaveLength(2);
      }
    }
  });
});
