import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/** Seeds an approved record, its restatement and an independent refund rule. */
export const prepareRefundRecord: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('repair-healthy-project')(context);
  const files = [
    [
      'moldea/project.md',
      '# Shop\n\n## Routing\n\n- [Refunds](context/refunds.md) covers refund processing.\n',
    ],
    [
      'moldea/context/refunds.md',
      '# Refund processing\n\nRefunds go back to the original payment method. Finance signed off on the January refund rehearsal. See [the approval record](/docs/records/refund-review.md).\n',
    ],
    [
      'docs/records/refund-review.md',
      '# January refund rehearsal approval\n\nThe finance lead signed off on the January refund rehearsal. This record documents that completed decision.\n',
    ],
    [
      'src/refunds/payment.js',
      'export const chooseRefundMethod = (payment) => payment.originalMethod;\n',
    ],
    [
      'moldea/moldea.yaml',
      'version: 1\ncontext:\n  /moldea/context/refunds.md:\n    affectedBy:\n      - /src/refunds/payment.js\n      - /docs/records/refund-review.md\n',
    ],
  ] as const;
  for (const [relativePath, content] of files) {
    const targetPath = join(context.repositoryPath, relativePath);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content, 'utf8');
  }
  return result;
};
