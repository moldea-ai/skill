import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

import { writeJsonFileAtomically } from '../../filesystem/index.ts';
import {
  copyTree,
  isolatedEnvironment,
  readJson,
  runCommand,
  treeDigest,
} from '../harness/index.ts';

/** Builds the minimal CLI cache in isolation; package lifecycle scripts never execute. */
export const buildNpmCache = async (
  version: string,
  destination: string,
): Promise<{ sha256: string; packages: string[] }> => {
  if (!/^\d+\.\d+\.\d+$/u.test(version))
    throw new Error('CLI cache requires an exact stable version.');
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-cache-'));
  try {
    const project = path.join(scratch, 'project');
    const cache = path.join(scratch, 'npm-cache');
    await mkdir(project);
    await writeJsonFileAtomically(path.join(project, 'package.json'), {
      name: 'journeys-cache',
      version: '1.0.0',
      private: true,
    });
    const environment = await isolatedEnvironment(path.join(scratch, 'home'), cache);
    await runCommand(
      'npm',
      [
        'install',
        '--save-dev',
        '--save-exact',
        '--ignore-scripts',
        '--legacy-peer-deps',
        '--no-audit',
        '--no-fund',
        `@moldea.ai/cli@${version}`,
      ],
      project,
      { ...environment, NPM_CONFIG_OFFLINE: 'false' },
    );
    const lock = z
      .object({ packages: z.record(z.string(), z.object({ version: z.string().optional() })) })
      .parse(await readJson(path.join(project, 'package-lock.json')));
    const packages = Object.entries(lock.packages)
      .filter(([name]) => name.startsWith('node_modules/'))
      .map(([name, entry]) => `${name.slice('node_modules/'.length)}@${entry.version ?? ''}`)
      .sort();
    await mkdir(destination, { recursive: true });
    await copyTree(path.join(cache, '_cacache'), path.join(destination, '_cacache'), [], true);
    return { sha256: await treeDigest(destination, [], true), packages };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
};

/** Installs the skill's exact development dependency command from the prepared cache only. */
export const installOfflineCli = async (
  repository: string,
  version: string,
  cache: string,
  home: string,
): Promise<void> => {
  const environment = await isolatedEnvironment(home, cache);
  await runCommand(
    'npm',
    [
      'install',
      '--save-dev',
      '--save-exact',
      '--ignore-scripts',
      '--offline',
      `@moldea.ai/cli@${version}`,
    ],
    repository,
    environment,
  );
  const manifest = z
    .object({ devDependencies: z.record(z.string(), z.string()) })
    .parse(JSON.parse(await readFile(path.join(repository, 'package.json'), 'utf8')) as unknown);
  if (manifest.devDependencies['@moldea.ai/cli'] !== version)
    throw new Error('Offline install did not declare the exact CLI version.');
};
