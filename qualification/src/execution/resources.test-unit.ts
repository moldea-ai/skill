// @vitest-environment node
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { createQualificationTemporaryStoragePaths } from './resources.ts';

describe('createQualificationTemporaryStoragePaths', () => {
  test('includes attempt-owned pnpm metadata and package content', () => {
    const attemptDirectory = path.resolve('qualification-attempt');
    const internalTrialDirectory = path.join(attemptDirectory, 'internal', 'trial');
    const publicTrialDirectory = path.join(attemptDirectory, 'public', 'trial');
    const workspaceDirectory = path.join(attemptDirectory, 'workspaces', 'case');

    expect(
      createQualificationTemporaryStoragePaths({
        attemptDirectory,
        internalTrialDirectory,
        publicTrialDirectory,
        workspaceDirectory,
      }),
    ).toStrictEqual([
      workspaceDirectory,
      internalTrialDirectory,
      publicTrialDirectory,
      path.join(attemptDirectory, 'pnpm-cache'),
      path.join(attemptDirectory, 'pnpm-store'),
      path.join(attemptDirectory, 'runtime'),
    ]);
  });
});
