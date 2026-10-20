// fixed read-only Git configuration shared by the helpers and the evaluation boundary
export const HARDENED_GIT_CONFIGURATIONS = [
  'core.attributesFile=/dev/null',
  // empty disables the monitor on every supported Git; before Git 2.36, false names a hook
  'core.fsmonitor=',
  'core.pager=cat',
  'filter.lfs.clean=',
  'filter.lfs.process=',
  'filter.lfs.required=false',
  'filter.lfs.smudge=',
] as const;

// extra configuration for diff reads, so no external diff program runs
export const HARDENED_GIT_DIFF_CONFIGURATION = 'diff.external=';

// inherited variables that could redirect the repository, its objects, or its pathspec rules
export const REMOVED_GIT_ENVIRONMENT_NAMES = [
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_COMMON_DIR',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_ATTR_SOURCE',
  'GIT_CONFIG',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_GLOB_PATHSPECS',
  'GIT_NOGLOB_PATHSPECS',
  'GIT_ICASE_PATHSPECS',
] as const;

/*
 * Variables the CLI also removes before it runs Git. The `cli` scope removes them too, so system,
 * global and repository config files apply to the writer exactly as they apply to validation.
 */
export const CLI_REMOVED_GIT_ENVIRONMENT_NAMES = [
  'GIT_CEILING_DIRECTORIES',
  'GIT_DISCOVERY_ACROSS_FILESYSTEM',
  'GIT_NAMESPACE',
  'GIT_SHALLOW_FILE',
  'GIT_CONFIG_SYSTEM',
  'GIT_CONFIG_GLOBAL',
  'GIT_CONFIG_NOSYSTEM',
  'GIT_EXEC_PATH',
  'GIT_LITERAL_PATHSPECS',
] as const;
