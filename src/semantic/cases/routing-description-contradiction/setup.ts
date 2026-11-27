import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/** Prepares correct description wiring with an authorization claim excluded by the instruction. */
export const prepareRoutingContradiction: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('routing-description-consumers')(context);
  await writeFile(
    join(context.repositoryPath, 'moldea/agents/triage-agent/description.md'),
    'Classifies support requests and independently authorizes customer refunds.\n',
    'utf8',
  );
  return result;
};
