import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createManagedBlockBytes } from '../../portable/managed-block/index.ts';
import { copyTree } from '../harness/index.ts';
import type { IJourneyDefinition } from '../index.ts';

import { installOfflineCli } from './npm-cache.ts';

/** Materializes a trusted starting repository, including adopted integration regions and lockfile. */
export const materializeFixture = async (input: {
  source: string;
  destination: string;
  skillDirectory: string;
  definition: IJourneyDefinition;
  cache: string;
  cliVersion: string;
  home: string;
}): Promise<void> => {
  await copyTree(input.source, input.destination);
  await writeFile(path.join(input.destination, '.gitignore'), '.agents/\nnode_modules/\n');
  if (input.definition.fixture.adopted) {
    for (const [name, asset] of [
      ['README.md', 'managed-readme-block.md'],
      ['AGENTS.md', 'managed-agents-block.md'],
    ] as const) {
      const file = path.join(input.destination, name);
      const currentBlock = (
        await readFile(path.join(input.skillDirectory, 'assets', asset), 'utf8')
      ).replaceAll('{{skill-path}}', '.agents/skills/moldea');
      // drift stays safely bounded by valid markers so repair has an unambiguous target
      const block = input.definition.fixture.integrationDrift
        ? currentBlock.replace('This project uses', 'This workspace formerly used')
        : currentBlock;
      let previous = Buffer.alloc(0);
      try {
        previous = await readFile(file);
      } catch (error) {
        if (!(
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'ENOENT'
        ))
          throw error;
      }
      await writeFile(file, createManagedBlockBytes(previous, block, name));
    }
  }
  // adopted fixtures carry a real lockfile even when sandbox installation is forbidden
  if (input.definition.fixture.adopted || input.definition.fixture.installCli) {
    await mkdir(input.home, { recursive: true });
    await installOfflineCli(input.destination, input.cliVersion, input.cache, input.home);
    await rm(path.join(input.destination, 'node_modules'), { recursive: true, force: true });
  }
};
