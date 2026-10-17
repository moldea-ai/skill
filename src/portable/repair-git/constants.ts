// fixed read-only Git configuration shared by the helper and evaluation boundary
export const REPAIR_GIT_COMMON_CONFIGURATIONS = [
  'core.attributesFile=/dev/null',
  'core.fsmonitor=false',
  'core.pager=cat',
  'filter.lfs.clean=',
  'filter.lfs.process=',
  'filter.lfs.required=false',
  'filter.lfs.smudge=',
] as const;

export const REPAIR_GIT_INDEX_ARGUMENTS = ['ls-files', '-z', '--', '.'] as const;

export const REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS = [
  'config',
  '--null',
  '--get',
  'attr.tree',
] as const;

// limits bound subprocess capture, attribute inspection and the single model-visible response
export const REPAIR_GIT_INDEX_BYTES = 4_194_304;
export const REPAIR_GIT_OUTPUT_BYTES = 262_144;
export const REPAIR_GIT_RESPONSE_BYTES = 65_536;
export const REPAIR_GIT_ATTRIBUTE_BYTES = 32_768;
export const REPAIR_GIT_ATTRIBUTE_PATHS = 65_536;
