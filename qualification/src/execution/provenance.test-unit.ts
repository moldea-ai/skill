// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { IQualificationExecutionEnvironment } from '../contracts/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import {
  createQualificationExecutionProvenance,
  inspectQualificationExecutionEnvironment,
} from './provenance.ts';

const executionEnvironment: IQualificationExecutionEnvironment = {
  model: 'gpt-5.6-terra',
  reasoningEffort: 'medium',
  codexVersion: 'codex-cli test',
  nodeVersion: 'v24.15.0',
  pnpmVersion: '11.9.0',
  gitVersion: 'git version test',
  allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
  hostTimeoutMs: 120_000,
  modelEndpoint: null,
  sslCertificateFileSha256: null,
};

const createRepositoryState = (commit: string, fingerprint: string): IGitRepositoryState => ({
  commit,
  fingerprint,
  isDirty: false,
  entries: [],
});

describe('qualification execution provenance', () => {
  test('preserves the checkpointed host identity and exact source fingerprints', () => {
    expect(
      createQualificationExecutionProvenance({
        executionEnvironment,
        packagesState: createRepositoryState('packages-commit', 'a'.repeat(64)),
        profileDigest: 'b'.repeat(64),
        qualificationDigest: 'c'.repeat(64),
        qualificationState: createRepositoryState('qualification-commit', 'd'.repeat(64)),
        skillState: createRepositoryState('skill-commit', 'e'.repeat(64)),
        targetSupportLevel: 'experimental',
      }),
    ).toStrictEqual({
      ...executionEnvironment,
      packagesRepositoryCommit: 'packages-commit',
      packagesRepositoryFingerprint: 'a'.repeat(64),
      packagesRepositoryDirty: false,
      targetSupportLevel: 'experimental',
      qualificationRepositoryCommit: 'qualification-commit',
      qualificationRepositoryDirty: false,
      skillRepositoryCommit: 'skill-commit',
      skillRepositoryFingerprint: 'e'.repeat(64),
      skillRepositoryDirty: false,
      profileDigest: 'b'.repeat(64),
      qualificationDigest: 'c'.repeat(64),
    });
  });

  test('rejects an unavailable Codex version instead of checkpointing ambiguous identity', async () => {
    await expect(
      inspectQualificationExecutionEnvironment({
        getVersion: () => Promise.resolve('unavailable'),
        runActor: () => Promise.reject(new Error('Actor must not run during identity inspection.')),
        runJudge: () => Promise.reject(new Error('Judge must not run during identity inspection.')),
      }),
    ).rejects.toThrow('Unable to establish the exact Codex version.');
  });
});
