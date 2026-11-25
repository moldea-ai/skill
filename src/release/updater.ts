import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';

import { extractMessage } from 'jg-exception';
import { writeFileAtomicIfUnchanged } from 'jg-fs';
import { resolvePackageManagerCommand, runProcess } from 'jg-process';

import { EXCLUDED_DIRECTORY_NAMES } from '../filesystem/index.ts';
import { generatePortableArtifacts, PORTABLE_ARTIFACT_PATHS } from '../portable/index.ts';
import { MAX_PROCESS_OUTPUT_BYTES } from '../process/index.ts';

import { CLI_PACKAGE_NAME, RELEASE_PATHS } from './constants.ts';
import { assertReleaseIdentity } from './identity.ts';
import { verifyPortableCli } from './portable-cli.ts';
import type { IReleaseIdentity } from './types.ts';
import { parseStableVersion } from './versions.ts';

const RELEASE_UPDATE_FILES = [
  RELEASE_PATHS.packageManifest,
  RELEASE_PATHS.packageLock,
  ...PORTABLE_ARTIFACT_PATHS,
];

/** Copies the exact npm workspace and portable generator inputs into a disposable checkout. */
const stageUpdate = (repositoryRoot: string, stagingRoot: string): void => {
  for (const relativePath of [
    RELEASE_PATHS.packageManifest,
    RELEASE_PATHS.packageLock,
    RELEASE_PATHS.skill,
    'website/package.json',
    'moldea/assets/managed-readme-block.md',
    'moldea/assets/managed-agents-block.md',
    'src/portable',
  ]) {
    const destination = path.join(stagingRoot, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(repositoryRoot, relativePath), destination, {
      recursive: true,
      filter: (sourcePath) => !EXCLUDED_DIRECTORY_NAMES.has(path.basename(sourcePath)),
    });
  }
};

/** Installs the exact requested CLI using the repository's npm workspace and lockfile. */
const installCli = async (cwd: string, version: string): Promise<void> => {
  const env = {
    ...process.env,
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_update_notifier: 'false',
    npm_config_fetch_timeout: '30000',
  };
  const result = await runProcess({
    ...resolvePackageManagerCommand(
      [
        'install',
        '--ignore-scripts',
        '--save-dev',
        '--save-exact',
        `${CLI_PACKAGE_NAME}@${version}`,
      ],
      { packageManager: 'npm', env, cwd },
    ),
    cwd,
    env,
    maxOutputBytes: MAX_PROCESS_OUTPUT_BYTES,
    timeoutSeconds: 180,
  });
  if (result.exitCode !== 0) {
    throw new Error(
      [`Unable to install ${CLI_PACKAGE_NAME}@${version}.`, result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n'),
    );
  }
};

/** Installs, verifies, and vendors one exact release without modifying the live npm tree. */
export const updateCliRelease = async ({
  repositoryRoot,
  version,
}: {
  repositoryRoot: string;
  version: string;
}): Promise<IReleaseIdentity> => {
  parseStableVersion(version);
  const inputs = new Map(
    RELEASE_UPDATE_FILES.map((relativePath) => [
      relativePath,
      readFileSync(path.join(repositoryRoot, relativePath)),
    ]),
  );
  const liveCli = path.join(repositoryRoot, RELEASE_PATHS.portableCli);
  const originalCli = existsSync(liveCli) ? verifyPortableCli(liveCli) : null;
  // keep the candidate on the destination filesystem so the finished directory can be renamed
  const stagingRoot = mkdtempSync(path.join(repositoryRoot, '.release-cli-'));
  const stagedCli = path.join(stagingRoot, RELEASE_PATHS.portableCli);
  const displacedCli = path.join(stagingRoot, 'saved-cli');
  const written = new Map<string, Buffer>();
  let keepStagingRoot = false;

  try {
    stageUpdate(repositoryRoot, stagingRoot);
    await installCli(stagingRoot, version);
    const installedCli = path.join(stagingRoot, RELEASE_PATHS.installedPortableCli);
    verifyPortableCli(installedCli);
    mkdirSync(path.dirname(stagedCli), { recursive: true });
    cpSync(installedCli, stagedCli, { recursive: true, errorOnExist: true, force: false });
    await generatePortableArtifacts({ rootDirectory: stagingRoot });
    const identity = assertReleaseIdentity(stagingRoot);
    if (identity.cliVersion !== version) throw new Error('npm installed a different CLI version.');

    for (const [relativePath, expected] of inputs) {
      const destination = path.join(repositoryRoot, relativePath);
      const content = readFileSync(path.join(stagingRoot, relativePath));
      if (!readFileSync(destination).equals(expected)) {
        throw new Error(`${relativePath} changed during the CLI update.`);
      }
      if (content.equals(expected)) continue;
      await writeFileAtomicIfUnchanged(destination, content, expected);
      written.set(relativePath, content);
    }

    if ((existsSync(liveCli) ? verifyPortableCli(liveCli) : null) !== originalCli) {
      throw new Error('The shipped CLI directory changed during the update.');
    }
    if (identity.checksums !== originalCli) {
      if (originalCli !== null) renameSync(liveCli, displacedCli);
      try {
        renameSync(stagedCli, liveCli);
      } catch (error) {
        if (originalCli !== null) {
          try {
            renameSync(displacedCli, liveCli);
          } catch (restoreError) {
            keepStagingRoot = true;
            throw new Error(
              `Unable to restore the shipped CLI after ${extractMessage(error)}. Its files are at ${displacedCli}.`,
              { cause: restoreError },
            );
          }
        }
        throw error;
      }
    }
    return identity;
  } catch (error) {
    const conflicts: string[] = [];
    for (const [relativePath, content] of [...written].reverse()) {
      try {
        await writeFileAtomicIfUnchanged(
          path.join(repositoryRoot, relativePath),
          inputs.get(relativePath)!,
          content,
        );
      } catch {
        conflicts.push(relativePath);
      }
    }
    if (conflicts.length > 0) {
      throw new Error(`CLI update failed and could not restore ${conflicts.join(', ')}.`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    if (!keepStagingRoot) rmSync(stagingRoot, { recursive: true, force: true });
  }
};
