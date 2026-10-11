const toolNames = ['lookupAccount'] as const;

export const createToolRegistry = (): Readonly<Record<string, string>> =>
  Object.fromEntries(toolNames.map((toolName) => [toolName, `dynamic:${toolName}`]));
