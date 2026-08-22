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
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
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
  const html = renderMaturityBadges(
    wrapTables(markExternalLinks(prefixInternalLinks(String(file)))),
  );

  return { headings: getHeadings(html), html };
};
