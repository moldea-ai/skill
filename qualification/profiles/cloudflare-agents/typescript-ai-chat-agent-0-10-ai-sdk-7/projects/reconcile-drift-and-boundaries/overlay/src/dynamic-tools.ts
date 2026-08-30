import type { ToolSet } from 'ai';

/** Combines runtime-selected tool maps whose final entries are not statically closed. */
export const assembleTools = (registries: readonly ToolSet[]): ToolSet => {
  const assembledTools: ToolSet = {};

  for (const registry of registries) {
    Object.assign(assembledTools, registry);
  }

  return assembledTools;
};
