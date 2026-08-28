// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { IQualificationAttemptResult } from '../contracts/index.ts';

import { formatQualificationResult, formatQualificationStatus } from './presentation.ts';

describe('qualification status presentation', () => {
  test('reports preserved unavailable checkpoints separately from resumable attempts', () => {
    expect(
      formatQualificationStatus({
        attempts: [],
        unavailableAttempts: [
          {
            attemptId: 'legacy-attempt',
            kind: 'unsupported-protocol',
            message: 'Preserved legacy checkpoint.',
            protocolVersion: 1,
          },
          {
            attemptId: 'malformed-attempt',
            kind: 'unreadable-checkpoint',
            message: 'Preserved malformed checkpoint.',
            protocolVersion: null,
          },
        ],
        latestResults: [],
      }),
    ).toBe(
      [
        'Local attempts:',
        '  none',
        'Unavailable local attempts:',
        '  legacy-attempt  protocol 1  unsupported-protocol',
        '  malformed-attempt  protocol unknown  unreadable-checkpoint',
        'Committed latest results:',
        '  none',
      ].join('\n'),
    );
  });

  test('reports recovered cases and operational retries in a completed result', () => {
    const result = {
      attemptId: 'attempt-recovered',
      selection: { adapterId: 'custom', implementationId: 'custom' },
      status: 'passed',
      mode: 'official',
      summary: 'Qualification passed with one recovered case.',
      cases: [{ status: 'recovered', trials: [] }],
      stages: [
        {
          operationalRetries: [
            {
              category: 'timed-out',
              failedAt: '2026-08-28T12:00:00.000Z',
              failureCount: 1,
              retryDelayMs: 5_000,
            },
          ],
        },
      ],
    } as unknown as IQualificationAttemptResult;

    expect(formatQualificationResult(result, '/attempts/attempt-recovered', false)).toBe(
      [
        'custom/custom (official): passed',
        'Qualification passed with one recovered case.',
        'Recovered cases: 1',
        'Operational retries: 1',
        'Attempt: attempt-recovered',
        'Checkpoint: /attempts/attempt-recovered',
        'Committed: no',
      ].join('\n'),
    );
  });
});
