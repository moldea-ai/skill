// @vitest-environment node
import { expect, test } from 'vitest';

import { parseChangedPaths, requiresFullConformance } from './index.ts';

test.each([
  ['M\0website/src/pages/index.astro\0', ['website/src/pages/index.astro']],
  ['R100\0src/old.ts\0website/public/new.ts\0', ['src/old.ts', 'website/public/new.ts']],
  ['C75\0website/public/old.svg\0src/new.svg\0', ['website/public/old.svg', 'src/new.svg']],
  ['C075\0website/public/old.svg\0src/new.svg\0', ['website/public/old.svg', 'src/new.svg']],
  ['M\0website/public/with\nnewline.svg\0', ['website/public/with\nnewline.svg']],
  ['', []],
  ['M\0missing-terminator', null],
  ['U\0website/public/conflict\0', null],
  ['R101\0website/public/old\0website/public/new\0', null],
  ['R100\0website/public/one\0', null],
  ['M\0website/public/../shared.ts\0', null],
  ['M\0\0', null],
])('parseChangedPaths(%s) -> %o', (output, expected) => {
  expect(parseChangedPaths(output)).toStrictEqual(expected);
});

test.each([
  [['website/src/components/button.astro', 'website/public/logo.svg'], false],
  [['website/src/layouts/base.astro', 'website/src/styles/site.css'], false],
  [['website/src/pages/index.astro', 'qualification/src/index.ts'], true],
  [['website/src/lib/qualification/presentation.ts'], true],
  [['website/scripts/generate.ts'], true],
  [['website/src/pages-other/index.ts'], true],
  [['website/public/_archive/source.ts'], true],
  [['.github/workflows/website.yml'], true],
  [[], true],
  [null, true],
])('requiresFullConformance(%o) -> %s', (paths, expected) => {
  expect(requiresFullConformance(paths)).toBe(expected);
});
