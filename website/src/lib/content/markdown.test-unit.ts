// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { renderMarkdown } from './markdown.ts';

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

  test('wraps tables in a keyboard-accessible scrolling region', async () => {
    const rendered = await renderMarkdown(
      '# Page\n\n| Capability | Behavior |\n| --- | --- |\n| Evaluate | Read-only assessment |',
    );

    expect(rendered.html).toContain(
      '<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable table"><table>',
    );
  });
});
