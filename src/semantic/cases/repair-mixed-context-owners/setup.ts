import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/**
 * Seeds one context file with independent refund and editorial responsibilities.
 * @param includeRelationshipDefects Whether to include ineligible and omitted paths.
 * @returns The fixture setup shared by assessment and approved restructuring.
 */
export const createMixedOwnerSetup =
  (includeRelationshipDefects: boolean): ISemanticCaseSetup =>
  async (context) => {
    const result = await createSemanticCaseSetup('repair-healthy-project')(context);
    const impactPaths = [
      '/src/refunds/eligibility.js',
      '/src/publishing/publish.js',
      ...(includeRelationshipDefects
        ? [
            '/docs/editorial-review.md',
            '/website/src/layouts/article.astro',
            '/website/astro.config.mjs',
            '/.agents/skills/moldea/SKILL.md',
          ]
        : ['/src/publishing/review-gate.js']),
    ];
    const files = [
      [
        'moldea/moldea.yaml',
        `version: 1\ncontext:\n  /moldea/context/operating-rules.md:\n    affectedBy:\n${impactPaths.map((path) => `      - ${path}\n`).join('')}`,
      ],
      [
        'moldea/project.md',
        '# Shop and magazine\n\nCustomers buy products and read the magazine.\n\n## Routing\n\n- [Operating rules](context/operating-rules.md) covers refund eligibility and editorial approval.\n',
      ],
      [
        'moldea/context/operating-rules.md',
        '# Operating rules\n\n## Refund eligibility\n\nCustomers can request a refund within 14 days. [Refund eligibility](../../src/refunds/eligibility.js) enforces the deadline.\n\n## Editorial approval\n\nOnly an editor can approve an article. An article can be published only after that approval. See the [approval gate](../../src/publishing/review-gate.js) and [publication](../../src/publishing/publish.js).\n',
      ],
      [
        'src/refunds/eligibility.js',
        'export const isRefundEligible = (daysSincePurchase) => daysSincePurchase <= 14;\n',
      ],
      [
        'src/publishing/review-gate.js',
        'export const canApproveArticle = (reviewer) => reviewer.role === "editor";\n',
      ],
      [
        'src/publishing/publish.js',
        'export const canPublishArticle = (article) => article.approvedByEditor === true;\n',
      ],
      ['docs/editorial-review.md', '# Editorial review\n\nThis guide explains the review queue.\n'],
      ['website/src/layouts/article.astro', '<main><slot /></main>\n'],
      ['website/astro.config.mjs', 'export default { output: "static" };\n'],
    ] as const;
    for (const [relativePath, content] of files) {
      const targetPath = join(context.repositoryPath, relativePath);
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, content, 'utf8');
    }
    return result;
  };
