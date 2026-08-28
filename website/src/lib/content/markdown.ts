import rehypeShiki from '@shikijs/rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { withBase } from '@moldea.ai/website-ui/site';

// one rendered second- or third-level documentation heading
export interface IRenderedMarkdownHeading {
  depth: 2 | 3;
  html: string;
  id: string;
  text: string;
}

// sanitized rendered Markdown and its page-outline headings
export interface IRenderedMarkdown {
  headings: IRenderedMarkdownHeading[];
  html: string;
}

const stripTags = (value: string): string => value.replaceAll(/<[^>]+>/g, '');

const prefixInternalLinks = (html: string): string => {
  return html.replaceAll(/href="\/(?!\/)/g, `href="${withBase('/', import.meta.env.BASE_URL)}`);
};

const markExternalLinks = (html: string): string => {
  return html.replaceAll(
    /<a href="((?:https?:)?\/\/[^" ]+)"/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer"',
  );
};

const wrapTables = (html: string): string => {
  return html.replaceAll(
    /<table>([\s\S]*?)<\/table>/g,
    '<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable table"><table>$1</table></div>',
  );
};

const renderMaturityBadges = (html: string): string => {
  return html.replaceAll(
    '<strong>Supported</strong>',
    '<span class="maturity-badge" data-maturity="supported">Supported</span>',
  );
};

/** Removes recorded local links that cannot resolve on the public website. */
const unwrapRecordedLocalLinks = (html: string): string =>
  html.replaceAll(/<a href="(?!(?:[a-z][a-z\d+.-]*:|\/\/))[^" ]*">([\s\S]*?)<\/a>/giu, '$1');

/** Applies the public product-name treatment outside existing code elements. */
const renderProductNamesAsCode = (html: string): string => {
  let codeDepth = 0;

  return html.replaceAll(/<[^>]+>|[^<]+/g, (token) => {
    if (/^<code(?:\s|>)/u.test(token)) codeDepth += 1;
    if (/^<\/code>/u.test(token)) codeDepth -= 1;
    if (token.startsWith('<') || codeDepth > 0) return token;

    return token.replaceAll(/\bmoldea\b/giu, '<code>moldea</code>');
  });
};

/** Processes Markdown with optional heading ids for full documents. */
const processMarkdown = async (source: string, shouldSlugHeadings: boolean): Promise<string> => {
  const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype);
  if (shouldSlugHeadings) processor.use(rehypeSlug);

  const file = await processor
    .use(rehypeSanitize, { ...defaultSchema, clobberPrefix: '' })
    .use(rehypeShiki, {
      defaultColor: false,
      themes: {
        dark: 'github-dark-default',
        light: 'github-light-default',
      },
    })
    .use(rehypeStringify)
    .process(source);

  return String(file);
};

const getHeadings = (html: string): IRenderedMarkdownHeading[] => {
  return [...html.matchAll(/<h([23]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)].map(
    (match): IRenderedMarkdownHeading => ({
      depth: Number(match[1]) as 2 | 3,
      html: match[3] ?? '',
      id: match[2] ?? '',
      text: stripTags(match[3] ?? ''),
    }),
  );
};

/**
 * Renders repository-owned Markdown through a raw-HTML-disabled and sanitized pipeline.
 * @param markdown Documentation Markdown source.
 * @returns Sanitized highlighted HTML and stable second- and third-level headings.
 * @throws
 * - INVALID_BASE_PATH: The website base path contains unsupported URL characters.
 */
export const renderMarkdown = async (markdown: string): Promise<IRenderedMarkdown> => {
  const source = markdown.replace(/^# .+\n+/u, '');
  const renderedHtml = await processMarkdown(source, true);
  const html = renderMaturityBadges(
    wrapTables(markExternalLinks(prefixInternalLinks(renderedHtml))),
  );

  return { headings: getHeadings(html), html };
};

/**
 * Renders one recorded Markdown fragment without document-owned heading ids.
 * @param markdown Recorded Markdown source.
 * @returns Sanitized HTML suitable for an embedded message surface.
 * @throws
 * - INVALID_BASE_PATH: The website base path contains unsupported URL characters.
 */
export const renderMarkdownFragment = async (markdown: string): Promise<string> => {
  const renderedHtml = await processMarkdown(markdown, false);

  return renderProductNamesAsCode(
    wrapTables(markExternalLinks(prefixInternalLinks(unwrapRecordedLocalLinks(renderedHtml)))),
  );
};
