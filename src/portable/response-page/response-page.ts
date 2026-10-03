import { lstat, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { writeBufferFileAtomically } from '../../filesystem/atomic-bytes/index.ts';

import { isPathWithin, readRepositoryFile } from '../repository-files.ts';

import { ResponsePageSchema, type IResponseFiles, type IResponseIdentity } from './types.ts';

const MAXIMUM_RESPONSE_BYTES = 1_048_576;
const MAXIMUM_CURSOR_BYTES = 8_192;

/** Validates one bounded raw page without transforming its opaque cursor. */
export const parseResponsePage = (bytes: Uint8Array, identity: IResponseIdentity) => {
  if (bytes.byteLength > MAXIMUM_RESPONSE_BYTES) {
    throw new Error('Saved moldea response exceeds the 1 MiB page limit.');
  }
  const page = ResponsePageSchema.parse(
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown,
  );
  if (page.command !== identity.command || page.cliVersion !== identity.cliVersion) {
    throw new Error('Saved moldea response does not match this command and installed CLI version.');
  }
  const cursor = page.command === 'content' ? page.result.cursor : page.result.page?.cursor;
  if (
    cursor === undefined ||
    (cursor !== null && Buffer.byteLength(cursor) > MAXIMUM_CURSOR_BYTES)
  ) {
    throw new Error('Saved moldea response has no supported continuation cursor.');
  }
  return { status: page.status, cursor };
};

/** Requires an existing private scratch directory with no linked components below the temp root. */
const resolveResponsePath = async (filePath: string, repositoryRoot: string): Promise<string> => {
  const temporaryRoot = await realpath(tmpdir());
  const hostTemporaryRoot = resolve(tmpdir());
  const requestedPath = resolve(filePath);
  const resolvedPath = isPathWithin(hostTemporaryRoot, requestedPath)
    ? join(temporaryRoot, relative(hostTemporaryRoot, requestedPath))
    : requestedPath;
  const fileName = basename(resolvedPath);
  if (
    !isAbsolute(filePath) ||
    !isPathWithin(temporaryRoot, resolvedPath) ||
    isPathWithin(repositoryRoot, resolvedPath) ||
    dirname(resolvedPath) === temporaryRoot ||
    !/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(fileName) ||
    fileName.endsWith('.') ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(fileName)
  ) {
    throw new Error(
      'Response files require an absolute portable path in private temporary storage outside the repository.',
    );
  }
  let directory = temporaryRoot;
  for (const component of relative(temporaryRoot, dirname(resolvedPath)).split(sep)) {
    directory = join(directory, component);
    if (!(await lstat(directory)).isDirectory()) {
      throw new Error('Response directories must exist and must not be links.');
    }
  }
  const parent = await lstat(dirname(resolvedPath));
  if (
    process.platform !== 'win32' &&
    ((parent.mode & 0o077) !== 0 || parent.uid !== process.getuid?.())
  ) {
    throw new Error('Response files require a task-owned private temporary directory.');
  }
  const target = await readOptionalFileStat(resolvedPath);
  if (target !== undefined && !target.isFile()) {
    throw new Error('Response files must be regular files, never links.');
  }
  return resolvedPath;
};

/**
 * Resolves explicit scratch files and reads exactly one saved continuation before child execution.
 * @returns A promise resolving to checked paths and the unchanged cursor, when requested.
 */
export const prepareResponseFiles = async (
  repositoryRoot: string,
  identity: IResponseIdentity,
  cursorPath?: string,
  savePath?: string,
): Promise<IResponseFiles> => {
  const files: IResponseFiles = {};
  if (cursorPath !== undefined) {
    files.checkpointPath = await resolveResponsePath(cursorPath, repositoryRoot);
    const page = parseResponsePage(
      await readRepositoryFile(
        await realpath(tmpdir()),
        files.checkpointPath,
        MAXIMUM_RESPONSE_BYTES,
        'reject',
      ),
      identity,
    );
    if (page.cursor === null) {
      throw new Error('Saved moldea response is the final page; no continuation is available.');
    }
    files.cursor = page.cursor;
  }
  if (savePath !== undefined) {
    files.savePath = await resolveResponsePath(savePath, repositoryRoot);
    if (files.savePath !== files.checkpointPath) {
      const exists = await readOptionalFileStat(files.savePath);
      if (exists !== undefined)
        throw new Error('A new response capture must not replace an existing file.');
    }
  }
  return files;
};

/**
 * Captures only a complete valid/invalid page without replacing a checkpoint on input failure.
 * @returns A promise resolving after eligible capture, or without a write for child errors.
 */
export const saveResponsePage = async (
  files: IResponseFiles,
  repositoryRoot: string,
  bytes: Uint8Array,
  identity: IResponseIdentity,
  exitCode: number | null,
  signal: AbortSignal,
): Promise<void> => {
  if (files.savePath === undefined || (exitCode !== 0 && exitCode !== 1)) return;
  const page = parseResponsePage(bytes, identity);
  if ((page.status === 'valid' ? 0 : 1) !== exitCode) {
    throw new Error('Moldea response status contradicts the child exit code.');
  }
  // recheck immediately before staging; the private directory belongs to this task
  const checked = await prepareCapturePath(files.savePath, files.checkpointPath, repositoryRoot);
  await writeBufferFileAtomically(checked, bytes, signal);
};

const prepareCapturePath = async (
  requestedPath: string,
  checkpointPath: string | undefined,
  repositoryRoot: string,
): Promise<string> => {
  const savePath = await resolveResponsePath(requestedPath, repositoryRoot);
  if (savePath !== checkpointPath) {
    const target = await readOptionalFileStat(savePath);
    if (target !== undefined)
      throw new Error('A new response capture must not replace an existing file.');
  }
  return savePath;
};

const readOptionalFileStat = async (filePath: string) =>
  lstat(filePath).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw error;
  });
