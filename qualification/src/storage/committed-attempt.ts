import path from 'node:path';

import { listDirectoryFiles } from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';

/** Proves that a complete recorded attempt directory matches one exact Git commit. */
export const isQualificationAttemptCommitted = async (options: {
  attemptDirectory: string;
  commit: string;
  repositoryRoot: string;
}): Promise<boolean> => {
  const relativeAttemptDirectory = path.relative(options.repositoryRoot, options.attemptDirectory);

  if (
    relativeAttemptDirectory === '' ||
    relativeAttemptDirectory === '..' ||
    relativeAttemptDirectory.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeAttemptDirectory)
  ) {
    return false;
  }

  try {
    const [{ stdout }, worktreeFiles] = await Promise.all([
      executeProcess({
        command: 'git',
        args: [
          'ls-tree',
          '-r',
          '-z',
          '--name-only',
          options.commit,
          '--',
          relativeAttemptDirectory,
        ],
        cwd: options.repositoryRoot,
      }),
      listDirectoryFiles(options.attemptDirectory),
    ]);
    const repositoryRelativeAttemptDirectory = relativeAttemptDirectory
      .split(path.sep)
      .join(path.posix.sep);
    const committedFiles = stdout
      .split('\0')
      .filter((entry) => entry !== '')
      .map((entry) => path.posix.relative(repositoryRelativeAttemptDirectory, entry))
      .sort((left, right) => left.localeCompare(right, 'en'));
    const expectedFiles = [...worktreeFiles].sort((left, right) => left.localeCompare(right, 'en'));

    if (JSON.stringify(committedFiles) !== JSON.stringify(expectedFiles)) {
      return false;
    }

    await executeProcess({
      command: 'git',
      args: ['diff', '--quiet', options.commit, '--', relativeAttemptDirectory],
      cwd: options.repositoryRoot,
    });
    return true;
  } catch {
    return false;
  }
};
