import { rm } from 'node:fs/promises';

import { resolveContainedPath } from '../filesystem/index.ts';
import { createQualificationPnpmInstallation } from '../pnpm-installation/index.ts';

/** Removes attempt-owned runtime trees while retaining only state required for explicit resume. */
export const cleanupQualificationAttemptRuntime = async (
  attemptDirectory: string,
  preserveResumeState: boolean,
): Promise<void> => {
  const pnpmInstallation = createQualificationPnpmInstallation(attemptDirectory);
  const reconstructibleDirectories = [
    pnpmInstallation.cacheDirectory,
    pnpmInstallation.storeDirectory,
    resolveContainedPath(attemptDirectory, 'runtime'),
    resolveContainedPath(attemptDirectory, 'workspaces'),
  ];
  const directories = preserveResumeState
    ? reconstructibleDirectories
    : [...reconstructibleDirectories, resolveContainedPath(attemptDirectory, 'internal')];

  await Promise.all(
    directories.map((directory) =>
      rm(directory, {
        force: true,
        recursive: true,
      }),
    ),
  );
};
