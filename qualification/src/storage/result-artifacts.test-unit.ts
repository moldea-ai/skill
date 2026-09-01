// @vitest-environment node
import { expect, test } from 'vitest';

import {
  createQualificationArtifactStorageEntries,
  createQualificationAttemptKey,
} from './result-artifacts.ts';

test('creates deterministic short attempt and artifact keys', () => {
  expect(createQualificationAttemptKey('attempt-one')).toMatch(/^a-[a-f0-9]{32}$/u);
  expect(
    createQualificationArtifactStorageEntries({
      'cases/example/trials/initial/workspace.patch': 'b'.repeat(64),
      'baseline.json': 'a'.repeat(64),
    }),
  ).toStrictEqual([
    { logicalPath: 'baseline.json', physicalPath: 'artifacts/f1.json', sha256: 'a'.repeat(64) },
    {
      logicalPath: 'cases/example/trials/initial/workspace.patch',
      physicalPath: 'artifacts/f2.patch',
      sha256: 'b'.repeat(64),
    },
  ]);
});

test.each(['../attempt.json', '/absolute.json', 'cases\\example.json', 'a/../b.json'])(
  'rejects unsafe logical artifact path %s',
  (logicalPath) => {
    expect(() =>
      createQualificationArtifactStorageEntries({ [logicalPath]: 'a'.repeat(64) }),
    ).toThrow(/contained POSIX path/u);
  },
);
