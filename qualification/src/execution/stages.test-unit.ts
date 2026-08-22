// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { getQualificationModelCallCount } from './stages.ts';

describe('qualification stage planning', () => {
  test('derives the exact Custom maximum of sixteen model calls from eight cases', () => {
    expect(getQualificationModelCallCount(8)).toBe(16);
  });
});
