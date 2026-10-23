import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/**
 * Seeds an adopted deterministic calculation project without any agent inventory.
 * @returns The base fixture's tool mounts and baseline hook.
 */
export const prepareZeroAgentPlanning: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('adopted-relevance-no-change')(context);
  await mkdir(join(context.repositoryPath, 'docs'), { recursive: true });
  await writeFile(
    join(context.repositoryPath, 'moldea/project.md'),
    '# Nightly tax calculations\n\nA scheduled ordinary software job calculates exact integer tax amounts under fixed rules and persists them. No language-model judgment is required. The project has no agents.\n',
    'utf8',
  );
  await writeFile(
    join(context.repositoryPath, 'moldea/moldea.yaml'),
    'version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/tax-calculation.js\n      - /docs/tax-policy.md\n',
    'utf8',
  );
  await writeFile(
    join(context.repositoryPath, 'docs/tax-policy.md'),
    '# Deterministic tax rules\n\nTax is one tenth of a nonnegative integer amount in minor units, rounded down to a whole minor unit. Use exact integer arithmetic. Run once nightly for each account and date; persist the result under that unique account/date identity. Fixed rules and scheduling require no model judgment.\n',
    'utf8',
  );
  await writeFile(
    join(context.repositoryPath, 'src/tax-calculation.js'),
    'export const calculateTaxMinorUnits = (amountMinorUnits) => amountMinorUnits / 10n;\n',
    'utf8',
  );
  return result;
};
