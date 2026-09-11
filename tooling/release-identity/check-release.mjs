#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertReleaseEvidence } from './evidence.mjs';
import { assertReleaseIdentity } from './identity.mjs';
import { assertTargetReleaseTagIdentity } from './release-evidence-source.mjs';

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
    assertTargetReleaseTagIdentity(
      repositoryRoot,
      identity.releaseVersion,
      process.env.MOLDEA_RELEASE_TAG,
    );
    const evidence = process.argv.includes('--identity-only')
      ? null
      : await assertReleaseEvidence(repositoryRoot);
    const evidenceStatus =
      evidence === null
        ? ''
        : ` Semantic evidence is ${evidence.semantic.mode}; qualification evidence is ${evidence.qualification.mode}.`;
    process.stdout.write(
      `Release identity is synchronized for skill ${identity.releaseVersion} and ${identity.cliVersion}.${evidenceStatus}\n`,
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
