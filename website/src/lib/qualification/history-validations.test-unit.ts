// @vitest-environment node
import { createHash } from 'node:crypto';

import { describe, expect, test } from 'vitest';

import { assertMigratedCustomDuplicate } from './history-validations.ts';

const SOURCE_COMMIT = 'a'.repeat(40);
const ATTEMPT_SOURCE = Buffer.from('{"attempt":"custom"}\n');
const ARTIFACT_SOURCE = Buffer.from('{"passed":true}\n');

const createDuplicateSources = (adapterId = 'custom') => ({
  current: {
    adapterId,
    artifactSources: new Map([['coverage.json', ARTIFACT_SOURCE]]),
    attemptId: 'attempt-1',
    attemptSource: ATTEMPT_SOURCE,
    carryForward: {
      sourceAttemptDigest: createHash('sha256').update(ATTEMPT_SOURCE).digest('hex'),
      sourceCommit: SOURCE_COMMIT,
      sourceRelease: 'v4.0.0',
    },
    implementationId: adapterId,
  },
  historical: {
    adapterId,
    artifactSources: new Map([['coverage.json', ARTIFACT_SOURCE]]),
    attemptId: 'attempt-1',
    attemptSource: ATTEMPT_SOURCE,
    implementationId: adapterId,
    sourceCommit: SOURCE_COMMIT,
    sourceRelease: 'v4.0.0',
  },
});

describe('assertMigratedCustomDuplicate', () => {
  test('accepts the byte-identical carried Custom attempt', () => {
    const { current, historical } = createDuplicateSources();

    expect(() => assertMigratedCustomDuplicate(current, historical)).not.toThrow();
  });

  test('rejects a byte-identical duplicate from a non-Custom target', () => {
    const { current, historical } = createDuplicateSources('anthropic');

    expect(() => assertMigratedCustomDuplicate(current, historical)).toThrow(
      'is not the byte-identical migrated Custom attempt',
    );
  });

  test('rejects changed attempt or artifact bytes', () => {
    const changedAttempt = createDuplicateSources();
    changedAttempt.current.attemptSource = Buffer.from('{"attempt":"changed"}\n');

    expect(() =>
      assertMigratedCustomDuplicate(changedAttempt.current, changedAttempt.historical),
    ).toThrow('is not the byte-identical migrated Custom attempt');

    const changedArtifact = createDuplicateSources();
    changedArtifact.current.artifactSources = new Map([
      ['coverage.json', Buffer.from('{"passed":false}\n')],
    ]);

    expect(() =>
      assertMigratedCustomDuplicate(changedArtifact.current, changedArtifact.historical),
    ).toThrow('changed artifact coverage.json');
  });
});
