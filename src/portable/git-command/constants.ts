/*
 * Fixed helper-read settings override repository config: no diff index refresh or LFS program,
 * and a required LFS filter can't fail a read.
 */
export const GIT_READ_CONFIGURATIONS = [
  ['diff.autoRefreshIndex', 'false'],
  ['filter.lfs.clean', ''],
  ['filter.lfs.process', ''],
  ['filter.lfs.required', 'false'],
  ['filter.lfs.smudge', ''],
] as const;

// the working-directory length from which Git for Windows can't start
export const WINDOWS_MAX_GIT_DIRECTORY_LENGTH = 260;
