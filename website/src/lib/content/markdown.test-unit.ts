// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { renderMarkdown, renderMarkdownFragment } from './markdown.ts';

describe('renderMarkdown', () => {
  test('removes the page-owned title and returns stable outline headings', async () => {
    const rendered = await renderMarkdown(
      '# Page title\n\n## First section\n\n### Nested section\n\nContent.',
    );

    expect(rendered.html).not.toContain('<h1');
    expect(rendered.headings).toStrictEqual([
      { depth: 2, html: 'First section', id: 'first-section', text: 'First section' },
      { depth: 3, html: 'Nested section', id: 'nested-section', text: 'Nested section' },
    ]);
  });

  test('sanitizes raw HTML and applies safe external-link behavior', async () => {
    const rendered = await renderMarkdown(
      '# Page\n\n<script>alert("unsafe")</script>\n\n[External](https://example.com)\n\n[Internal](/docs/)',
    );

    expect(rendered.html).not.toContain('<script');
    expect(rendered.html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">External</a>',
    );
    expect(rendered.html).toContain('href="/docs/"');
  });

  test('renders product names as inline code', async () => {
    const rendered = await renderMarkdown(
      '# Page\n\n## Coding agent and `moldea`\n\nUse `moldea` through your coding agent.',
    );

    expect(rendered.html).toContain('<code>moldea</code>');
    expect(rendered.headings[0]?.html).toBe('Coding agent and <code>moldea</code>');
  });

  test('renders bold Supported maturity labels as badges', async () => {
    const rendered = await renderMarkdown(
      '# Page\n\nUse **Supported** maturity.\n\n## **Supported** eligibility',
    );

    expect(rendered.html).toContain(
      '<span class="maturity-badge" data-maturity="supported">Supported</span>',
    );
    expect(rendered.headings).toStrictEqual([
      {
        depth: 2,
        html: '<span class="maturity-badge" data-maturity="supported">Supported</span> eligibility',
        id: 'supported-eligibility',
        text: 'Supported eligibility',
      },
    ]);
  });

  test('wraps tables in a keyboard-accessible scrolling region', async () => {
    const rendered = await renderMarkdown(
      '# Page\n\n| Capability | Behavior |\n| --- | --- |\n| Evaluate | Read-only assessment |',
    );

    expect(rendered.html).toContain(
      '<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable table"><table>',
    );
  });

  test('renders compact recorded fragments without broken evaluator workspace links', async () => {
    const html = await renderMarkdownFragment(
      'Use **moldea** with [the agent](/mnt/src/agent.ts:4) and [the fixture](/related-application/src/fixture.ts:1). Existing `moldea` code remains intact. See the [public docs](https://example.com/docs).',
    );

    expect(html).toContain('<strong><code>moldea</code></strong>');
    expect(html).toContain('the agent');
    expect(html).toContain('the fixture');
    expect(html).not.toContain('href="/mnt/');
    expect(html).not.toContain('href="/related-application/');
    expect(html).toContain(
      '<a href="https://example.com/docs" target="_blank" rel="noopener noreferrer">public docs</a>',
    );
    expect(html.match(/<code>moldea<\/code>/gu)).toHaveLength(2);
  });
});
