import type { Stats } from 'node:fs';
import { lstat } from 'node:fs/promises';
import { join } from 'node:path';

import {
  REPOSITORY_LINK_TEXT_MAX_BYTES,
  parseRepositoryPath,
  resolveRepositoryLink,
  type IRepositoryLinkResolution,
  type IRepositoryLinkSource,
  type IRepositoryPath,
} from '@moldea.ai/repository';
import { createFilesystemRepositoryReader } from '@moldea.ai/repository-fs';

import { GitCommandError, runGitCommand } from '../git-command/index.ts';

import {
  INSTRUCTION_GIT_OUTPUT_BYTES,
  INSTRUCTION_GIT_STORAGE_ARGUMENTS,
  INSTRUCTION_GIT_SYMLINK_SETTING_ARGUMENTS,
  INSTRUCTION_PATHS,
} from './constants.ts';

// coding-agent instruction files the helpers may update, as repository-relative paths
export type IInstructionPath = 'AGENTS.md' | 'CLAUDE.md' | '.claude/CLAUDE.md' | 'CLAUDE.local.md';

// the host file to read and replace, with a check that a followed link still names it
export interface IInstructionWriteTarget {
  readonly hostPath: string;
  readonly confirm: () => Promise<void>;
}

// one index entry printed by `ls-files --stage -z`: mode, object ID, stage, and path
const STAGED_ENTRY_PATTERN = /^([0-7]{6}) (?:[0-9a-f]{40}|[0-9a-f]{64}) [0-3]\t(.+)$/su;
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

// the reason and next step for every link that doesn't lead to a file in the repository
const REFUSALS: Record<Exclude<IRepositoryLinkResolution['state'], 'file'>, string> = {
  outside:
    'links outside the repository, and moldea only checks files in the repository. Replace an absolute link with a relative one, or move the instructions into the repository',
  missing:
    "links to a file that isn't in the repository. If it exists locally, Git ignores it or it isn't committed yet: commit it, or point the link at a committed file. Otherwise fix or remove the link",
  loop: 'is a link loop. Fix the links',
  'not-file':
    "doesn't link straight to a file. Point the link straight at a file in the repository",
  unsupported:
    "doesn't link straight to a file. Point the link straight at a file in the repository",
};

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

/**
 * Asks Git how it stores one path, as the CLI sees it: the index modes of a tracked path, an empty
 * list for an untracked path Git doesn't ignore, or `null` when Git ignores it. Only lines naming
 * exactly this path count, so entries under a same-named folder are skipped.
 * @throws
 * - GitCommandError when Git fails or prints output it never prints for this query.
 */
const readGitStorage = (repositoryRoot: string, path: IRepositoryPath): string[] | null => {
  const relativePath = path.slice(1);
  const { stdout } = runGitCommand(
    repositoryRoot,
    [...INSTRUCTION_GIT_STORAGE_ARGUMENTS, relativePath],
    { configScope: 'cli', maxOutputBytes: INSTRUCTION_GIT_OUTPUT_BYTES },
  );
  let text: string;
  try {
    text = decoder.decode(stdout);
  } catch (error) {
    throw new GitCommandError('Git returned path evidence that is not UTF-8.', { cause: error });
  }
  if (text !== '' && !text.endsWith('\0'))
    throw new GitCommandError('Git returned incomplete path evidence.');
  let isUntracked = false;
  const modes: string[] = [];
  for (const record of text.split('\0').slice(0, -1)) {
    if (record === relativePath) isUntracked = true;
    const staged = STAGED_ENTRY_PATTERN.exec(record);
    if (staged?.[2] === relativePath) modes.push(staged[1]!);
  }
  return modes.length > 0 ? modes : isUntracked ? [] : null;
};

/**
 * Reads Git's effective `core.symlinks` setting, as the CLI reads it.
 * @throws
 * - GitCommandError when Git fails or prints something other than a boolean.
 */
const readSymlinkSetting = (repositoryRoot: string): boolean => {
  const output = runGitCommand(repositoryRoot, INSTRUCTION_GIT_SYMLINK_SETTING_ARGUMENTS, {
    configScope: 'cli',
    maxOutputBytes: INSTRUCTION_GIT_OUTPUT_BYTES,
  }).stdout.toString('utf8');
  if (output !== 'true\n' && output !== 'false\n')
    throw new GitCommandError('Git returned an invalid core.symlinks value.');
  return output === 'true\n';
};

/**
 * Creates the link source the writer resolves through: the files validation sees, with Git links
 * checked out as plain files read as their stored text, exactly as the CLI reads them. Git is
 * asked only about visited paths, and about `core.symlinks` only once a link mode appears.
 * @param repositoryRoot The canonical absolute repository root.
 * @returns The two reader operations `resolveRepositoryLink` needs.
 */
const createWriterLinkSource = async (repositoryRoot: string): Promise<IRepositoryLinkSource> => {
  const reader = await createFilesystemRepositoryReader({
    rootDirectory: repositoryRoot,
    selection: { kind: 'directory' },
  });
  // byte lengths of the Git links checked out as plain files, which hold the link text
  const materializedLinks = new Map<IRepositoryPath, number>();
  let areSymlinksEnabled: boolean | undefined;

  return {
    getEntry: async (path, options) => {
      const entry = await reader.getEntry(path, options);
      if (entry?.type !== 'file' && entry?.type !== 'symlink') return entry;
      const modes = readGitStorage(repositoryRoot, path);
      if (modes === null) return INSTRUCTION_PATHS.has(path) ? entry : null;
      if (entry.type === 'symlink' || !modes.includes('120000')) return entry;
      areSymlinksEnabled ??= readSymlinkSetting(repositoryRoot);
      if (areSymlinksEnabled) return entry;
      if (modes.some((mode) => mode === '100644' || mode === '100755'))
        throw new Error(
          `${path.slice(1)} is stored in the Git index both as a link and as a file; resolve that conflict first`,
        );
      materializedLinks.set(path, entry.byteLength ?? 0);
      return { ...entry, type: 'symlink' };
    },
    readLinkText: async (path, options) => {
      const byteLength = materializedLinks.get(path);
      if (byteLength === undefined) return reader.readLinkText(path, options);
      if (byteLength > REPOSITORY_LINK_TEXT_MAX_BYTES) return null;
      if (byteLength === 0) return '';
      const page = await reader.readFilePage(path, {
        maxBytes: byteLength,
        offset: 0,
        ...(options?.signal === undefined ? {} : { signal: options.signal }),
      });
      if (!page.isComplete || page.bytes.byteLength !== byteLength)
        throw new Error(`${path.slice(1)} changed during the update`);
      try {
        return decoder.decode(page.bytes);
      } catch {
        return null;
      }
    },
  };
};

/**
 * Resolves one instruction file to the regular file it leads to, as validation does, or refuses
 * it with the reason and the next step.
 * @throws
 * - The reason a linked instruction file cannot be updated, with its next step.
 * - Git could not report how the repository stores this file.
 */
const resolveInstructionTarget = async (
  repositoryRoot: string,
  instructionPath: IInstructionPath,
): Promise<IRepositoryPath> => {
  let resolution: IRepositoryLinkResolution;
  try {
    resolution = await resolveRepositoryLink(
      await createWriterLinkSource(repositoryRoot),
      parseRepositoryPath(`/${instructionPath}`),
    );
  } catch (error) {
    if (error instanceof GitCommandError || error instanceof RangeError)
      throw new Error(
        `${instructionPath} was not updated: Git could not report how the repository stores this file`,
        { cause: error },
      );
    throw error;
  }
  if (resolution.state !== 'file')
    throw new Error(`${instructionPath} ${REFUSALS[resolution.state]}`);
  return resolution.targetPath;
};

/**
 * Selects the host file a helper may update for one instruction path. An absent file, or one that
 * is neither a link nor a regular file, is itself. A link or regular file is resolved as validation
 * resolves it: a link must lead to a regular file inside the repository, which is written in place
 * of the link so the link is kept. Parent directories must be real directories.
 * @param repositoryRoot The canonical absolute repository root.
 * @param instructionPath The instruction file to update.
 * @returns The host path to update and a post-write check of the link.
 * @throws
 * - A parent of the instruction file must be a regular directory.
 * - The reason a linked instruction file cannot be updated, with its next step.
 * - Git could not report how the repository stores this file.
 */
export const resolveInstructionWriteTarget = async (
  repositoryRoot: string,
  instructionPath: IInstructionPath,
): Promise<IInstructionWriteTarget> => {
  const ownPath = toHostPath(repositoryRoot, instructionPath);
  const ownTarget: IInstructionWriteTarget = { hostPath: ownPath, confirm: async () => {} };
  const segments = instructionPath.split('/');

  for (let index = 1; index < segments.length; index += 1) {
    const parentStats = await lstatIfPresent(join(repositoryRoot, ...segments.slice(0, index)));
    if (parentStats === undefined) return ownTarget;
    if (!parentStats.isDirectory()) {
      throw new Error(`${segments.slice(0, index).join('/')} must be a regular directory`);
    }
  }

  // only a link, or a file Git may store as one, can lead elsewhere; the reader reports the rest
  const ownStats = await lstatIfPresent(ownPath);
  if (ownStats === undefined || (!ownStats.isSymbolicLink() && !ownStats.isFile()))
    return ownTarget;

  const targetPath = await resolveInstructionTarget(repositoryRoot, instructionPath);
  if (targetPath === `/${instructionPath}`) return ownTarget;

  return {
    hostPath: toHostPath(repositoryRoot, targetPath),
    confirm: async () => {
      if ((await resolveInstructionTarget(repositoryRoot, instructionPath)) !== targetPath) {
        throw new Error(`${instructionPath} changed its link target during the update`);
      }
    },
  };
};
