// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { executeProcess } from '../../../src/process/index.ts';

import type { IQualificationExecutionEnvironment } from '../contracts/index.ts';
import { getQualificationPnpmVersion } from '../pnpm-installation/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';
import {
  createQualificationExecutionProvenance,
  inspectQualificationExecutionEnvironment,
} from './provenance.ts';

vi.mock('../../../src/process/index.ts', () => ({ executeProcess: vi.fn() }));
vi.mock('../pnpm-installation/index.ts', () => ({ getQualificationPnpmVersion: vi.fn() }));

const executionEnvironment: IQualificationExecutionEnvironment = {
  model: 'gpt-6-sol',
  actorReasoningEffort: 'xhigh',
  judgeReasoningEffort: 'xhigh',
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
  beforeEach(() => {
    vi.mocked(executeProcess).mockReset();
    vi.mocked(getQualificationPnpmVersion).mockReset();
    vi.mocked(getQualificationPnpmVersion).mockResolvedValue(executionEnvironment.pnpmVersion);
    vi.mocked(executeProcess).mockImplementation(({ command, args }) => {
      expect(args).toStrictEqual(['--version']);
      if (command !== 'git') {
        throw new Error(`Unexpected version command: ${command}`);
      }
      return Promise.resolve({
        durationMs: 0,
        exitCode: 0,
        stderr: '',
        stdout: executionEnvironment.gitVersion,
      });
    });
  });

  test('uses the qualification-owned fifteen-minute host timeout by default', async () => {
    const originalTimeout = process.env['MOLDEA_EVAL_HOST_TIMEOUT_MS'];

    try {
      delete process.env['MOLDEA_EVAL_HOST_TIMEOUT_MS'];
      const inspectedEnvironment = await inspectQualificationExecutionEnvironment({
        getVersion: () => Promise.resolve('codex-cli test'),
        runActor: () => Promise.reject(new Error('Actor must not run during identity inspection.')),
        runJudge: () => Promise.reject(new Error('Judge must not run during identity inspection.')),
      });

      expect(inspectedEnvironment.hostTimeoutMs).toBe(900_000);
      expect(inspectedEnvironment.pnpmVersion).toBe(executionEnvironment.pnpmVersion);
      expect(inspectedEnvironment.gitVersion).toBe(executionEnvironment.gitVersion);
    } finally {
      if (originalTimeout === undefined) {
        delete process.env['MOLDEA_EVAL_HOST_TIMEOUT_MS'];
      } else {
        process.env['MOLDEA_EVAL_HOST_TIMEOUT_MS'] = originalTimeout;
      }
    }
  });

  test('preserves the checkpointed host identity and exact source fingerprints', () => {
    expect(
      createQualificationExecutionProvenance({
        executionEnvironment,
        compatibilitySnapshot: {
          sourceUrl: 'https://packages.moldea.ai/compatibility/runtimes.json',
          sha256: 'a'.repeat(64),
        },
        profileDigest: 'b'.repeat(64),
        qualificationDigest: 'c'.repeat(64),
        targetDigest: 'f'.repeat(64),
        qualificationState: createRepositoryState('qualification-commit', 'd'.repeat(64)),
        skillState: createRepositoryState('skill-commit', 'e'.repeat(64)),
      }),
    ).toStrictEqual({
      ...executionEnvironment,
      candidateFingerprint: null,
      compatibilitySnapshot: {
        sourceUrl: 'https://packages.moldea.ai/compatibility/runtimes.json',
        sha256: 'a'.repeat(64),
      },
      qualificationRepositoryCommit: 'qualification-commit',
      qualificationRepositoryDirty: false,
      skillRepositoryCommit: 'skill-commit',
      skillRepositoryFingerprint: 'e'.repeat(64),
      skillRepositoryDirty: false,
      profileDigest: 'b'.repeat(64),
      qualificationDigest: 'c'.repeat(64),
      targetDigest: 'f'.repeat(64),
      baselineAttemptId: null,
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
