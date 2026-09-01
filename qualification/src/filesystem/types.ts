import type { ZodType } from 'zod';

// recursive discovery options applied in addition to the mandatory archive exclusions
export type IDirectoryTraversalOptions = {
  excludedDirectoryNames?: ReadonlySet<string>;
  excludedRelativePathPrefixes?: readonly string[];
  overwrite?: boolean;
};

// schema boundary accepted by JSON and YAML readers
export type IBoundarySchema<TResult> = ZodType<TResult>;

// stable content record used to calculate directory fingerprints
export type IDirectoryFingerprintEntry = {
  path: string;
  kind: 'file' | 'symlink';
  mode: number;
  sha256: string;
};
