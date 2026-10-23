import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/** Introduces one missing literal relationship path while preserving the actual implementation. */
export const setupStructuralRecovery: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('adopted-relevance-no-change')(context);
  const path = join(context.repositoryPath, 'moldea/moldea.yaml');
  await writeFile(
    path,
    'version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/old-state.js\n',
  );
  return result;
};
