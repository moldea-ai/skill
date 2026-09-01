import { randomUUID } from 'node:crypto';
import { rename, rm } from 'node:fs/promises';
import path from 'node:path';

import {
  calculateDirectoryFingerprint,
  copyDirectory,
  ensureDirectory,
} from '../filesystem/index.ts';

/** Creates an exact independent workspace snapshot for one read-only judge process. */
export const prepareJudgeWorkspace = async (
  actorWorkspaceDirectory: string,
  judgeWorkspaceDirectory: string,
): Promise<string> => {
  const stagingDirectory = `${judgeWorkspaceDirectory}.${process.pid}.${randomUUID()}.tmp`;

  await ensureDirectory(path.dirname(judgeWorkspaceDirectory));
  await rm(stagingDirectory, { force: true, recursive: true });

  try {
    await copyDirectory(actorWorkspaceDirectory, stagingDirectory);
    const [actorFingerprint, judgeFingerprint] = await Promise.all([
      calculateDirectoryFingerprint(actorWorkspaceDirectory),
      calculateDirectoryFingerprint(stagingDirectory),
    ]);

    if (actorFingerprint !== judgeFingerprint) {
      throw new Error('The independent judge workspace does not match the post-actor project.');
    }

    await rm(judgeWorkspaceDirectory, { force: true, recursive: true });
    await rename(stagingDirectory, judgeWorkspaceDirectory);
    return judgeFingerprint;
  } finally {
    await rm(stagingDirectory, { force: true, recursive: true });
  }
};
