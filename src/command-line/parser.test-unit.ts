// @vitest-environment node
import { expect, test } from 'vitest';

import { parseEvidenceCommand } from './parser.ts';

test('parses a pack command independently of option order', () => {
  expect(parseEvidenceCommand('pack', ['--run', 'attempt-1', '--scope', 'semantic'])).toStrictEqual(
    {
      kind: 'pack',
      evidenceKind: 'semantic',
      runId: 'attempt-1',
    },
  );
});

test('requires an explicit semantic run and rejects unsupported scopes', () => {
  expect(() => parseEvidenceCommand('pack', ['--scope', 'semantic'])).toThrow(
    'Expected options: --scope, --run.',
  );
  expect(() => parseEvidenceCommand('pack', ['--scope', 'other', '--run', 'one'])).toThrow(
    'Evidence kind must be semantic.',
  );
});

test('rejects unknown and duplicate options', () => {
  expect(() =>
    parseEvidenceCommand('publish', ['--bundle', 'one.json.gz', '--bundle', 'two.json.gz']),
  ).toThrow('Option --bundle must be provided once.');
});
