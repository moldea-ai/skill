import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/**
 * Seeds pending context maintenance with unavailable repository-local tooling.
 * @returns The base fixture's tool mounts and baseline hook.
 */
export const prepareContextRecovery: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('repair-missing-tooling')(context);
  await writeFile(
    join(context.repositoryPath, 'moldea/project.md'),
    '# Returns policy\n\nCustomers may request returns within 30 days. Customer Operations owns this policy. A human approves exceptions.\n',
    'utf8',
  );
  await mkdir(join(context.repositoryPath, 'reports'), { recursive: true });
  await writeFile(join(context.repositoryPath, 'reports/status.txt'), 'pending\n', 'utf8');
  return result;
};
