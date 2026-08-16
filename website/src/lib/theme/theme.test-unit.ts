// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { isDarkTheme, parseThemePreference } from './theme.ts';

describe('theme utilities', () => {
  test.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['system', 'system'],
    ['unsupported', 'system'],
    [null, 'system'],
  ] as const)('parseThemePreference(%s) -> %s', (input, expected) => {
    expect(parseThemePreference(input)).toBe(expected);
  });

  test.each([
    ['dark', false, true],
    ['light', true, false],
    ['system', true, true],
    ['system', false, false],
  ] as const)('isDarkTheme(%s, %s) -> %s', (preference, systemDark, expected) => {
    expect(isDarkTheme(preference, systemDark)).toBe(expected);
  });
});
