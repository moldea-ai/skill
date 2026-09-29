// @vitest-environment node
import { expect, test } from 'vitest';

import { getSemanticSourceIdentities } from './presentation.ts';

test('selected result identifies each recorded source instead of one aggregate source', () => {
  const sources = getSemanticSourceIdentities({
    cases: [
      {
        trials: [
          {
            actorHost: { model: 'first-actor', reasoningEffort: 'high' },
            carriedFrom: {
              attemptId: 'sem-first',
              artifactDigest: 'a'.repeat(64),
              cliVersion: '9.0.1',
              evidenceSha256: 'b'.repeat(64),
              reassessment: null,
              version: '6.0.2',
            },
            judgeHost: { model: 'first-judge', reasoningEffort: 'xhigh' },
          },
          {
            actorHost: { model: 'first-actor', reasoningEffort: 'high' },
            carriedFrom: {
              attemptId: 'sem-first',
              artifactDigest: 'a'.repeat(64),
              cliVersion: '9.0.1',
              evidenceSha256: 'b'.repeat(64),
              reassessment: null,
              version: '6.0.2',
            },
            judgeHost: { model: 'first-judge', reasoningEffort: 'xhigh' },
          },
        ],
      },
      {
        trials: [
          {
            actorHost: { model: 'second-actor', reasoningEffort: 'xhigh' },
            carriedFrom: {
              attemptId: 'sem-second',
              artifactDigest: 'c'.repeat(64),
              cliVersion: '10.0.0',
              evidenceSha256: 'd'.repeat(64),
              reassessment: 'The recorded result was re-evaluated.',
              version: '7.0.0',
            },
            judgeHost: { model: 'second-judge', reasoningEffort: 'high' },
          },
        ],
      },
    ],
  });

  expect(sources).toStrictEqual([
    {
      actorConfigurations: ['first-actor, high'],
      artifactDigest: 'a'.repeat(64),
      attemptId: 'sem-first',
      cliVersion: '9.0.1',
      evidenceSha256: 'b'.repeat(64),
      judgeConfigurations: ['first-judge, xhigh'],
      version: '6.0.2',
    },
    {
      actorConfigurations: ['second-actor, xhigh'],
      artifactDigest: 'c'.repeat(64),
      attemptId: 'sem-second',
      cliVersion: '10.0.0',
      evidenceSha256: 'd'.repeat(64),
      judgeConfigurations: ['second-judge, high'],
      version: '7.0.0',
    },
  ]);
});
