// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, test } from 'vitest';

import { PORTABLE_ARTIFACT_PATHS } from '../portable/index.ts';

import { RELEASE_PATHS } from './constants.ts';

const repository = path.resolve(import.meta.dirname, '../..');

test('an unavailable npm release leaves the skill manifests and portable files intact', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-cli-update-'));
  try {
    for (const name of [
      RELEASE_PATHS.packageManifest,
      RELEASE_PATHS.packageLock,
      RELEASE_PATHS.skill,
      RELEASE_PATHS.portableCli,
      'website/package.json',
      'moldea/assets/managed-readme-block.md',
      'moldea/assets/managed-agents-block.md',
      ...PORTABLE_ARTIFACT_PATHS,
    ]) {
      const destination = path.join(root, name);
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(path.join(repository, name), destination, { recursive: true });
    }
    await mkdir(path.join(root, 'src', 'portable'), { recursive: true });
    const modulePath = path.join(repository, 'src', 'release', 'updater.ts');
    const managedPaths = [
      RELEASE_PATHS.packageManifest,
      RELEASE_PATHS.packageLock,
      ...PORTABLE_ARTIFACT_PATHS,
    ];
    const readManagedFiles = () =>
      Promise.all(managedPaths.map((name) => readFile(path.join(root, name))));
    const before = await readManagedFiles();
    const distribution = path.join(root, RELEASE_PATHS.portableCli);
    const checksum = await readFile(path.join(distribution, 'SHA256SUMS'));
    const update = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '--eval',
        `
        import { pathToFileURL } from 'node:url';
        const { updateCliRelease } = await import(pathToFileURL(process.argv[1]).href);
        await updateCliRelease({ repositoryRoot: process.argv[2], version: '99999.0.0' });
      `,
        modulePath,
        root,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          npm_config_offline: 'true',
          npm_config_cache: path.join(root, 'cache'),
        },
        timeout: 20_000,
      },
    );
    if (update.error) throw update.error;
    expect(update.status).toBe(1);
    expect(update.stderr).toContain('Unable to install @moldea.ai/cli@99999.0.0.');
    expect(await readManagedFiles()).toStrictEqual(before);
    expect(await readFile(path.join(distribution, 'SHA256SUMS'))).toStrictEqual(checksum);
    expect((await readdir(root)).filter((name) => name.startsWith('.release-cli-'))).toStrictEqual(
      [],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
