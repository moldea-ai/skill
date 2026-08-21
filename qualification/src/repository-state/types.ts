import type { IDirectoryFingerprintEntry } from '../filesystem/index.ts';

// exact Git commit and worktree fingerprint used in attempt provenance
export type IGitRepositoryState = {
  commit: string;
  fingerprint: string;
  isDirty: boolean;
  entries: IDirectoryFingerprintEntry[];
};

export type IGitRepositoryStateOptions = {
  excludedRelativePathPrefixes?: readonly string[];
  includedRelativePathPrefixes?: readonly string[];
};
