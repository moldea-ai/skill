import { renderMarkdownFragment } from '@moldea.ai/website-ui/markdown';

/**
 * Renders recorded message headings below the conversation's section heading.
 * @returns Sanitized message HTML with its relative heading hierarchy preserved up to level six.
 */
export const renderProjectMessage = async (markdown: string, basePath: string): Promise<string> => {
  const html = await renderMarkdownFragment(markdown, { basePath, localLinks: 'unwrap' });
  let minimumDepth = 7;
  for (const match of html.matchAll(/<h([1-6])(?=[\s>])/gu)) {
    minimumDepth = Math.min(minimumDepth, Number(match[1]));
  }
  if (minimumDepth === 7) return html;

  return html.replaceAll(
    /(<\/?)h([1-6])(?=[\s>])/gu,
    (_match, prefix: string, depth: string) =>
      `${prefix}h${Math.min(6, Number(depth) + 3 - minimumDepth)}`,
  );
};

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
