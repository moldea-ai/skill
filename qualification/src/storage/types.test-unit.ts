// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { QualificationProfileIndexSchema } from './types.ts';

const createTarget = (key: string, adapterId: string, implementationId: string) => ({
  key,
  adapterId,
  implementationId,
});

describe('qualification profile index', () => {
  test('accepts contiguous append-only keys', () => {
    expect(
      QualificationProfileIndexSchema.safeParse({
        version: 1,
        targets: [createTarget('t1', 'custom', 'custom'), createTarget('t2', 'openai', 'sdk')],
      }).success,
    ).toBe(true);
  });

  test.each([
    [
      'duplicate key',
      [createTarget('t1', 'custom', 'custom'), createTarget('t1', 'openai', 'sdk')],
    ],
    [
      'duplicate selection',
      [createTarget('t1', 'custom', 'custom'), createTarget('t2', 'custom', 'custom')],
    ],
    ['non-contiguous key', [createTarget('t2', 'custom', 'custom')]],
    ['unsafe key', [createTarget('../custom', 'custom', 'custom')]],
  ] as const)('rejects a %s', (_description, targets) => {
    expect(QualificationProfileIndexSchema.safeParse({ version: 1, targets }).success).toBe(false);
  });
});
