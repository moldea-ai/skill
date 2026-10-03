// @vitest-environment node
import { expect, test } from 'vitest';

import { parseResponsePage } from './index.ts';

const identity = { command: 'content' as const, cliVersion: '9.0.1' };
const page = {
  schemaVersion: 5,
  cliVersion: '9.0.1',
  command: 'content',
  status: 'valid',
  error: null,
  result: { cursor: 'opaque_É+/=' },
};
const encode = (value: unknown) => Buffer.from(JSON.stringify(value));

test('preserves exact cursor text and tolerates additive response fields', () => {
  expect(parseResponsePage(encode({ ...page, future: true }), identity)).toStrictEqual({
    status: 'valid',
    cursor: page.result.cursor,
  });
});

test.each(['inspect', 'scope', 'validate'] as const)(
  'reads %s diagnostic metadata cursors',
  (command) => {
    expect(
      parseResponsePage(
        encode({
          ...page,
          command,
          status: 'invalid',
          result: { page: { cursor: null }, future: true },
        }),
        { ...identity, command },
      ),
    ).toStrictEqual({ status: 'invalid', cursor: null });
  },
);

test.each([
  ['truncated JSON', Buffer.from('{')],
  ['invalid UTF-8', Buffer.from([0xff])],
  ['oversized', Buffer.alloc(1_048_577)],
  ['schema', encode({ ...page, schemaVersion: 4 })],
  ['version', encode({ ...page, cliVersion: '9.0.2' })],
  ['command', encode({ ...page, command: 'validate' })],
  ['error', encode({ ...page, status: 'error', error: {}, result: null })],
  ['missing cursor', encode({ ...page, result: {} })],
  ['oversized cursor', encode({ ...page, result: { cursor: 'a'.repeat(8193) } })],
])('rejects %s response input', (_description, bytes) => {
  expect(() => parseResponsePage(bytes, identity)).toThrow();
});
