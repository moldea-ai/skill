/*
 * Git LFS filter settings every helper read runs with, set through GIT_CONFIG_COUNT so they apply
 * whatever a config file says: no LFS program runs, and a required LFS filter can't fail a read.
 */
export const GIT_LFS_FILTER_CONFIGURATIONS = [
  ['filter.lfs.clean', ''],
  ['filter.lfs.process', ''],
  ['filter.lfs.required', 'false'],
  ['filter.lfs.smudge', ''],
] as const;

// the working-directory length from which Git for Windows can't start
export const WINDOWS_MAX_GIT_DIRECTORY_LENGTH = 260;
