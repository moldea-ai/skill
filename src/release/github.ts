import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { ensureDirectory, writeBufferFileAtomically } from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import type { IGitHubRelease, IGitHubReleaseClient } from './types.ts';

const GitHubReleaseSchema = z.object({
  isDraft: z.boolean(),
  tagName: z.string().min(1),
  assets: z.array(
    z.object({
      name: z.string().min(1),
      size: z.number().int().nonnegative(),
    }),
  ),
});

const executeGitHub = async (args: readonly string[]): Promise<string> => {
  const result = await executeProcess({
    args,
    command: 'gh',
    cwd: process.cwd(),
    signal: AbortSignal.timeout(120_000),
  });
  return result.stdout;
};

/** GitHub CLI release client used only by explicit evidence publication commands. */
export const createGitHubReleaseClient = (): IGitHubReleaseClient => ({
  createDraft: async ({ notes, repository, tag, title }) => {
    await executeGitHub([
      'release',
      'create',
      tag,
      '--repo',
      repository,
      '--draft',
      '--prerelease',
      '--title',
      title,
      '--notes',
      notes,
    ]);
  },
  downloadAsset: async ({ assetName, destinationPath, repository, tag }) => {
    const destinationDirectory = path.dirname(destinationPath);
    await ensureDirectory(destinationDirectory);
    const downloadDirectory = await mkdtemp(path.join(destinationDirectory, '.download-'));
    try {
      await executeGitHub([
        'release',
        'download',
        tag,
        '--repo',
        repository,
        '--pattern',
        assetName,
        '--dir',
        downloadDirectory,
      ]);
      await writeBufferFileAtomically(
        destinationPath,
        await readFile(path.join(downloadDirectory, assetName)),
      );
    } finally {
      await rm(downloadDirectory, { force: true, recursive: true });
    }
  },
  getRelease: async (repository, tag): Promise<IGitHubRelease | null> => {
    try {
      const source = await executeGitHub([
        'release',
        'view',
        tag,
        '--repo',
        repository,
        '--json',
        'isDraft,tagName,assets',
      ]);
      const release = GitHubReleaseSchema.parse(JSON.parse(source) as unknown);
      return { assets: release.assets, isDraft: release.isDraft, tag: release.tagName };
    } catch (error) {
      if (error instanceof Error && /release not found|not found/u.test(error.message)) return null;
      throw error;
    }
  },
  publishDraft: async (repository, tag) => {
    await executeGitHub(['release', 'edit', tag, '--repo', repository, '--draft=false']);
  },
  uploadAsset: async ({ assetPath, repository, tag }) => {
    await executeGitHub(['release', 'upload', tag, assetPath, '--repo', repository]);
  },
});
