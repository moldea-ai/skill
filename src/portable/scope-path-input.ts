import { posix, win32 } from 'node:path';

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

  const usesWindowsPaths = /^[A-Za-z]:[\\/]|^\\\\/u.test(context.resolvedRepositoryRoot);
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
 * Reads and normalizes one bounded NUL-delimited UTF-8 batch for the gate or launcher.
 * @returns Repository-logical paths in their original order, including duplicates.
 * @throws
 * - Invalid scope path input.
 * - Scope path input exceeds its byte limit.
 */
export const readScopePathInput = async (
  inputStream: AsyncIterable<Buffer | string>,
  context: IScopePathContext,
): Promise<string[]> => {
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of inputStream) {
    const inputChunk = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    byteLength += inputChunk.byteLength;
    if (byteLength > MAXIMUM_PATH_INPUT_BYTES) {
      throw new Error('Scope path input exceeds its byte limit.');
    }
    chunks.push(inputChunk);
  }

  const input = Buffer.concat(chunks, byteLength);
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
