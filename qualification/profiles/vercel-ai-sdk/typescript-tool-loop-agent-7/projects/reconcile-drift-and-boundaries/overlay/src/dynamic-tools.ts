import type { ToolSet } from 'ai';

export const assembleTools = (registries: readonly ToolSet[]): ToolSet =>
  registries.reduce<ToolSet>(
    (assembledTools, registry) => ({ ...assembledTools, ...registry }),
    {},
  );
