// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { getQualificationModelCallCount } from './stages.ts';

describe('qualification stage planning', () => {
  test('derives the exact Custom maximum of six model calls from three cases', () => {
    expect(getQualificationModelCallCount(3)).toBe(6);
  });
});
