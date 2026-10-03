import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Writes exact bytes atomically; cancellation can prevent rename submission, not undo it.
 * @returns A promise resolving after replacement and owned staging-file cleanup.
 * @throws
 * - The signal's abort reason when cancelled before rename submission.
 * - Native filesystem errors when staging, replacement, or cleanup fails.
 */
export const writeBufferFileAtomically = async (
  filePath: string,
  content: Uint8Array,
  signal?: AbortSignal,
): Promise<void> => {
  signal?.throwIfAborted();
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(path.dirname(filePath), `.${randomUUID()}.tmp`);

  try {
    signal?.throwIfAborted();
    await writeFile(temporaryPath, content, { flag: 'wx', signal });
    signal?.throwIfAborted();
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};
