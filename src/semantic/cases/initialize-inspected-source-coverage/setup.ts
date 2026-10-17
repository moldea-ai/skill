import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

import { COVERAGE_FILES } from './fixtures.ts';

/** Seeds one existing agent with an explicit bounded registration surface. */
export const prepareInspectedSourceCoverage: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('explicit-initialization')(context);
  for (const [relativePath, content] of Object.entries(COVERAGE_FILES)) {
    const target = join(context.repositoryPath, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
  await unlink(join(context.repositoryPath, 'src/service-status.js'));
  return result;
};
