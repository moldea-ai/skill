type IToolRegistration = Readonly<Record<string, unknown>>;

export const assembleTools = (
  registries: readonly (readonly IToolRegistration[])[],
): readonly IToolRegistration[] => registries.flat();
