import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, open, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import type { IManagedFileName } from './types.ts';

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const MAX_MANAGED_BLOCK_BYTES = 4 * 1024;
const START_MARKER = '<!-- moldea:start -->';
const END_MARKER = '<!-- moldea:end -->';
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const START_MARKER_BYTES = Buffer.from(START_MARKER, 'ascii');
const END_MARKER_BYTES = Buffer.from(END_MARKER, 'ascii');
const LF_BYTES = Buffer.from('\n', 'ascii');
const CRLF_BYTES = Buffer.from('\r\n', 'ascii');

interface IManagedRegion {
  lineEnding: Buffer;
  regionEnd: number;
  regionStart: number;
}

interface IMarkerLine {
  kind: 'end' | 'start';
  markerStart: number;
}

const decodeUtf8 = (bytes: Uint8Array, description: string): string => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${description} is not valid UTF-8`);
  }
};

const isEqualBytes = (left: Buffer, right: Buffer): boolean =>
  left.length === right.length && left.equals(right);

const isUtf8Bom = (bytes: Buffer): boolean =>
  bytes.length === UTF8_BOM.length && isEqualBytes(bytes, UTF8_BOM);

const hasUtf8Bom = (bytes: Buffer): boolean =>
  bytes.length >= UTF8_BOM.length && isEqualBytes(bytes.subarray(0, UTF8_BOM.length), UTF8_BOM);

const renderBlock = (block: string, lineEndingBytes: Buffer): Buffer =>
  Buffer.from(block.replaceAll('\n', lineEndingBytes === CRLF_BYTES ? '\r\n' : '\n'), 'utf8');

const parseMarkerLine = (
  lineBytes: Buffer,
  lineStart: number,
  isFirstLine: boolean,
): IMarkerLine | undefined => {
  const contentBytes =
    isFirstLine && hasUtf8Bom(lineBytes) ? lineBytes.subarray(UTF8_BOM.length) : lineBytes;
  const markerOffset = lineBytes.length - contentBytes.length;
  const containsStartMarker = contentBytes.indexOf(START_MARKER_BYTES) !== -1;
  const containsEndMarker = contentBytes.indexOf(END_MARKER_BYTES) !== -1;

  if (containsStartMarker && !isEqualBytes(contentBytes, START_MARKER_BYTES)) {
    throw new Error('The moldea start marker must occupy its complete line');
  }

  if (containsEndMarker && !isEqualBytes(contentBytes, END_MARKER_BYTES)) {
    throw new Error('The moldea end marker must occupy its complete line');
  }

  if (containsStartMarker && containsEndMarker) {
    throw new Error('The moldea markers must occupy separate lines');
  }

  if (containsStartMarker) {
    return { kind: 'start', markerStart: lineStart + markerOffset };
  }

  if (containsEndMarker) {
    return { kind: 'end', markerStart: lineStart + markerOffset };
  }

  return undefined;
};

const parseManagedRegion = (
  documentBytes: unknown,
  fileName: IManagedFileName,
): IManagedRegion | undefined => {
  if (!Buffer.isBuffer(documentBytes)) {
    throw new TypeError(
      `${fileName === 'README.md' ? 'README' : fileName} content must be a Buffer`,
    );
  }

  if (documentBytes.length > MAX_DOCUMENT_BYTES) {
    throw new Error(`${fileName} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
  }

  decodeUtf8(documentBytes, fileName);

  const starts: Array<{ lineEnding: Buffer; markerStart: number }> = [];
  const ends: Array<{ lineEnd: number; markerStart: number }> = [];
  let lineStart = 0;
  let isFirstLine = true;

  while (lineStart < documentBytes.length) {
    const newlineIndex = documentBytes.indexOf(0x0a, lineStart);
    const lineEnd = newlineIndex === -1 ? documentBytes.length : newlineIndex + 1;
    const contentEnd =
      newlineIndex !== -1 && documentBytes[newlineIndex - 1] === 0x0d
        ? newlineIndex - 1
        : newlineIndex === -1
          ? documentBytes.length
          : newlineIndex;
    const marker = parseMarkerLine(
      documentBytes.subarray(lineStart, contentEnd),
      lineStart,
      isFirstLine,
    );

    if (marker?.kind === 'start') {
      starts.push({
        markerStart: marker.markerStart,
        lineEnding:
          newlineIndex === -1 ? Buffer.alloc(0) : documentBytes.subarray(contentEnd, lineEnd),
      });
    } else if (marker?.kind === 'end') {
      ends.push({ markerStart: marker.markerStart, lineEnd });
    }

    lineStart = lineEnd;
    isFirstLine = false;
  }

  if (starts.length === 0 && ends.length === 0) {
    return undefined;
  }

  if (starts.length !== 1 || ends.length !== 1) {
    throw new Error(`${fileName} must contain exactly one moldea marker pair`);
  }

  const start = starts[0]!;
  const end = ends[0]!;

  if (start.markerStart >= end.markerStart) {
    throw new Error('The moldea markers are reversed');
  }

  if (start.lineEnding.length === 0) {
    throw new Error('The moldea start marker must end with a line ending');
  }

  return {
    regionStart: start.markerStart,
    regionEnd: end.lineEnd,
    lineEnding: isEqualBytes(start.lineEnding, CRLF_BYTES) ? CRLF_BYTES : LF_BYTES,
  };
};

const getAppendLineEnding = (documentBytes: Buffer): Buffer => {
  let newlineCount = 0;
  let crlfCount = 0;

  for (let index = 0; index < documentBytes.length; index += 1) {
    if (documentBytes[index] === 0x0a) {
      newlineCount += 1;

      if (index > 0 && documentBytes[index - 1] === 0x0d) {
        crlfCount += 1;
      }
    }
  }

  return newlineCount > 0 && newlineCount === crlfCount ? CRLF_BYTES : LF_BYTES;
};

const getAppendSeparator = (documentBytes: Buffer, lineEndingBytes: Buffer): Buffer => {
  if (documentBytes.length === 0 || isUtf8Bom(documentBytes)) {
    return Buffer.alloc(0);
  }

  return Buffer.concat([
    documentBytes[documentBytes.length - 1] === 0x0a ? Buffer.alloc(0) : lineEndingBytes,
    lineEndingBytes,
  ]);
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
    const region = parseManagedRegion(documentBytes, fileName);

    if (region === undefined) {
      return false;
    }

    const expectedBytes = renderBlock(block, region.lineEnding);

    return isEqualBytes(
      documentBytes.subarray(region.regionStart, region.regionEnd),
      expectedBytes,
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
  const region = parseManagedRegion(documentBytes, fileName);

  if (region !== undefined) {
    const updatedBytes = Buffer.concat([
      documentBytes.subarray(0, region.regionStart),
      renderBlock(block, region.lineEnding),
      documentBytes.subarray(region.regionEnd),
    ]);

    if (updatedBytes.length > MAX_DOCUMENT_BYTES) {
      throw new Error(`Updated ${fileName} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
    }

    return updatedBytes;
  }

  const lineEnding = getAppendLineEnding(documentBytes);
  const updatedBytes = Buffer.concat([
    documentBytes,
    getAppendSeparator(documentBytes, lineEnding),
    renderBlock(block, lineEnding),
  ]);

  if (updatedBytes.length > MAX_DOCUMENT_BYTES) {
    throw new Error(`Updated ${fileName} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
  }

  return updatedBytes;
};

/** Reads a bounded regular document without following a linked target. */
export const readManagedFile = async (
  filePath: string,
): Promise<{ bytes: Buffer; mode: number; dev: number; ino: number }> => {
  const pathStats = await lstat(filePath);

  if (!pathStats.isFile()) {
    throw new Error(`${basename(filePath)} must be a regular file`);
  }

  if (pathStats.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`${basename(filePath)} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
  }

  const fileHandle = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));

  try {
    const openStats = await fileHandle.stat();

    if (!openStats.isFile() || openStats.dev !== pathStats.dev || openStats.ino !== pathStats.ino) {
      throw new Error(`${basename(filePath)} changed while it was being opened`);
    }

    const boundedBytes = Buffer.allocUnsafe(MAX_DOCUMENT_BYTES + 1);
    let bytesRead = 0;

    while (bytesRead < boundedBytes.length) {
      const result = await fileHandle.read(
        boundedBytes,
        bytesRead,
        boundedBytes.length - bytesRead,
        null,
      );

      if (result.bytesRead === 0) {
        break;
      }

      bytesRead += result.bytesRead;
    }

    if (bytesRead > MAX_DOCUMENT_BYTES) {
      throw new Error(`${basename(filePath)} exceeds the ${MAX_DOCUMENT_BYTES}-byte limit`);
    }

    return {
      bytes: Buffer.from(boundedBytes.subarray(0, bytesRead)),
      mode: pathStats.mode & 0o7777,
      dev: pathStats.dev,
      ino: pathStats.ino,
    };
  } finally {
    await fileHandle.close();
  }
};

const writeAtomically = async (
  filePath: string,
  bytes: Buffer,
  mode: number,
  expected: Awaited<ReturnType<typeof readManagedFile>> | undefined,
): Promise<void> => {
  const temporaryPath = join(
    dirname(filePath),
    `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );

  try {
    await writeFile(temporaryPath, bytes, { flag: 'wx', mode });
    await chmod(temporaryPath, mode);
    let observed: Awaited<ReturnType<typeof readManagedFile>> | undefined;
    try {
      observed = await readManagedFile(filePath);
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
    if (
      expected === undefined
        ? observed !== undefined
        : observed === undefined ||
          observed.dev !== expected.dev ||
          observed.ino !== expected.ino ||
          observed.mode !== expected.mode ||
          !observed.bytes.equals(expected.bytes)
    ) {
      throw new Error(`${basename(filePath)} changed before replacement`);
    }
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};

/**
 * Creates or normalizes a root managed region atomically.
 * @param {string} repositoryRoot The normalized absolute repository root.
 * @param {string} block The canonical block text.
 * @returns {Promise<'created' | 'updated' | 'unchanged'>} The completed write status.
 */
export const updateManagedFile = async (
  repositoryRoot: string,
  block: string,
  fileName: IManagedFileName = 'README.md',
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
  const targetPath = join(repositoryRoot, fileName);
  let currentBytes: Buffer<ArrayBufferLike> = Buffer.alloc(0);
  let currentMode = 0o644;
  let status: 'created' | 'updated' = 'created';
  let expected: Awaited<ReturnType<typeof readManagedFile>> | undefined;

  try {
    const currentFile = await readManagedFile(targetPath);
    expected = currentFile;
    currentBytes = currentFile.bytes;
    currentMode = currentFile.mode;
    status = 'updated';
  } catch (error) {
    if (
      error === null ||
      typeof error !== 'object' ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  const updatedBytes = createManagedBlockBytes(currentBytes, block, fileName);

  if (isEqualBytes(currentBytes, updatedBytes)) {
    return 'unchanged';
  }

  await writeAtomically(targetPath, updatedBytes, currentMode, expected);
  return status;
};

/** Returns whether a filesystem operation reports an absent path. */
export const isMissingFile = (error: unknown): boolean =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
