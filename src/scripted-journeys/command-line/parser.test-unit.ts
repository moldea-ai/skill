// @vitest-environment node
import { expect, test } from 'vitest';

import { parseJourneysCommand } from './parser.ts';

test('assess accepts two explicit exports and preserves the trust anchor', () => {
  expect(
    parseJourneysCommand([
      'assess',
      '--bundle',
      'bundle.zip',
      '--sha256',
      'a'.repeat(64),
      '--export',
      'chatgpt.zip',
      '--export',
      'claude.zip',
    ]),
  ).toStrictEqual({
    command: 'assess',
    bundle: 'bundle.zip',
    sha256: 'a'.repeat(64),
    exports: ['chatgpt.zip', 'claude.zip'],
    models: {},
  });
});
test.each([
  [],
  ['pack'],
  ['pack', '--commit', 'HEAD', '--commit', 'main'],
  ['assess', '--bundle', 'bundle.zip'],
  ['publish-bundle', '--bundle', 'bundle.zip', '--sha256', 'a'.repeat(64)],
])('parser rejects incomplete or ambiguous arguments %o', (argv) => {
  expect(() => parseJourneysCommand(argv)).toThrow();
});
