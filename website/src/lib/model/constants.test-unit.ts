// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { NODE_VERSION_RANGE } from './constants.ts';

describe('NODE_VERSION_RANGE', () => {
  test('matches the requirement stated by the setup reference', () => {
    const setupReference = readFileSync(
      new URL('../../../../docs/getting-started.md', import.meta.url),
      'utf8',
    );

    expect(setupReference).toContain(`Node.js \`${NODE_VERSION_RANGE}\``);
  });
});
