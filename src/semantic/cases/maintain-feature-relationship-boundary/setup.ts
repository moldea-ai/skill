import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/**
 * Prepares an affected feature beside inspected presentation and shared infrastructure.
 * @returns The base fixture's tools, mounts and post-baseline hook.
 */
export const prepareFeatureBoundary: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('assessed-owner-relationships')(context);
  const files = [
    ['src/ui/card.js', 'export const cardLabel = (label) => label;\n'],
    ['src/ui/navigation.js', 'export const refundNavigationLabel = () => "Refund";\n'],
    ['src/router.js', 'export const refundRoute = () => "/refunds";\n'],
    ['src/data/refund-view.js', 'export const displayRefundAmount = (amount) => String(amount);\n'],
    [
      'src/refund-view.test-unit.js',
      [
        "import assert from 'node:assert/strict';",
        "import { test } from 'node:test';",
        "import { cardLabel } from './ui/card.js';",
        "import { refundNavigationLabel } from './ui/navigation.js';",
        "import { refundRoute } from './router.js';",
        "import { displayRefundAmount } from './data/refund-view.js';",
        '',
        "test('refund presentation', () => {",
        "  assert.equal(cardLabel('Refund'), 'Refund');",
        "  assert.equal(refundNavigationLabel(), 'Refund');",
        "  assert.equal(refundRoute(), '/refunds');",
        "  assert.equal(displayRefundAmount(12.5), '12.5');",
        '});',
        '',
      ].join('\n'),
    ],
  ] as const;
  for (const [relativePath, content] of files) {
    const filePath = join(context.repositoryPath, relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf8');
  }
  return result;
};
