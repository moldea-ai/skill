/** Unwraps a recorded patch call for display while retaining other tool inputs verbatim. */
export const formatProjectToolInput = (input: string): { source: string; language: string } => {
  const original = { source: input, language: 'javascript' };
  const declaration = /^(?:const|let) ([A-Za-z_$][\w$]*) = /u.exec(input);
  if (declaration === null) return original;
  const literalStart = declaration[0].length;
  const literalEnd = input.indexOf('";\n', literalStart);
  if (literalEnd === -1) return original;
  const suffix = input.slice(literalEnd + 2).trim();
  if (suffix !== 'text(await tools.apply_patch(' + declaration[1] + '));') return original;

  try {
    const patch: unknown = JSON.parse(input.slice(literalStart, literalEnd + 1));
    if (
      typeof patch === 'string' &&
      patch.startsWith('*** Begin Patch\n') &&
      patch.trimEnd().endsWith('*** End Patch')
    ) {
      return { source: patch, language: 'diff' };
    }
  } catch {
    return original;
  }
  return original;
};
