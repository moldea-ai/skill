import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/** Seeds matching 30-day policy and implementation for a later context-only correction. */
export const setupDigestContinuation: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('adopted-relevance-no-change')(context);
  await writeFile(
    join(context.repositoryPath, 'moldea/moldea.yaml'),
    'version: 1\ncontext:\n  /moldea/context/returns.md:\n    affectedBy:\n      - /src/project-state.js\n',
  );
  await mkdir(join(context.repositoryPath, 'moldea/context'), { recursive: true });
  await writeFile(
    join(context.repositoryPath, 'moldea/context/returns.md'),
    '# Returns policy\n\nThe approved returns window is 30 days.\n',
  );
  await writeFile(
    join(context.repositoryPath, 'src/project-state.js'),
    'export const returnsWindowDays = 30;\n',
  );
  return result;
};
