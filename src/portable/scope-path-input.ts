import { posix, win32 } from 'node:path';
import { hasErrorCode } from 'jg-exception';
import { ERRORS as PROCESS_ERRORS, readStdin } from 'jg-process';

const MAXIMUM_PATH_INPUT_BYTES = 2_097_152;
const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

// verified native repository roots, including a caller's directory-link spelling
export interface IScopePathContext {
  repositoryRoot: string;
  resolvedRepositoryRoot: string;
}

/**
 * Converts supported task-path spellings using verified roots without reading target files.
 * @throws
 * - Invalid scope path input.
 */
export const normalizeScopePath = (path: string, context: IScopePathContext): string => {
  const usesWindowsPaths = /^[A-Za-z]:[\\/]|^\\\\/u.test(context.resolvedRepositoryRoot);
  if (usesWindowsPaths) path = path.replaceAll('\\', '/');
  const isDriveAbsolute = /^[A-Za-z]:[\\/]/u.test(path);
  const normalizedPath = path.replace(/^(?:\.\/)+/u, '');
  const segments = normalizedPath.split(isDriveAbsolute ? /[\\/]/u : '/');
  if (
    normalizedPath.length === 0 ||
    path.includes('\0') ||
    (path.startsWith('./') && normalizedPath.startsWith('/')) ||
    normalizedPath.startsWith('//') ||
    (!isDriveAbsolute && (normalizedPath.includes('\\') || /^[A-Za-z]:/u.test(normalizedPath))) ||
    segments.some(
      (segment, index) =>
        segment === '.' ||
        segment === '..' ||
        (segment === '' && !(index === 0 && normalizedPath.startsWith('/'))),
    )
  ) {
    throw new Error('Invalid scope path input.');
  }

  if (isDriveAbsolute && !usesWindowsPaths) throw new Error('Invalid scope path input.');
  const pathApi = usesWindowsPaths ? win32 : posix;
  if (isDriveAbsolute || (!usesWindowsPaths && normalizedPath.startsWith('/'))) {
    for (const root of [context.repositoryRoot, context.resolvedRepositoryRoot]) {
      const relativePath = pathApi.relative(root, normalizedPath);
      if (relativePath === '') throw new Error('Invalid scope path input.');
      if (
        !pathApi.isAbsolute(relativePath) &&
        relativePath !== '..' &&
        !relativePath.startsWith(`..${pathApi.sep}`)
      ) {
        return `/${relativePath.split(pathApi.sep).join('/')}`;
      }
    }
    if (isDriveAbsolute) throw new Error('Invalid scope path input.');
  }
  return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
};

/**
 * Decodes and normalizes one complete NUL-delimited UTF-8 batch.
 * @returns Repository-logical paths in their original order, including duplicates.
 * @throws
 * - Invalid scope path input.
 */
const parseScopePathInput = (input: Buffer, context: IScopePathContext): string[] => {
  if (input.byteLength === 0 || input.at(-1) !== 0) {
    throw new Error('Invalid scope path input.');
  }
  let text: string;
  try {
    text = utf8Decoder.decode(input.subarray(0, -1));
  } catch (error) {
    throw new Error('Invalid scope path input.', { cause: error });
  }

  return text.split('\0').map((path) => normalizeScopePath(path, context));
};

/**
 * Reads and normalizes one bounded NUL-delimited UTF-8 batch from stdin for the gate.
 * @returns A promise that resolves to repository-logical paths in their original order,
 * including duplicates.
 * @throws
 * - Invalid scope path input.
 * - Scope path input exceeds its byte limit.
 */
export const readScopePathInput = async (context: IScopePathContext): Promise<string[]> => {
  let input: Buffer;
  try {
    input = await readStdin({ maxBytes: MAXIMUM_PATH_INPUT_BYTES });
  } catch (error) {
    if (!hasErrorCode(error, PROCESS_ERRORS.STDIN_TOO_LARGE)) throw error;
    throw new Error('Scope path input exceeds its byte limit.', { cause: error });
  }
  return parseScopePathInput(input, context);
};

/**
 * Normalizes an argv batch using the same pre-normalization byte allowance as stdin.
 * @throws
 * - Invalid scope path input.
 * - Scope path input exceeds its byte limit.
 */
export const normalizeScopePathArguments = (
  paths: string[],
  context: IScopePathContext,
): string[] => {
  if (paths.length === 0) throw new Error('Invalid scope path input.');
  let byteLength = 0;
  return paths.map((path) => {
    byteLength += Buffer.byteLength(path, 'utf8') + 1;
    if (byteLength > MAXIMUM_PATH_INPUT_BYTES)
      throw new Error('Scope path input exceeds its byte limit.');
    return normalizeScopePath(path, context);
  });
};
