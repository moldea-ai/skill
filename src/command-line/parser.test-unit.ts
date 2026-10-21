// @vitest-environment node
import { expectToThrowCode } from 'jg-exception/testing';
import { ERRORS as PROCESS_ERRORS } from 'jg-process';
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
  expectToThrowCode(
    () => parseEvidenceCommand('pack', ['--scope', 'semantic']),
    PROCESS_ERRORS.INVALID_ARGUMENTS,
    'The --run option is required.',
  );
  expect(() => parseEvidenceCommand('pack', ['--scope', 'other', '--run', 'one'])).toThrow(
    'Evidence kind must be semantic or journeys.',
  );
});

test.each([
  [['--bundle', 'one.json.gz', '--bundle', 'two.json.gz', '--tag', 'v1']],
  [['--bundle', 'one.json.gz', '--tag', 'v1', '--other', 'value']],
  [['--bundle', 'one.json.gz', '--tag', 'v1', 'extra']],
  [['--bundle', '--tag', 'v1']],
])('rejects unknown, duplicate, positional and missing values %o', (arguments_) => {
  expectToThrowCode(
    () => parseEvidenceCommand('publish', arguments_),
    PROCESS_ERRORS.INVALID_ARGUMENTS,
  );
});
