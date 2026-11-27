import { readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createSemanticCaseSetup } from '../../workspace/index.ts';
import type { ISemanticCaseSetup } from '../index.ts';

/** Gives the ignored instruction a valid block so its exclusion determines the link verdict. */
export const prepareIgnoredInstructionTarget: ISemanticCaseSetup = async (context) => {
  const result = await createSemanticCaseSetup('repair-healthy-project')(context);
  const root = context.repositoryPath;
  const block = (
    await readFile(join(root, '.agents/skills/moldea/assets/managed-agents-block.md'), 'utf8')
  ).replaceAll('{{skill-path}}', '.agents/skills/moldea');
  await writeFile(
    join(root, '.gitignore'),
    '/.agents/\n/node_modules/\n/CLAUDE.local.md\n',
    'utf8',
  );
  await writeFile(join(root, 'CLAUDE.local.md'), `@AGENTS.md\n\n${block}`, 'utf8');
  const agentsPath = join(root, 'AGENTS.md');
  await rm(agentsPath, { force: true });
  await symlink('CLAUDE.local.md', agentsPath, 'file');
  return { ...result, seedManagedAgentsBlock: false };
};
