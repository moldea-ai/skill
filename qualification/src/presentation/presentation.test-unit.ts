// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { formatQualificationStatus } from './presentation.ts';

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
});
