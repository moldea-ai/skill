import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { writeJsonFile } from 'jg-fs';

import { installOfflineCli } from '../bundle/index.ts';
import { copyTree, isolatedEnvironment, runCommand } from '../harness/index.ts';

/** Installs and proves the only executable CLI closure used during local assessment. */
export const prepareAssessmentClosure = async (input: {
  directory: string;
  skillDirectory: string;
  cache: string;
  cliVersion: string;
  installedClosure?: string;
}): Promise<string> => {
  await mkdir(input.directory, { recursive: true });
  await writeJsonFile(path.join(input.directory, 'package.json'), {
    name: 'journeys-assessor',
    version: '1.0.0',
    private: true,
    devDependencies: { '@moldea.ai/cli': input.cliVersion },
  });
  const home = path.join(input.directory, 'home');
  if (input.installedClosure)
    await copyTree(input.installedClosure, path.join(input.directory, 'node_modules'), ['.bin']);
  else await installOfflineCli(input.directory, input.cliVersion, input.cache, home);
  await copyTree(input.skillDirectory, path.join(input.directory, '.agents/skills/moldea'));
  const environment = await isolatedEnvironment(home, input.cache);
  const result = await runCommand(
    process.execPath,
    [
      path.join(input.directory, '.agents/skills/moldea/scripts/moldea-cli.mjs'),
      '--repository',
      input.directory,
      '--',
      'composition',
      '--json',
    ],
    input.directory,
    environment,
  );
  const envelope = z
    .object({ status: z.literal('valid'), error: z.null() })
    .parse(JSON.parse(result.stdout) as unknown);
  if (envelope.status !== 'valid') throw new Error('Assessment CLI composition is unavailable.');
  return path.join(input.directory, 'node_modules');
};
