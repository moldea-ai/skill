// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { IQualificationExecutionEnvironment } from '../contracts/index.ts';
import { haveSameQualificationExecutionEnvironment } from './utilities.ts';

const createExecutionEnvironment = (): IQualificationExecutionEnvironment => ({
  model: 'gpt-5.6-sol',
  actorReasoningEffort: 'xhigh',
  judgeReasoningEffort: 'xhigh',
  codexVersion: 'codex-cli 0.154.0',
  nodeVersion: 'v24.15.0',
  pnpmVersion: '12.4.0',
  gitVersion: 'git version 2.53.0',
  allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
  hostTimeoutMs: 900_000,
  modelEndpoint: null,
  sslCertificateFileSha256: null,
});

describe('haveSameQualificationExecutionEnvironment', () => {
  test('accepts equal environments with different property insertion order', () => {
    const recorded = createExecutionEnvironment();
    const current: IQualificationExecutionEnvironment = {
      actorReasoningEffort: recorded.actorReasoningEffort,
      judgeReasoningEffort: recorded.judgeReasoningEffort,
      model: recorded.model,
      codexVersion: recorded.codexVersion,
      nodeVersion: recorded.nodeVersion,
      pnpmVersion: recorded.pnpmVersion,
      gitVersion: recorded.gitVersion,
      allowedEgressHosts: recorded.allowedEgressHosts,
      hostTimeoutMs: recorded.hostTimeoutMs,
      modelEndpoint: recorded.modelEndpoint,
      sslCertificateFileSha256: recorded.sslCertificateFileSha256,
    };

    expect(haveSameQualificationExecutionEnvironment(recorded, current)).toBe(true);
  });

  test('rejects a changed execution environment', () => {
    const recorded = createExecutionEnvironment();

    expect(
      haveSameQualificationExecutionEnvironment(recorded, {
        ...recorded,
        hostTimeoutMs: 600_000,
      }),
    ).toBe(false);
  });
});
