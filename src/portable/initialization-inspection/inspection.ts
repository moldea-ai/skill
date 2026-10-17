import { lstat, opendir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import { isPathWithin, readRepositoryFile, resolveRepositoryFile } from '../repository-files.ts';

import {
  INITIALIZATION_INSPECTION_LIMITS as LIMITS,
  INSPECTION_EXCLUDED_DIRECTORIES,
} from './constants.ts';
import type {
  IInitializationInspection,
  IInitializationInspectionOptions,
  IInitializationInventory,
  IInitializationSource,
} from './types.ts';

/** Rejects escaping, excluded, or credential paths before accessing the filesystem. */
const validateSourcePath = (path: string): string => {
  const parts = path.split('/');
  if (
    !path ||
    isAbsolute(path) ||
    /^[a-z]:/iu.test(path) ||
    /[\\\p{Cc}]/u.test(path) ||
    parts.some(
      (part) =>
        !part ||
        part === '.' ||
        part === '..' ||
        // reject Windows stream and name aliases that could bypass the secret-file check.
        /:|[. ]$/u.test(part) ||
        INSPECTION_EXCLUDED_DIRECTORIES.has(part),
    ) ||
    parts.some((part) => /^\.env(?:\.|$)|^(?:auth|credentials)\.json$|\.(?:pem|key)$/iu.test(part))
  ) {
    throw new Error('Inspection requires known repository-relative source paths.');
  }
  return path;
};

const logicalPath = (root: string, path: string): string =>
  relative(root, path).split(sep).join('/');

/** Inventories bounded metadata without reading document bodies or following directory links. */
const inspectInventory = async (
  root: string,
  installedRoot: string,
): Promise<{ inventory: IInitializationInventory; isComplete: boolean }> => {
  const inventory: IInitializationInventory = {
    canonicalAgentDirectories: [],
    documents: [],
    decisionCandidates: [],
    skillCandidates: [],
    visitedEntries: 0,
  };
  const pending = [{ path: root, depth: 0 }];
  let isComplete = true;
  for (let index = 0; index < pending.length; index += 1) {
    const directory = pending[index]!;
    if (directory.depth > LIMITS.directoryDepth) {
      isComplete = false;
      continue;
    }
    try {
      const stat = await lstat(directory.path);
      if (!stat.isDirectory() || !isPathWithin(root, await realpath(directory.path))) {
        isComplete = false;
        continue;
      }
      const entries = await opendir(directory.path);
      for await (const entry of entries) {
        if (inventory.visitedEntries === LIMITS.inventoryEntries) {
          isComplete = false;
          return { inventory: sortInventory(inventory), isComplete };
        }
        inventory.visitedEntries += 1;
        if (INSPECTION_EXCLUDED_DIRECTORIES.has(entry.name)) continue;
        const absolutePath = join(directory.path, entry.name);
        if (isPathWithin(installedRoot, absolutePath)) continue;
        if (entry.isSymbolicLink()) continue;
        const path = logicalPath(root, absolutePath);
        const isAgentDirectory = entry.isDirectory() && /^moldea\/agents\/[^/]+$/u.test(path);
        const isDocument = entry.isFile() && entry.name.endsWith('.md');
        if (isAgentDirectory || isDocument) {
          const category = isAgentDirectory
            ? 'canonicalAgentDirectories'
            : entry.name === 'SKILL.md'
              ? 'skillCandidates'
              : path.split('/').some((part) => /^(?:adr|adrs|decisions)$/iu.test(part))
                ? 'decisionCandidates'
                : 'documents';
          if (inventory[category].length === LIMITS.inventoryRecords) isComplete = false;
          else if (category === 'skillCandidates')
            inventory.skillCandidates.push({ path, ownership: 'unverified' });
          else inventory[category].push(path);
        }
        if (entry.isDirectory()) pending.push({ path: absolutePath, depth: directory.depth + 1 });
      }
    } catch {
      isComplete = false;
    }
  }
  return { inventory: sortInventory(inventory), isComplete };
};

const sortInventory = (inventory: IInitializationInventory): IInitializationInventory => {
  inventory.canonicalAgentDirectories.sort();
  inventory.documents.sort();
  inventory.decisionCandidates.sort();
  inventory.skillCandidates.sort((left, right) => left.path.localeCompare(right.path, 'en'));
  return inventory;
};

/** Reads only the selected batch; each source and the complete packet have independent bounds. */
const inspectSources = async (root: string, paths: string[]): Promise<IInitializationSource[]> => {
  let remainingBytes: number = LIMITS.sourcePacketBytes;
  const sources: IInitializationSource[] = [];
  for (const path of paths) {
    if (remainingBytes === 0) {
      sources.push({ path, content: null, omission: 'packet-limit' });
      continue;
    }
    try {
      const absolutePath = resolve(root, path);
      const sourcePath = await resolveRepositoryFile(
        root,
        absolutePath,
        LIMITS.sourceFileBytes,
        'reject',
      );
      const { size } = await lstat(sourcePath);
      if (size > LIMITS.sourceFileBytes) throw new Error('Source exceeds its byte limit.');
      if (size > remainingBytes) {
        sources.push({ path, content: null, omission: 'packet-limit' });
        continue;
      }
      remainingBytes -= size;
      const bytes = await readRepositoryFile(root, absolutePath, size, 'reject');
      const content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
      if (bytes.some((byte) => byte < 32 && byte !== 9 && byte !== 10 && byte !== 13))
        throw new Error('Source is not supported text.');
      sources.push({ path, content, omission: null });
    } catch {
      sources.push({ path, content: null, omission: 'source-unavailable' });
    }
  }
  return sources;
};

/**
 * Collects an initialization inventory or one explicitly selected source packet without writing files.
 * @returns Bounded observations; partial output never establishes absence or complete inspection.
 * @throws
 * - Inspection requires an absolute regular repository directory.
 * - Inspection requires known repository-relative source paths.
 * - Inspection source batch exceeds its path limit.
 */
export const collectInitializationInspection = async (
  options: IInitializationInspectionOptions,
): Promise<IInitializationInspection> => {
  if (!isAbsolute(options.repositoryRoot) || !(await lstat(options.repositoryRoot)).isDirectory()) {
    throw new Error('Inspection requires an absolute regular repository directory.');
  }
  const paths = [...new Set(options.paths ?? [])].map(validateSourcePath);
  if (paths.length > LIMITS.sourcePaths)
    throw new Error('Inspection source batch exceeds its path limit.');
  const root = await realpath(options.repositoryRoot);
  const installedRoot = await realpath(options.installedSkillRoot);
  const installedSkill = {
    repositoryPath: isPathWithin(root, installedRoot) ? logicalPath(root, installedRoot) : null,
    ownership: 'installed-distribution' as const,
  };
  if (paths.length > 0) {
    const sources = await inspectSources(root, paths);
    return {
      kind: 'moldea-initialization-inspection',
      mode: 'sources',
      status: sources.every((source) => source.omission === null) ? 'complete' : 'partial',
      installedSkill,
      sources,
    };
  }
  const { inventory, isComplete } = await inspectInventory(root, installedRoot);
  return {
    kind: 'moldea-initialization-inspection',
    mode: 'inventory',
    status: isComplete ? 'complete' : 'partial',
    installedSkill,
    inventory,
  };
};
