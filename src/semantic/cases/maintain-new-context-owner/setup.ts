import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/** Gives the adopted project a routed returns owner and no finance owner. */
export const prepareNewOwnerRequest: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('repair-healthy-project')(context);
  const root = context.repositoryPath;
  await mkdir(join(root, 'moldea/context'), { recursive: true });
  await writeFile(
    join(root, 'moldea/project.md'),
    '# Shop\n\nThis project supports customer purchases.\n\n## Routing\n\n- [Returns](context/returns.md) covers return eligibility and handling.\n',
    'utf8',
  );
  await writeFile(
    join(root, 'moldea/context/returns.md'),
    '# Returns\n\nCustomers can return unopened items within 21 days.\n',
    'utf8',
  );
  await writeFile(join(root, 'moldea/moldea.yaml'), 'version: 1\n', 'utf8');
  return result;
};
