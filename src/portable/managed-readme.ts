#!/usr/bin/env node

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  assertManagedBlock,
  createManagedBlockBytes,
  hasManagedBlock,
  updateManagedFile,
} from './managed-block/index.ts';

const DEFAULT_MANAGED_README_BLOCK = '__MOLDEA_MANAGED_README_BLOCK_JSON__';

/** Validates the authored README block before generation or writing. */
export const assertCanonicalManagedReadmeBlock: (block: unknown) => asserts block is string = (
  block,
) => assertManagedBlock(block);

/** Returns whether the complete canonical README region is present. */
export const hasCanonicalManagedReadmeBlock = (
  bytes: Buffer,
  block = DEFAULT_MANAGED_README_BLOCK,
): boolean => hasManagedBlock(bytes, block);

/** Produces updated README bytes while preserving everything outside the region. */
export const createManagedReadmeBytes = (
  bytes: Buffer,
  block = DEFAULT_MANAGED_README_BLOCK,
): Buffer => createManagedBlockBytes(bytes, block);

/** Atomically creates or updates the root README managed region. */
export const updateManagedReadme = (
  repositoryRoot: string,
  block = DEFAULT_MANAGED_README_BLOCK,
): Promise<'created' | 'unchanged' | 'updated'> => updateManagedFile(repositoryRoot, block);

const parseArguments = (argumentsList: readonly string[]): string => {
  if (
    argumentsList.length !== 2 ||
    argumentsList[0] !== '--repository' ||
    typeof argumentsList[1] !== 'string'
  ) {
    throw new Error('Usage: managed-readme.mjs --repository <normalized-absolute-root>');
  }

  return argumentsList[1];
};

const isDirectExecution =
  process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  try {
    const repositoryRoot = parseArguments(process.argv.slice(2));
    const status = await updateManagedReadme(repositoryRoot);
    process.stdout.write(`${status}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown failure';
    process.stderr.write(`managed README update failed: ${message}\n`);
    process.exitCode = 1;
  }
}
