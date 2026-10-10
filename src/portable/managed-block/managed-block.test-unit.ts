// @vitest-environment node
import { expect, test } from 'vitest';

import { assertManagedBlock, createManagedBlockBytes, hasManagedBlock } from './index.ts';

const BLOCK = '<!-- moldea:start -->\nInstructions\n<!-- moldea:end -->\n';

test('AGENTS regions allow no opening blank line and preserve BOM, CRLF and outside bytes', () => {
  const prefix = Buffer.from('\uFEFF# Café\r\n\r\n');
  const suffix = Buffer.from('\nOther instructions\n');
  const bytes = Buffer.concat([prefix, Buffer.from(BLOCK.replaceAll('\n', '\r\n')), suffix]);
  expect(createManagedBlockBytes(bytes, BLOCK, 'AGENTS.md')).toStrictEqual(bytes);
  expect(hasManagedBlock(bytes, BLOCK, 'AGENTS.md')).toBe(true);
  expect(() => assertManagedBlock(BLOCK)).toThrow(/blank line/u);
  expect(() => assertManagedBlock(BLOCK, 'AGENTS.md', false)).not.toThrow();
});

test.each([
  '<!-- moldea:start -->\n',
  '<!-- moldea:end -->\n<!-- moldea:start -->\n',
  `${BLOCK}${BLOCK}`,
  'prefix <!-- moldea:start -->\n<!-- moldea:end -->\n',
])('rejects ambiguous AGENTS markers %s', (text) => {
  expect(() => createManagedBlockBytes(Buffer.from(text), BLOCK, 'AGENTS.md')).toThrow();
  expect(hasManagedBlock(Buffer.from(text), BLOCK, 'AGENTS.md')).toBe(false);
});

test('rejects malformed UTF-8 and bounds both current and resulting document bytes', () => {
  expect(() => createManagedBlockBytes(Buffer.from([0xff]), BLOCK, 'AGENTS.md')).toThrow(/UTF-8/u);
  for (const length of [2_097_152, 2_097_153]) {
    expect(() => createManagedBlockBytes(Buffer.alloc(length, 0x61), BLOCK, 'AGENTS.md')).toThrow(
      /exceeds/u,
    );
  }
  expect(() =>
    assertManagedBlock(
      `<!-- moldea:start -->\n${'a'.repeat(4096)}\n<!-- moldea:end -->\n`,
      'AGENTS.md',
      false,
    ),
  ).toThrow(/4096/u);
});
