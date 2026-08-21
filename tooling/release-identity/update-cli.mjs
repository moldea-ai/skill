#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { updateCliRelease } from './updater.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const version = process.argv[2];

if (!version || process.argv.length !== 3) {
  process.stderr.write('Usage: npm run release:update-cli -- <exact-version>\n');
  process.exitCode = 1;
} else {
  try {
    const identity = updateCliRelease({ repositoryRoot, version });
    process.stdout.write(
      `Updated skill ${identity.releaseVersion} to ${identity.packageManifest.devDependencies['@moldea.ai/cli']}\n`,
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
