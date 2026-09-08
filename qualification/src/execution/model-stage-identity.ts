import { calculateSha256 } from '../filesystem/index.ts';

type ICanonicalJson =
  null | boolean | number | string | ICanonicalJson[] | { [key: string]: ICanonicalJson };

const canonicalize = (input: unknown): ICanonicalJson => {
  if (
    input === null ||
    typeof input === 'boolean' ||
    typeof input === 'number' ||
    typeof input === 'string'
  ) {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(canonicalize);
  }
  if (typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input as Readonly<Record<string, unknown>>)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, value]) => [key, canonicalize(value)]),
    );
  }
  throw new TypeError('Model-stage identity input must be JSON-compatible.');
};

/** Calculates an exact order-stable model-stage identity. */
export const calculateModelStageIdentity = (input: unknown): string =>
  calculateSha256(`${JSON.stringify(canonicalize(input))}\n`);
