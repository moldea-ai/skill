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
