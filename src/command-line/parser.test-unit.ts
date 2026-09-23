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

test('packs the latest completed qualification batch without a run option', () => {
  expect(parseEvidenceCommand('pack', ['--scope', 'qualification'])).toStrictEqual({
    kind: 'pack',
    evidenceKind: 'qualification',
  });
  expect(() => parseEvidenceCommand('pack', ['--scope', 'qualification', '--run', 'one'])).toThrow(
    'Expected options: --scope.',
  );
});

test('rejects unknown and duplicate options', () => {
  expect(() =>
    parseEvidenceCommand('publish', ['--bundle', 'one.json.gz', '--bundle', 'two.json.gz']),
  ).toThrow('Option --bundle must be provided once.');
});
