import type { Stats } from 'node:fs';
import { lstat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  parseRepositoryPath,
  type IRepositoryLinkResolution,
  type IRepositoryPath,
} from '@moldea.ai/repository';
import {
  createFilesystemRepositoryLinkResolver,
  createFilesystemRepositoryReader,
} from '@moldea.ai/repository-fs';

// coding-agent instruction files the helpers may update, as repository-relative paths
export type IInstructionPath = 'AGENTS.md' | 'CLAUDE.md' | '.claude/CLAUDE.md' | 'CLAUDE.local.md';

// the host file to read and replace, with a check that a followed link still names it
export interface IInstructionWriteTarget {
  readonly hostPath: string;
  readonly confirm: () => Promise<void>;
}

const toHostPath = (repositoryRoot: string, path: string): string =>
  join(repositoryRoot, ...path.replace(/^\//u, '').split('/'));

const lstatIfPresent = async (path: string): Promise<Stats | undefined> => {
  try {
    return await lstat(path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  }
};

/** Describes why a linked instruction file cannot be updated in place. */
const describeRefusal = (
  instructionPath: IInstructionPath,
  resolution: IRepositoryLinkResolution,
): string => {
  switch (resolution.state) {
    case 'not-link':
      return `${instructionPath} stopped being a link during the update`;
    case 'inside':
    case 'outside':
      return resolution.targetType !== 'file'
        ? `${instructionPath} links to a ${resolution.targetType === 'directory' ? 'directory' : 'non-file entry'}, not a regular file`
        : `${instructionPath} links to a file outside the repository`;
    case 'broken':
      return `${instructionPath} is a broken link`;
    case 'loop':
      return `${instructionPath} is a link loop`;
    case 'denied':
      return `${instructionPath} links to a target that cannot be accessed`;
    case 'unsafe':
      return `${instructionPath} links to a network, device, or otherwise unsafe target`;
  }
};

/**
 * Resolves one root instruction link through Repository FS, the same resolver validation uses.
 * The reader selects only the instruction path, and link text is never opened directly.
 * @param repositoryRoot The canonical absolute repository root.
 * @param instructionPath The instruction file to resolve.
 * @returns The content-free classification of the link's final target.
 */
export const resolveInstructionLink = async (
  repositoryRoot: string,
  instructionPath: IInstructionPath,
): Promise<IRepositoryLinkResolution> => {
  const logicalPath = parseRepositoryPath(`/${instructionPath}`);
  const reader = await createFilesystemRepositoryReader({
    rootDirectory: repositoryRoot,
    selection: { kind: 'paths', paths: [logicalPath] },
  });

  return createFilesystemRepositoryLinkResolver(reader).resolveLink(logicalPath);
};

/** Resolves a link to its inside regular-file target or refuses it with a specific reason. */
const resolveLinkedTarget = async (
  repositoryRoot: string,
  instructionPath: IInstructionPath,
): Promise<IRepositoryPath> => {
  const resolution = await resolveInstructionLink(repositoryRoot, instructionPath);

  if (resolution.state !== 'inside' || resolution.targetType !== 'file') {
    throw new Error(describeRefusal(instructionPath, resolution));
  }

  return resolution.targetPath;
};

/**
 * Selects the host file a helper may update for one instruction path. A regular or absent file is
 * itself; a link must resolve to a regular file inside the repository, which is written in place
 * of the link so the link is kept. Parent directories must be real directories.
 * @param repositoryRoot The canonical absolute repository root.
 * @param instructionPath The instruction file to update.
 * @returns The host path to update and a post-write check of the link.
 * @throws
 * - A parent of the instruction file must be a regular directory.
 * - The specific reason a linked instruction file cannot be updated in place.
 */
export const resolveInstructionWriteTarget = async (
  repositoryRoot: string,
  instructionPath: IInstructionPath,
): Promise<IInstructionWriteTarget> => {
  const linkPath = toHostPath(repositoryRoot, instructionPath);
  const ownTarget: IInstructionWriteTarget = { hostPath: linkPath, confirm: async () => {} };
  const segments = instructionPath.split('/');

  for (let index = 1; index < segments.length; index += 1) {
    const parentStats = await lstatIfPresent(join(repositoryRoot, ...segments.slice(0, index)));
    if (parentStats === undefined) return ownTarget;
    if (!parentStats.isDirectory()) {
      throw new Error(`${segments.slice(0, index).join('/')} must be a regular directory`);
    }
  }

  if ((await lstatIfPresent(linkPath))?.isSymbolicLink() !== true) {
    return ownTarget;
  }

  const targetPath = await resolveLinkedTarget(repositoryRoot, instructionPath);

  return {
    hostPath: toHostPath(repositoryRoot, targetPath),
    confirm: async () => {
      if ((await resolveLinkedTarget(repositoryRoot, instructionPath)) !== targetPath) {
        throw new Error(`${instructionPath} changed its link target during the update`);
      }
    },
  };
};
