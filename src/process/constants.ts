import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../resources/index.ts';

// bounded output protects local runs from unbounded child-process memory use
export const MAX_PROCESS_OUTPUT_BYTES =
  MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxProcessOutputBytes;
