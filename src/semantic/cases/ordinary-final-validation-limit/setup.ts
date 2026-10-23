import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

import { createBoundaryLedger, INITIAL_PROJECT_SUMMARY } from './fixtures.ts';

/** Seeds a material policy traversal and a small stale summary requiring canonical correction. */
export const setupFinalValidationLimit: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('adopted-relevance-no-change')(context);
  await mkdir(join(context.repositoryPath, 'moldea/context'), { recursive: true });
  await writeFile(
    join(context.repositoryPath, 'moldea/context/contracts.md'),
    createBoundaryLedger(),
  );
  await writeFile(
    join(context.repositoryPath, 'moldea/moldea.yaml'),
    'version: 1\ncontext:\n  /moldea/context/contracts.md:\n    affectedBy:\n      - /src/project-state.js\n',
  );
  await writeFile(join(context.repositoryPath, 'moldea/project.md'), INITIAL_PROJECT_SUMMARY);
  return result;
};
