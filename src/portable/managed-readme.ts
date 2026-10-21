#!/usr/bin/env node

import { hasErrorCode } from 'jg-exception';
import { ERRORS as PROCESS_ERRORS, isMainModule, parseStrictArgs } from 'jg-process';

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
  try {
    return parseStrictArgs(argumentsList, { repository: { type: 'string', required: true } })
      .repository;
  } catch (error) {
    if (!hasErrorCode(error, PROCESS_ERRORS.INVALID_ARGUMENTS)) throw error;
    throw new Error('Usage: managed-readme.mjs --repository <normalized-absolute-root>', {
      cause: error,
    });
  }
};

if (isMainModule(import.meta.url)) {
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
