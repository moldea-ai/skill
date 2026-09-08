import { rm } from 'node:fs/promises';

import { resolveContainedPath } from '../filesystem/index.ts';

// disposable trees can always be reconstructed from committed inputs and the shared candidate cache
const RECONSTRUCTIBLE_ATTEMPT_DIRECTORIES = ['pnpm-store', 'runtime', 'workspaces'] as const;

/** Removes attempt-owned runtime trees while retaining only state required for explicit resume. */
export const cleanupQualificationAttemptRuntime = async (
  attemptDirectory: string,
  preserveResumeState: boolean,
): Promise<void> => {
  const relativeDirectories = preserveResumeState
    ? RECONSTRUCTIBLE_ATTEMPT_DIRECTORIES
    : [...RECONSTRUCTIBLE_ATTEMPT_DIRECTORIES, 'internal'];

  await Promise.all(
    relativeDirectories.map((relativeDirectory) =>
      rm(resolveContainedPath(attemptDirectory, relativeDirectory), {
        force: true,
        recursive: true,
      }),
    ),
  );
};
