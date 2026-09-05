#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { clearPinnedReleaseEvidence, pinReleaseEvidence } from './evidence.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arguments_ = process.argv.slice(2);

const readOption = (name) => {
  const index = arguments_.indexOf(name);
  if (index === -1) return null;
  if (arguments_.indexOf(name, index + 1) !== -1 || arguments_[index + 1] === undefined) {
    throw new Error(`${name} must be supplied exactly once with one value.`);
  }
  return arguments_[index + 1];
};

try {
  if (arguments_.length === 1 && arguments_[0] === '--clear') {
    const removed = clearPinnedReleaseEvidence(repositoryRoot);
    process.stdout.write(
      removed ? 'Cleared pinned release evidence.\n' : 'No pinned release evidence exists.\n',
    );
  } else {
    const from = readOption('--from');
    const reason = readOption('--reason');
    if (arguments_.length !== 4 || from === null || reason === null) {
      throw new Error(
        'Usage: npm run release:evidence:pin -- --from v<version> --reason "<reason>" or --clear.',
      );
    }
    const envelope = pinReleaseEvidence(repositoryRoot, { from, reason });
    process.stdout.write(
      `Pinned ${envelope.target.version} release evidence from ${envelope.source.tag}: ${envelope.reason}\n`,
    );
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
