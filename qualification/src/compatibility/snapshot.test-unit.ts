// @vitest-environment node
import { expect, test } from 'vitest';

import {
  createRuntimeCompatibilitySnapshot,
  getRuntimeCompatibilityMatrix,
  validateRuntimeCompatibilitySnapshot,
} from './snapshot.ts';

const publication = {
  schemaVersion: 1,
  matrixVersion: 2,
  deployment: { channel: 'stable' },
  adapters: {
    custom: {
      implementationStatus: 'available',
      implementation: { distribution: 'public', kind: 'package', package: '@moldea.ai/cli' },
      targets: [
        { id: 'custom', kind: 'custom', language: 'typescript', lastVerifiedAt: '2026-09-23' },
      ],
    },
  },
};

test('preserves additive publication fields and hashes canonical content independent of key order', () => {
  const snapshot = createRuntimeCompatibilitySnapshot(publication);
  const reordered = createRuntimeCompatibilitySnapshot({
    adapters: publication.adapters,
    deployment: publication.deployment,
    matrixVersion: 2,
    schemaVersion: 1,
  });
  expect(snapshot.sha256).toBe(reordered.sha256);
  expect(snapshot.publication).toStrictEqual(publication);
  expect(getRuntimeCompatibilityMatrix(snapshot).version).toBe(2);
  expect(validateRuntimeCompatibilitySnapshot(snapshot)).toStrictEqual(snapshot);
});

test('rejects a modified publication, source, or unsupported schema', () => {
  const snapshot = createRuntimeCompatibilitySnapshot(publication);
  expect(() =>
    validateRuntimeCompatibilitySnapshot({
      ...snapshot,
      publication: { ...publication, deployment: { channel: 'next' } },
    }),
  ).toThrow('digest does not match');
  expect(() =>
    validateRuntimeCompatibilitySnapshot({ ...snapshot, sourceUrl: 'https://example.com' }),
  ).toThrow();
  expect(() => createRuntimeCompatibilitySnapshot({ ...publication, schemaVersion: 2 })).toThrow();
});
