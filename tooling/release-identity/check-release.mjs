#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertReleaseEvidence } from './evidence.mjs';
import { assertReleaseIdentity } from './identity.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const allowedArguments = new Set(['--identity-only']);
const unsupportedArgument = process.argv
  .slice(2)
  .find((argument) => !allowedArguments.has(argument));

if (unsupportedArgument) {
  process.stderr.write(`Unsupported release-check argument: ${unsupportedArgument}\n`);
  process.exitCode = 1;
} else {
  try {
    const identity = assertReleaseIdentity(repositoryRoot);
    if (!process.argv.includes('--identity-only')) assertReleaseEvidence(repositoryRoot);
    process.stdout.write(
      `Release identity is synchronized for skill ${identity.releaseVersion} and ${identity.cliVersion}.\n`,
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
