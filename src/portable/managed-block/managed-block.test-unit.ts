// @vitest-environment node
import { expect, test } from 'vitest';

import { assertManagedBlock, createManagedBlockBytes, hasManagedBlock } from './index.ts';

const BLOCK = '<!-- moldea:start -->\nInstructions\n<!-- moldea:end -->\n';

test.each([
  ['empty', Buffer.alloc(0)],
  ['existing', Buffer.from(BLOCK)],
] as const)('rejects malformed authored marker lines in an %s document', (_name, bytes) => {
  for (const block of [
    BLOCK.replace('Instructions', 'Instructions <!-- moldea:start -->'),
    BLOCK.replace('Instructions', 'Instructions\n<!-- moldea:start --> \t'),
  ]) {
    expect(() => createManagedBlockBytes(bytes, block, 'AGENTS.md')).toThrow(
      'AGENTS.md must contain exactly one moldea marker pair, each marker on its own line and the start marker first',
    );
  }
});

test.each(['README.md', 'AGENTS.md'] as const)(
  'recognizes and preserves cosmetic differences in %s',
  (fileName) => {
    const block = '<!-- moldea:start -->\n\nInstructions\nSecond paragraph\n<!-- moldea:end -->\n';
    for (const content of [
      block.slice(0, -1),
      block.replace('\n', '\r\n'),
      block.replace('<!-- moldea:start -->\n\n', '<!-- moldea:start -->\n'),
      block
        .replace('<!-- moldea:start -->\n', '<!-- moldea:start -->\n\n\n')
        .replace('<!-- moldea:end -->', '\n\n<!-- moldea:end -->'),
      block
        .replace('<!-- moldea:start -->', '<!-- moldea:start --> \t')
        .replace('<!-- moldea:end -->', '<!-- moldea:end -->\t '),
    ]) {
      const bytes = Buffer.from('\uFEFF# Host instructions\r\n\r\n' + content);
      expect(hasManagedBlock(bytes, block, fileName)).toBe(true);
      expect(createManagedBlockBytes(bytes, block, fileName)).toStrictEqual(bytes);
    }
  },
);

test('preserves surrounding bytes when genuinely stale padded markers need replacement', () => {
  const prefix = '\uFEFF# Host\r\n\r\n';
  const suffix = '\r\nOther instructions\n';
  const bytes = Buffer.from(
    prefix + '<!-- moldea:start --> \t\r\nOld instructions\n<!-- moldea:end -->\t\r\n' + suffix,
  );
  expect(hasManagedBlock(bytes, BLOCK, 'AGENTS.md')).toBe(false);
  expect(createManagedBlockBytes(bytes, BLOCK, 'AGENTS.md')).toStrictEqual(
    Buffer.from(prefix + BLOCK.replaceAll('\n', '\r\n') + suffix),
  );
});

test.each([
  BLOCK.replace('Instructions', ' Instructions'),
  BLOCK.replace('Instructions', 'Instructions  '),
  BLOCK.replace('Instructions', 'Instructions\n\nMore instructions'),
  BLOCK.replace('<!-- moldea:end -->', '<!-- moldea:start --> \t\n<!-- moldea:end -->'),
])('keeps meaningful drift and malformed markers visible: %s', (content) => {
  expect(hasManagedBlock(Buffer.from(content), BLOCK, 'AGENTS.md')).toBe(false);
});

test('retains long internal blank-line runs while ignoring only envelope blank lines', () => {
  const block = '<!-- moldea:start -->\n\nInstructions\nMore instructions\n<!-- moldea:end -->\n';
  const internal = Buffer.from(
    block.replace('Instructions\nMore', 'Instructions' + '\n'.repeat(131072) + 'More'),
  );
  expect(hasManagedBlock(internal, block, 'AGENTS.md')).toBe(false);
  const envelope = Buffer.from(
    block.replace('<!-- moldea:start -->\n', '<!-- moldea:start -->' + '\n'.repeat(131072)),
  );
  expect(hasManagedBlock(envelope, block, 'AGENTS.md')).toBe(true);
  expect(createManagedBlockBytes(envelope, block, 'AGENTS.md')).toStrictEqual(envelope);
});

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
