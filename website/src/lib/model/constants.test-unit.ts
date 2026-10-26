// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { GIT_VERSION_RANGE, NODE_VERSION_RANGE } from './constants.ts';

const readDocument = (name: string): string =>
  readFileSync(new URL(`../../../../docs/${name}`, import.meta.url), 'utf8');

describe('NODE_VERSION_RANGE', () => {
  test('matches the requirement stated by the setup reference', () => {
    expect(readDocument('getting-started.md')).toContain(`Node.js \`${NODE_VERSION_RANGE}\``);
  });
});

describe('GIT_VERSION_RANGE', () => {
  test('matches the requirement stated by the compatibility reference', () => {
    expect(readDocument('compatibility-and-local-tooling.md')).toContain(
      `Git \`${GIT_VERSION_RANGE}\``,
    );
  });
});
