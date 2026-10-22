import type { Stats } from 'node:fs';
import { lstat, readlink, realpath } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { isPathWithin } from 'jg-fs';
import { assertGitSucceeded, readIndexEntries, runGit } from 'jg-git-commands';

import { createGitCommandOptions } from '../git-command/index.ts';
import { readRepositoryFile } from '../repository-files.ts';

import {
  REPAIR_GIT_ATTRIBUTE_BYTES,
  REPAIR_GIT_ATTRIBUTE_PATHS,
  REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS,
  REPAIR_GIT_INDEX_BYTES,
  REPAIR_GIT_OUTPUT_BYTES,
} from './constants.ts';

// state retained while resolving a directory's parents or a link target
type IDirectoryFrame = {
  path: string;
  parent: string;
  current?: string;
  components?: string[];
  cursor: number;
  pending?: string;
};

/**
 * Resolves directory links without normalizing away components before inspecting them.
 * The cache and traversal budget belong to one attribute inspection, not persistent state.
 */
const createDirectoryResolver = (repositoryRoot: string) => {
  const observations = new Map<string, string | null>([[repositoryRoot, repositoryRoot]]);
  let operations = 0;
  let observationBytes = 0;
  const charge = (bytes = 0): void => {
    operations += 1;
    observationBytes += bytes;
    if (operations > REPAIR_GIT_ATTRIBUTE_PATHS || observationBytes > REPAIR_GIT_INDEX_BYTES)
      throw new RangeError('Git attribute resolution exceeds its bounded inspection budget.');
  };

  return async (directory: string): Promise<string | null> => {
    const frames: IDirectoryFrame[] = [];
    const active = new Set<string>();
    const push = (path: string): void => {
      if (!isPathWithin(repositoryRoot, path))
        throw new Error('Git attribute path escapes the repository.');
      if (active.has(path)) throw new Error('Git attribute directory links form a cycle.');
      charge(Buffer.byteLength(path));
      active.add(path);
      frames.push({ path, parent: dirname(path), cursor: 0 });
    };
    const finish = (frame: IDirectoryFrame, resolved: string | null): void => {
      observations.set(frame.path, resolved);
      active.delete(frame.path);
      frames.pop();
    };
    if (!observations.has(directory)) push(directory);
    while (frames.length > 0) {
      const frame = frames.at(-1)!;
      if (!observations.has(frame.parent)) {
        push(frame.parent);
        continue;
      }
      if (frame.components === undefined) {
        const parent = observations.get(frame.parent)!;
        if (parent === null) {
          finish(frame, null);
          continue;
        }
        const candidate = join(parent, basename(frame.path));
        let stat: Stats;
        try {
          stat = await lstat(candidate);
        } catch (error) {
          if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
          finish(frame, null);
          continue;
        }
        if (stat.isDirectory()) {
          finish(frame, candidate);
          continue;
        }
        if (!stat.isSymbolicLink())
          throw new Error('Git attribute parent is not a supported directory.');
        let target = await readlink(candidate);
        // Windows junctions can expose the extended drive or UNC spelling.
        if (process.platform === 'win32' && target.startsWith('\\\\?\\')) {
          target = target.slice(4);
          if (target.slice(0, 4).toUpperCase() === 'UNC\\') target = '\\\\' + target.slice(4);
          if (!isAbsolute(target))
            throw new Error('Git attribute directory link uses an unsupported namespace.');
        }
        charge(Buffer.byteLength(target));
        const targetRoot = parse(target).root;
        const components = target
          .slice(targetRoot.length)
          .split(process.platform === 'win32' ? /[\\/]/u : sep);
        if (isAbsolute(target)) {
          const rootComponents = relative(parse(repositoryRoot).root, repositoryRoot)
            .split(sep)
            .filter(Boolean);
          const prefixComponents = components.splice(0, rootComponents.length);
          const prefix = join(targetRoot, ...prefixComponents);
          if (
            prefixComponents.some((component) => component === '.' || component === '..') ||
            !isPathWithin(repositoryRoot, prefix) ||
            !isPathWithin(prefix, repositoryRoot)
          )
            throw new Error('Git attribute directory link leaves the repository.');
          frame.current = repositoryRoot;
        } else {
          if (targetRoot) throw new Error('Git attribute directory link is ambiguous.');
          frame.current = parent;
        }
        frame.components = components;
      }
      if (frame.pending !== undefined) {
        const resolved = observations.get(frame.pending);
        if (resolved === undefined || resolved === null)
          throw new Error('Git attribute directory link target is unavailable.');
        frame.current = resolved;
        delete frame.pending;
        frame.cursor += 1;
      }
      const component = frame.components[frame.cursor];
      if (component === undefined) {
        finish(frame, frame.current!);
        continue;
      }
      charge();
      if (component === '' || component === '.') {
        frame.cursor += 1;
        continue;
      }
      if (component === '..') {
        const parent = dirname(frame.current!);
        if (!isPathWithin(repositoryRoot, parent))
          throw new Error('Git attribute directory link leaves the repository.');
        frame.current = parent;
        frame.cursor += 1;
        continue;
      }
      frame.pending = join(frame.current!, component);
      if (!observations.has(frame.pending)) push(frame.pending);
    }
    return observations.get(directory)!;
  };
};

/**
 * Checks whether the repository stores an attribute source; an unset one exits with 1.
 * @returns Whether Git declares a stored attribute source.
 * @throws If Git fails or its output exceeds the bounded capture limit.
 */
const hasStoredAttributeSource = async (repositoryRoot: string): Promise<boolean> => {
  const result = await runGit(REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS, {
    cwd: repositoryRoot,
    encoding: 'buffer',
    ...createGitCommandOptions(repositoryRoot, 'repository', REPAIR_GIT_OUTPUT_BYTES),
  });
  if (result.exitCode === 1) return false;
  assertGitSucceeded(result, 'config');
  return result.stdout.length > 0;
};

/**
 * Refuses executable attributes and unseen index fallbacks before worktree-aware Git reads.
 * @returns A promise that resolves once every relevant attribute source is verified.
 * @throws If attribute inspection is unsafe, exceeds a limit, or a Git read fails.
 */
export const assertAttributeSafety = async (
  repositoryRoot: string,
  validateEvidencePath: (path: string) => string,
): Promise<void> => {
  const gitPath = join(repositoryRoot, '.git');
  const gitStat = await lstat(gitPath);
  let gitDirectory = gitPath;
  if (gitStat.isFile()) {
    const declaration = (
      await readRepositoryFile(repositoryRoot, gitPath, REPAIR_GIT_ATTRIBUTE_BYTES, 'reject')
    ).toString('utf8');
    const match = /^gitdir: ([^\0\r\n]+)\r?\n?$/u.exec(declaration);
    if (!match) throw new Error('Git directory evidence is invalid.');
    gitDirectory = resolve(repositoryRoot, match[1]!);
  } else if (!gitStat.isDirectory()) {
    throw new Error('Git directory safety is unavailable for this repository.');
  }
  if ((await realpath(gitDirectory)) !== gitDirectory)
    throw new Error('Git metadata directory safety is unavailable.');
  let commonDirectory = gitDirectory;
  try {
    const declaration = (
      await readRepositoryFile(
        gitDirectory,
        join(gitDirectory, 'commondir'),
        REPAIR_GIT_ATTRIBUTE_BYTES,
        'reject',
      )
    )
      .toString('utf8')
      .trim();
    if (!declaration || /[\0\r\n]/u.test(declaration))
      throw new Error('Git common directory evidence is invalid.');
    commonDirectory = resolve(gitDirectory, declaration);
    if ((await realpath(commonDirectory)) !== commonDirectory)
      throw new Error('Git common directory safety is unavailable.');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  if (!(await lstat(commonDirectory)).isDirectory())
    throw new Error('Git common directory safety is unavailable.');
  if (await hasStoredAttributeSource(repositoryRoot))
    throw new Error('Stored Git attribute sources cannot be verified safely.');
  const entries = await readIndexEntries(
    repositoryRoot,
    createGitCommandOptions(repositoryRoot, 'repository', REPAIR_GIT_INDEX_BYTES),
  );
  const paths = new Set(entries.map(({ path }) => validateEvidencePath(path)));
  if (paths.size > REPAIR_GIT_ATTRIBUTE_PATHS)
    throw new RangeError('Git attribute inspection exceeds its path limit.');
  const indexedAttributes = new Set<string>();
  const attributes = new Set<string>([join(repositoryRoot, '.gitattributes')]);
  let attributePathBytes = Buffer.byteLength(join(repositoryRoot, '.gitattributes'));
  for (const path of paths) {
    if (path.split('/').at(-1) === '.gitattributes')
      indexedAttributes.add(join(repositoryRoot, path));
    let directory = dirname(join(repositoryRoot, path));
    while (directory !== repositoryRoot) {
      if (!isPathWithin(repositoryRoot, directory))
        throw new Error('Git attribute path escapes the repository.');
      const attribute = join(directory, '.gitattributes');
      if (attributes.has(attribute)) break;
      attributePathBytes += Buffer.byteLength(attribute);
      if (attributePathBytes > REPAIR_GIT_INDEX_BYTES)
        throw new RangeError('Git attribute paths exceed their bounded inspection budget.');
      attributes.add(attribute);
      if (attributes.size > REPAIR_GIT_ATTRIBUTE_PATHS)
        throw new RangeError('Git attribute inspection exceeds its path limit.');
      directory = dirname(directory);
    }
  }
  const infoAttributes = join(commonDirectory, 'info', 'attributes');
  attributePathBytes += Buffer.byteLength(infoAttributes);
  attributes.add(infoAttributes);
  if (attributes.size > REPAIR_GIT_ATTRIBUTE_PATHS || attributePathBytes > REPAIR_GIT_INDEX_BYTES)
    throw new RangeError('Git attribute inspection exceeds its path limit.');
  const resolveDirectory = createDirectoryResolver(repositoryRoot);
  const inspected = new Map<string, boolean>();
  let totalBytes = 0;
  for (const path of attributes) {
    const isIndexed = indexedAttributes.has(path);
    const directory =
      path === infoAttributes ? commonDirectory : await resolveDirectory(dirname(path));
    if (directory === null) {
      if (isIndexed) throw new Error('Git attribute fallback is unverified.');
      continue;
    }
    const resolvedPath = path === infoAttributes ? path : join(directory, '.gitattributes');
    if (inspected.has(resolvedPath)) {
      if (isIndexed && !inspected.get(resolvedPath))
        throw new Error('Git attribute fallback is unverified.');
      continue;
    }
    let bytes: Buffer;
    try {
      bytes = await readRepositoryFile(
        path === infoAttributes ? commonDirectory : repositoryRoot,
        resolvedPath,
        REPAIR_GIT_ATTRIBUTE_BYTES,
        'reject',
      );
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      inspected.set(resolvedPath, false);
      if (isIndexed) throw new Error('Git attribute fallback is unverified.', { cause: error });
      continue;
    }
    inspected.set(resolvedPath, true);
    totalBytes += bytes.length;
    if (totalBytes > REPAIR_GIT_OUTPUT_BYTES)
      throw new RangeError('Git attribute inspection exceeds its aggregate byte limit.');
    if (bytes.includes(Buffer.from('filter')))
      throw new Error(
        'Repository attribute safety is unavailable; no worktree Git read was performed.',
      );
  }
};
