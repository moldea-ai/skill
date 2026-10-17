// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { renderMarkdownFragment } from '@moldea.ai/website-ui/markdown';

import { formatProjectToolInput, renderProjectMessage } from './utilities.ts';

describe('renderProjectMessage', () => {
  test('embeds recorded titles and nested headings without creating another page title', async () => {
    const html = await renderProjectMessage(
      '# Recorded request\n\n## Policy\n\n###### Detail',
      '/',
    );

    expect(html).toContain('<h3>Recorded request</h3>');
    expect(html).toContain('<h4>Policy</h4>');
    expect(html).toContain('<h6>Detail</h6>');
    expect(html).not.toMatch(/<\/?h[12](?:\s|>)/u);
  });

  test('starts a fragment at level three when its original headings begin at level two', async () => {
    const html = await renderProjectMessage('## Result\n\n### Checks', '/');

    expect(html).toContain('<h3>Result</h3>');
    expect(html).toContain('<h4>Checks</h4>');
  });

  test('preserves heading-like text in code and leaves fragments without headings unchanged', async () => {
    const markdown = 'Recorded text.\n\n```html\n<h1>Source title</h1>\n```';

    expect(await renderProjectMessage(markdown, '/')).toBe(
      await renderMarkdownFragment(markdown, { basePath: '/', localLinks: 'unwrap' }),
    );
  });
});

describe('formatProjectToolInput', () => {
  test('shows a recorded patch as readable lines', () => {
    const patch = '*** Begin Patch\n*** Add File: moldea/project.md\n+Example\n*** End Patch';
    const input = 'const p = ' + JSON.stringify(patch) + ';\ntext(await tools.apply_patch(p));\n';

    expect(formatProjectToolInput(input)).toStrictEqual({ source: patch, language: 'diff' });
  });

  test('keeps other tool input unchanged', () => {
    const input = 'const result = await tools.exec_command({ cmd: "pwd" });';

    expect(formatProjectToolInput(input)).toStrictEqual({
      source: input,
      language: 'javascript',
    });
  });

  test('does not unwrap malformed or unrelated patch-like input', () => {
    const input = 'const p = "bad";\ntext(await tools.apply_patch(p));';

    expect(formatProjectToolInput(input)).toStrictEqual({
      source: input,
      language: 'javascript',
    });
  });
});
