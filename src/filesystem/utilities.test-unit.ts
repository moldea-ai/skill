// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { normalizePortableFilesystemMode } from './utilities.ts';

describe('normalizePortableFilesystemMode', () => {
  test.each([
    ['file', 0o100600, 0o100644],
    ['file', 0o100644, 0o100644],
    ['file', 0o100664, 0o100644],
    ['file', 0o100700, 0o100755],
    ['file', 0o100755, 0o100755],
    ['file', 0o100775, 0o100755],
    ['symlink', 0o120700, 0o120000],
    ['symlink', 0o120777, 0o120000],
  ] as const)('normalizePortableFilesystemMode(%s, %o) -> %o', (kind, mode, expectedMode) => {
    expect(normalizePortableFilesystemMode(kind, mode)).toBe(expectedMode);
  });
});
