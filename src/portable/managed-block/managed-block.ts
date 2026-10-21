import { lstat } from 'node:fs/promises';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { getErrorCode } from 'jg-exception';
import { ERRORS as FS_ERRORS, readBoundedFile, writeFileAtomicIfUnchanged } from 'jg-fs';
import { ERRORS as UTILITY_ERRORS, findMarkedRegion, upsertMarkedRegion } from 'jg-utilities';

import type { IManagedFileName, IManagedWriteTargetResolver } from './types.ts';

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const MAX_MANAGED_BLOCK_BYTES = 4 * 1024;
const START_MARKER = '<!-- moldea:start -->';
const END_MARKER = '<!-- moldea:end -->';
const MARKERS = { start: START_MARKER, end: END_MARKER };

/** Decodes strict UTF-8, keeping a byte order mark so encoding the text gives the same bytes. */
const decodeUtf8 = (bytes: Uint8Array, description: string): string => {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    throw new Error(`${description} is not valid UTF-8`);
  }
};

/**
 * Decodes one bounded document for its managed region.
 * @throws
 * - The document is not a Buffer, exceeds its byte limit, or is not valid UTF-8.
 */
const decodeDocument = (documentBytes: unknown, fileName: IManagedFileName): string => {
  if (!Buffer.isBuffer(documentBytes)) {
    throw new TypeError(
      `${fileName === 'README.md' ? 'README' : fileName} content must be a Buffer`,
    );
  }

  if (documentBytes.length > MAX_DOCUMENT_BYTES) {
    throw new Error(`${fileName} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
  }

  return decodeUtf8(documentBytes, fileName);
};

/**
 * Runs one marked-region operation, naming the document when its markers are invalid.
 * @throws
 * - The document does not hold exactly one ordered moldea marker pair on their own lines.
 */
const withDocumentMarkers = <TResult>(
  fileName: IManagedFileName,
  operation: () => TResult,
): TResult => {
  try {
    return operation();
  } catch (error) {
    if (getErrorCode(error) !== UTILITY_ERRORS.INVALID_MARKED_REGION) throw error;
    throw new Error(
      `${fileName} must contain exactly one moldea marker pair, each marker on its own line and the start marker first`,
      { cause: error },
    );
  }
};

/**
 * Validates the authored canonical block before it is generated or written.
 * @param {string} block The canonical block text.
 */
export const assertManagedBlock: (
  block: unknown,
  description?: string,
  requiresBlankLine?: boolean,
) => asserts block is string = (block, description = 'README', requiresBlankLine = true) => {
  if (typeof block !== 'string') {
    throw new TypeError(`The canonical managed ${description} block must be a string`);
  }

  const blockBytes = Buffer.from(block, 'utf8');

  if (blockBytes.length > MAX_MANAGED_BLOCK_BYTES) {
    throw new Error(
      `The canonical managed ${description} block exceeds the ${MAX_MANAGED_BLOCK_BYTES}-byte limit`,
    );
  }

  if (block.includes('\r') || !block.endsWith('\n') || block.endsWith('\n\n')) {
    throw new Error(
      `The canonical managed ${description} block must use LF and end with exactly one newline`,
    );
  }

  const lines = block.slice(0, -1).split('\n');

  if (
    lines.length < (requiresBlankLine ? 4 : 3) ||
    lines[0] !== START_MARKER ||
    (requiresBlankLine && lines[1] !== '') ||
    lines.at(-1) !== END_MARKER ||
    lines.filter((line) => line === START_MARKER).length !== 1 ||
    lines.filter((line) => line === END_MARKER).length !== 1
  ) {
    throw new Error(
      `The canonical managed ${description} block must contain one ordered marker pair${requiresBlankLine ? ' and a blank line after the opening marker' : ''}`,
    );
  }
};

/**
 * Returns whether document bytes contain exactly the canonical logical region.
 * @param {Buffer} documentBytes The bounded document bytes.
 * @param {string} block The canonical block text.
 * @returns {boolean} Whether the canonical region is present.
 */
export const hasManagedBlock = (
  documentBytes: Buffer,
  block: string,
  fileName: IManagedFileName = 'README.md',
): boolean => {
  try {
    assertManagedBlock(
      block,
      fileName === 'README.md' ? 'README' : fileName,
      fileName === 'README.md',
    );
    const text = decodeDocument(documentBytes, fileName);
    const region = findMarkedRegion(text, MARKERS);

    return (
      region !== null &&
      text.slice(region.start, region.end) === block.replaceAll('\n', region.lineEnding)
    );
  } catch {
    return false;
  }
};

/**
 * Produces the exact updated document bytes without touching the filesystem.
 * @param {Buffer} documentBytes The existing bounded README bytes.
 * @param {string} block The canonical block text.
 * @returns {Buffer} The complete updated document bytes.
 */
export const createManagedBlockBytes = (
  documentBytes: Buffer,
  block: string,
  fileName: IManagedFileName = 'README.md',
): Buffer => {
  assertManagedBlock(
    block,
    fileName === 'README.md' ? 'README' : fileName,
    fileName === 'README.md',
  );
  const text = decodeDocument(documentBytes, fileName);
  const updatedBytes = Buffer.from(
    withDocumentMarkers(fileName, () => upsertMarkedRegion(text, block, MARKERS)),
    'utf8',
  );

  if (updatedBytes.length > MAX_DOCUMENT_BYTES) {
    throw new Error(`Updated ${fileName} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
  }

  return updatedBytes;
};

/**
 * Reads a bounded regular document without following a linked target.
 * @throws
 * - NON_EXISTENT_FILE: if the path doesn't exist
 * - The document must be a regular file within its byte limit.
 */
export const readManagedFile = async (filePath: string): Promise<Buffer> => {
  try {
    return await readBoundedFile(filePath, MAX_DOCUMENT_BYTES);
  } catch (error) {
    if (getErrorCode(error) === FS_ERRORS.NOT_A_FILE)
      throw new Error(`${basename(filePath)} must be a regular file`, { cause: error });
    if (getErrorCode(error) === FS_ERRORS.FILE_TOO_LARGE)
      throw new Error(`${basename(filePath)} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`, {
        cause: error,
      });
    throw error;
  }
};

/**
 * Replaces a bounded regular document atomically, after confirming it still holds what was read,
 * or is still absent.
 * @throws
 * - The document changed before replacement.
 */
export const writeManagedFileAtomically = async (
  filePath: string,
  bytes: Buffer,
  expected: Buffer | null,
): Promise<void> => {
  try {
    await writeFileAtomicIfUnchanged(filePath, bytes, expected);
  } catch (error) {
    if (getErrorCode(error) !== FS_ERRORS.FILE_CHANGED) throw error;
    throw new Error(`${basename(filePath)} changed before replacement`, { cause: error });
  }
};

/**
 * Creates or normalizes a root managed region atomically. Without a write-target resolver the
 * document must be a regular file; with one, such as AGENTS.md's link resolution, the region is
 * written to the host file it selects, which is then confirmed.
 * @param {string} repositoryRoot The normalized absolute repository root.
 * @param {string} block The canonical block text.
 * @returns {Promise<'created' | 'updated' | 'unchanged'>} The completed write status.
 */
export const updateManagedFile = async (
  repositoryRoot: string,
  block: string,
  fileName: IManagedFileName = 'README.md',
  resolveWriteTarget?: IManagedWriteTargetResolver,
): Promise<'created' | 'unchanged' | 'updated'> => {
  if (
    typeof repositoryRoot !== 'string' ||
    !isAbsolute(repositoryRoot) ||
    resolve(repositoryRoot) !== repositoryRoot
  ) {
    throw new Error('The repository root must be a normalized absolute path');
  }

  const rootStats = await lstat(repositoryRoot);

  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error('The repository root must be a regular directory');
  }

  assertManagedBlock(
    block,
    fileName === 'README.md' ? 'README' : fileName,
    fileName === 'README.md',
  );
  const target = await resolveWriteTarget?.();
  const targetPath = target?.hostPath ?? join(repositoryRoot, fileName);
  let expected: Buffer | null = null;

  try {
    expected = await readManagedFile(targetPath);
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }

  const currentBytes = expected ?? Buffer.alloc(0);
  const updatedBytes = createManagedBlockBytes(currentBytes, block, fileName);

  if (currentBytes.equals(updatedBytes)) {
    return 'unchanged';
  }

  await writeManagedFileAtomically(targetPath, updatedBytes, expected);
  await target?.confirm();
  return expected === null ? 'created' : 'updated';
};

/** Returns whether a managed-file read reports an absent path. */
export const isMissingFile = (error: unknown): boolean =>
  getErrorCode(error) === FS_ERRORS.NON_EXISTENT_FILE;
