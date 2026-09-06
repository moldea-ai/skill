// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { IQualificationAttemptResult } from '../contracts/index.ts';

import { formatQualificationResult, formatQualificationStatus } from './presentation.ts';

describe('qualification status presentation', () => {
  test('reports one bounded page without checkpoint bodies', () => {
    expect(
      formatQualificationStatus({
        formatVersion: 1,
        scope: 'actionable',
        snapshot: 'a'.repeat(64),
        counts: { attempts: 0, unavailableAttempts: 2, latestResults: 0, total: 2 },
        records: [
          {
            kind: 'unavailable-attempt',
            attemptId: 'unsupported-attempt',
            reason: 'invalid-status-summary',
            protocolVersion: 1,
          },
          {
            kind: 'unavailable-attempt',
            attemptId: 'malformed-attempt',
            reason: 'missing-status-summary',
            protocolVersion: null,
          },
        ],
        nextCursor: 'next-page',
      }),
    ).toBe(
      [
        'Status scope: actionable',
        `Snapshot: ${'a'.repeat(64)}`,
        'Page records: 2 of 2',
        'Local attempts:',
        '  none',
        'Unavailable local attempts:',
        '  unsupported-attempt  protocol 1  invalid-status-summary',
        '  malformed-attempt  protocol unknown  missing-status-summary',
        'Committed latest results:',
        '  none',
        'Next cursor: next-page',
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
