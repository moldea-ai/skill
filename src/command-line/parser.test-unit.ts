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

test.each(['semantic', 'journeys'] as const)('parses pack and pin with scope %s', (scope) => {
  expect(parseEvidenceCommand('pack', ['--scope', scope, '--run', 'run-1'])).toStrictEqual({
    kind: 'pack',
    evidenceKind: scope,
    runId: 'run-1',
  });
  expect(
    parseEvidenceCommand('pin', [
      '--scope',
      scope,
      '--release',
      'evidence-run-1',
      '--asset',
      'run-1.json.gz',
    ]),
  ).toStrictEqual({
    kind: 'pin',
    evidenceKind: scope,
    release: 'evidence-run-1',
    assetName: 'run-1.json.gz',
  });
});

test('requires an explicit run and rejects unsupported scopes', () => {
  expect(() => parseEvidenceCommand('pack', ['--scope', 'semantic'])).toThrow(
    'Expected options: --scope, --run.',
  );
  expect(() => parseEvidenceCommand('pack', ['--scope', 'other', '--run', 'one'])).toThrow(
    'Evidence kind must be semantic or journeys.',
  );
});

test('rejects unknown and duplicate options', () => {
  expect(() =>
    parseEvidenceCommand('publish', ['--bundle', 'one.json.gz', '--bundle', 'two.json.gz']),
  ).toThrow('Option --bundle must be provided once.');
});
