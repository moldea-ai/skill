import path from 'node:path';

import { updateCliRelease } from './updater.ts';

const version = process.argv[2];

if (version === undefined || process.argv.length !== 3) {
  process.stderr.write('Usage: npm run release:update-cli -- <exact-version>\n');
  process.exitCode = 1;
} else {
  try {
    const identity = updateCliRelease({
      repositoryRoot: path.resolve(import.meta.dirname, '../..'),
      version,
    });
    process.stdout.write(
      `Updated skill ${identity.releaseVersion} to ${identity.packageManifest.devDependencies['@moldea.ai/cli']}\n`,
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
