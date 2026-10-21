import { chmod, lstat, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { isPathWithin } from 'jg-fs';

/**
 * Creates one private response directory outside the repository, owned by this task.
 * @returns The absolute directory path; the caller removes it after using response pages.
 * @throws If the repository is not an absolute directory or contains the host temporary root.
 */
export const createResponseDirectory = async (repositoryRoot: string): Promise<string> => {
  if (!isAbsolute(repositoryRoot)) throw new Error('An absolute repository root is required.');
  const root = await realpath(repositoryRoot);
  if (!(await lstat(root)).isDirectory()) throw new Error('A repository directory is required.');
  const temporaryRoot = await realpath(tmpdir());
  if (isPathWithin(root, temporaryRoot))
    throw new Error('The host temporary root must be outside the repository.');
  const directory = await mkdtemp(join(temporaryRoot, 'moldea-response-'));
  try {
    if (process.platform !== 'win32') await chmod(directory, 0o700);
    return directory;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
};
