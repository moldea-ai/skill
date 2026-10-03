// @vitest-environment node
import { expect, test } from 'vitest';

import { parseResponsePage, verifyAndSaveResponse, type IResponseIdentity } from './index.ts';

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
          result: {
            valid: false,
            diagnosticCount: 2,
            errorCount: 1,
            warningCount: 1,
            counts: { diagnostics: 2, errors: 1, warnings: 1 },
            page: { cursor: null },
            future: true,
          },
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

const verify = (
  response: unknown,
  exitCode: number | null,
  command: IResponseIdentity['command'] = 'content',
) =>
  verifyAndSaveResponse(
    {},
    '',
    encode(response),
    { ...identity, command },
    exitCode,
    new AbortController().signal,
  );

test.each(['composition', 'content', 'inspect', 'scope', 'validate'] as const)(
  'verifies ordinary %s responses without requiring capture or continuation payloads',
  async (command) => {
    await expect(
      verify(
        {
          ...page,
          command,
          future: true,
          result: {
            valid: true,
            diagnosticCount: 1,
            errorCount: 0,
            warningCount: 1,
            counts: { diagnostics: 1, errors: 0, warnings: 1 },
            relevant: false,
          },
        },
        0,
        command,
      ),
    ).resolves.toBeUndefined();
  },
);

test.each([2, 3])(
  'preserves structured CLI errors with exit %d without capture',
  async (exitCode) => {
    await expect(
      verify(
        { ...page, status: 'error', result: null, error: { code: 'CURSOR_INVALID', future: true } },
        exitCode,
      ),
    ).resolves.toBeUndefined();
  },
);

test.each([
  ['valid with exit one', page, 1],
  ['invalid with exit zero', { ...page, status: 'invalid' }, 0],
  ['valid with null exit', page, null],
  ['error with exit zero', { ...page, status: 'error', error: {}, result: null }, 0],
  ['valid with error object', { ...page, error: {} }, 0],
  ['valid with null result', { ...page, result: null }, 0],
  ['valid with array result', { ...page, result: [] }, 0],
  ['error with null error', { ...page, status: 'error', result: null }, 3],
  ['unsupported status', { ...page, status: 'success' }, 0],
  ['schema mismatch', { ...page, schemaVersion: 6 }, 0],
  ['version mismatch', { ...page, cliVersion: '9.0.2' }, 0],
  ['command mismatch', { ...page, command: 'scope' }, 0],
] as const)('rejects %s without capture', async (_description, response, exitCode) => {
  await expect(verify(response, exitCode)).rejects.toThrow();
});

test('rejects an invalid composition result', async () => {
  await expect(
    verify({ ...page, command: 'composition', status: 'invalid' }, 1, 'composition'),
  ).rejects.toThrow('composition');
});

test.each(['inspect', 'validate'] as const)(
  'checks complete %s totals independently of paged records',
  async (command) => {
    const result = {
      valid: false,
      diagnosticCount: 3,
      errorCount: 2,
      warningCount: 1,
      counts: { diagnostics: 3, errors: 2, warnings: 1 },
      page: { records: [], cursor: 'more' },
    };
    await expect(
      verify({ ...page, command, status: 'invalid', result }, 1, command),
    ).resolves.toBeUndefined();
    for (const [diagnostics, errors, warnings, valid] of [
      [-1, 0, 0, true],
      [1.5, 0, 1.5, true],
      [1, -1, 2, false],
      [1, 0.5, 0.5, false],
      [1, 0, -1, true],
      [1, 0, 0, true],
      [3, 2, 1, true],
      [0, 0, 0, false],
    ] as const) {
      await expect(
        verify(
          {
            ...page,
            command,
            status: valid ? 'valid' : 'invalid',
            result: {
              ...result,
              valid,
              diagnosticCount: diagnostics,
              errorCount: errors,
              warningCount: warnings,
              counts: { diagnostics, errors, warnings },
            },
          },
          valid ? 0 : 1,
          command,
        ),
      ).rejects.toThrow();
    }
    await expect(verify({ ...page, command, result }, 0, command)).rejects.toThrow('contradict');
    await expect(verify({ ...page, command, result: {} }, 0, command)).rejects.toThrow('totals');
  },
);

test('verifies a maximum-size response and bounds failures without exposing its body', async () => {
  const bytes = encode({ ...page, result: { padding: '' } });
  const maximum = encode({
    ...page,
    result: { padding: 'x'.repeat(1_048_576 - bytes.byteLength) },
  });
  expect(maximum.byteLength).toBe(1_048_576);
  await expect(
    verifyAndSaveResponse({}, '', maximum, identity, 0, new AbortController().signal),
  ).resolves.toBeUndefined();
  for (const malformed of [
    Buffer.from('{"private":"sensitive'),
    Buffer.from([0xff]),
    Buffer.alloc(1_048_577),
  ]) {
    await expect(
      verifyAndSaveResponse({}, '', malformed, identity, 0, new AbortController().signal),
    ).rejects.toThrow(
      /^Moldea response (?:is not complete UTF-8 JSON|exceeds the 1 MiB page limit)\.$/u,
    );
  }
});
