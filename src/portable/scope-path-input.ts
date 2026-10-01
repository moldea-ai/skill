const MAXIMUM_PATH_INPUT_BYTES = 2_097_152;
const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/**
 * Adds the repository-logical prefix without interpreting filesystem paths or changing segments.
 * @throws
 * - Invalid scope path input.
 */
export const normalizeScopePath = (path: string): string => {
  if (
    path.length === 0 ||
    path.includes('\0') ||
    /^[A-Za-z]:/u.test(path) ||
    path.startsWith('\\\\')
  ) {
    throw new Error('Invalid scope path input.');
  }
  return path.startsWith('/') ? path : `/${path}`;
};

/**
 * Reads and normalizes one bounded NUL-delimited UTF-8 batch for the gate or launcher.
 * @returns The paths in their original order, with repository-logical prefixes.
 * @throws
 * - Invalid scope path input.
 * - Scope path input exceeds its byte limit.
 */
export const readScopePathInput = async (
  inputStream: AsyncIterable<Buffer | string>,
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

  return text.split('\0').map(normalizeScopePath);
};
