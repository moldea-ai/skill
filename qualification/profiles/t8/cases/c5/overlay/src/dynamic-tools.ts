import type { StructuredToolInterface } from '@langchain/core/tools';

export const assembleTools = (
  registries: readonly (readonly StructuredToolInterface[])[],
): readonly StructuredToolInterface[] => registries.flat();
