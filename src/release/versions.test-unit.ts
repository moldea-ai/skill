// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  createCompatibleMajorRange,
  parseCompatibleMajorRange,
  parseCompatibleStableRange,
  parseStableVersion,
} from './versions.ts';

describe('release semantic versions', () => {
  test('accepts only exact stable versions', () => {
    expect(parseStableVersion('3.3.7')).toBe('3.3.7');
    for (const version of ['v3.3.7', '3.3', '^3.3.7', '3.3.7-beta.1', '03.3.7', 'latest']) {
      expect(() => parseStableVersion(version)).toThrow(/stable exact semantic version/u);
    }
  });

  test('creates and validates canonical compatible ranges', () => {
    expect(createCompatibleMajorRange('7.4.2')).toBe('^7.0.0');
    expect(parseCompatibleMajorRange('^7.0.0')).toBe('^7.0.0');
    expect(parseCompatibleStableRange('^4.0.1')).toBe('^4.0.1');

    expect(() => parseCompatibleMajorRange('^7.1.0')).toThrow(/compatible major range/u);
    expect(() => parseCompatibleStableRange('^0.1.0')).toThrow(/compatible stable range/u);
  });
});
