import { lstat, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { z } from 'zod';

import { writeBufferFileAtomically } from '../../filesystem/atomic-bytes/index.ts';

import { isPathWithin, readRepositoryFile } from '../repository-files.ts';

import {
  InspectionResultSchema,
  ResponsePageSchema,
  ValidationResultSchema,
  type IResponseDiagnostics,
  type IResponseFiles,
  type IResponseIdentity,
  type IResponsePage,
} from './types.ts';

const MAXIMUM_RESPONSE_BYTES = 1_048_576;
const MAXIMUM_CURSOR_BYTES = 8_192;

/** Checks bounded JSON and mechanical invariants without interpreting CLI-owned payloads. */
const parseResponse = (bytes: Uint8Array, identity: IResponseIdentity): IResponsePage => {
  if (bytes.byteLength > MAXIMUM_RESPONSE_BYTES) {
    throw new Error('Moldea response exceeds the 1 MiB page limit.');
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch (cause) {
    throw new Error('Moldea response is not complete UTF-8 JSON.', { cause });
  }
  const parsed = ResponsePageSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new Error('Moldea response does not match the supported envelope contract.');
  }
  const page = parsed.data;
  if (page.command !== identity.command || page.cliVersion !== identity.cliVersion) {
    throw new Error('Moldea response does not match this command and installed CLI version.');
  }
  if (page.status === 'error') return page;
  if (page.command === 'composition' && page.status !== 'valid') {
    throw new Error('Moldea composition response must be valid or error.');
  }
  if (page.command === 'validate') {
    const result = ValidationResultSchema.safeParse(page.result);
    if (!result.success) throw new Error('Moldea response has invalid diagnostic totals.');
    verifyDiagnosticTotals(result.data, page.status);
  } else if (page.command === 'inspect') {
    const result = InspectionResultSchema.safeParse(page.result);
    if (!result.success) throw new Error('Moldea response has invalid diagnostic totals.');
    verifyDiagnosticTotals(
      {
        valid: result.data.valid,
        diagnosticCount: result.data.counts.diagnostics,
        errorCount: result.data.counts.errors,
        warningCount: result.data.counts.warnings,
      },
      page.status,
    );
  }
  return page;
};

const verifyDiagnosticTotals = (
  result: IResponseDiagnostics,
  status: 'valid' | 'invalid',
): void => {
  if (
    result.diagnosticCount !== result.errorCount + result.warningCount ||
    result.valid !== (result.errorCount === 0) ||
    result.valid !== (status === 'valid')
  ) {
    throw new Error('Moldea response diagnostic totals contradict its validity or status.');
  }
};

const readContinuationCursor = (page: IResponsePage): string | null => {
  if (page.status === 'error' || page.command === 'composition') {
    throw new Error('Saved moldea response has no supported continuation cursor.');
  }
  const parsed =
    page.command === 'content'
      ? z.string().nullable().safeParse(page.result['cursor'])
      : z.object({ cursor: z.string().nullable() }).safeParse(page.result['page']);
  if (!parsed.success) {
    throw new Error('Saved moldea response has no supported continuation cursor.');
  }
  const cursor =
    typeof parsed.data === 'object' && parsed.data !== null ? parsed.data.cursor : parsed.data;
  if (cursor !== null && Buffer.byteLength(cursor) > MAXIMUM_CURSOR_BYTES) {
    throw new Error('Saved moldea response has no supported continuation cursor.');
  }
  return cursor;
};

/**
 * Validates one bounded saved page without transforming its opaque cursor.
 * @throws
 * - Moldea response exceeds the 1 MiB page limit.
 * - Moldea response is not complete UTF-8 JSON.
 * - Moldea response does not match the supported envelope contract.
 * - Moldea response does not match this command and installed CLI version.
 * - Moldea composition response must be valid or error.
 * - Moldea response has invalid diagnostic totals.
 * - Moldea response diagnostic totals contradict its validity or status.
 * - Saved moldea response has no supported continuation cursor.
 */
export const parseResponsePage = (bytes: Uint8Array, identity: IResponseIdentity) => {
  const page = parseResponse(bytes, identity);
  return { status: page.status, cursor: readContinuationCursor(page) };
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
 * @throws
 * - Response-path or saved-page validation errors, including a final page without continuation.
 * - Native filesystem errors when checking scratch paths or reading saved input.
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
 * Verifies every completed response and optionally captures a valid/invalid continuation page.
 * @returns A promise resolving after verification and eligible capture; errors preserve checkpoints.
 * @throws
 * - Response validation errors documented by parseResponsePage.
 * - Moldea response status contradicts the child exit code.
 * - Response-path validation errors or native filesystem errors during capture and cleanup.
 * - The signal's abort reason when cancelled before rename submission.
 */
export const verifyAndSaveResponse = async (
  files: IResponseFiles,
  repositoryRoot: string,
  bytes: Uint8Array,
  identity: IResponseIdentity,
  exitCode: number | null,
  signal: AbortSignal,
): Promise<void> => {
  signal.throwIfAborted();
  const page = parseResponse(bytes, identity);
  if (
    page.status === 'error'
      ? exitCode !== 2 && exitCode !== 3
      : (page.status === 'valid' ? 0 : 1) !== exitCode
  ) {
    throw new Error('Moldea response status contradicts the child exit code.');
  }
  if (files.savePath === undefined || page.status === 'error') return;
  readContinuationCursor(page);
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
