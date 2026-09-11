#!/usr/bin/env node

import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { recordFreshReleaseEvidence } from './evidence.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

if (process.argv.length !== 2) {
  process.stderr.write('release:evidence:record does not accept arguments.\n');
  process.exitCode = 1;
} else {
  try {
    const envelope = await recordFreshReleaseEvidence(repositoryRoot);
    process.stdout.write(
      `Recorded fresh release evidence for ${envelope.target.version} at ${relative(repositoryRoot, resolve(repositoryRoot, 'fixtures/release-evidence.json'))}.\n`,
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
