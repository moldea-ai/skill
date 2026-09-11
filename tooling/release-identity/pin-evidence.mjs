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
    const fromCommit = readOption('--from-commit');
    const reason = readOption('--reason');
    const scope = readOption('--scope');
    if (
      arguments_.length !== 6 ||
      (from === null) === (fromCommit === null) ||
      reason === null ||
      scope === null
    ) {
      throw new Error(
        'Usage: npm run release:evidence:pin -- --scope <semantic|qualification|all> (--from v<version> | --from-commit <full-commit>) --reason "<reason>" or --clear.',
      );
    }
    const envelope = await pinReleaseEvidence(repositoryRoot, {
      from,
      fromCommit,
      reason,
      scope,
    });
    const selectedSection = scope === 'all' ? 'semantic and qualification' : scope;
    const source = from ?? fromCommit;
    process.stdout.write(
      `Pinned ${selectedSection} evidence for ${envelope.target.version} from ${source}: ${reason}\n`,
    );
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
