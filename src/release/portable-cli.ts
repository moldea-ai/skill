import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import { parseStableVersion } from './versions.ts';

const CLI_ARTIFACT_NAMES =
  /^(?:moldea\.mjs|analysis-worker\.mjs|node-runner\.mjs|chunk-[a-f0-9]+\.mjs|LICENSES\.md|SHA256SUMS)$/u;
const REQUIRED_CLI_ARTIFACTS = [
  'moldea.mjs',
  'analysis-worker.mjs',
  'node-runner.mjs',
  'LICENSES.md',
  'SHA256SUMS',
];
const CliCompositionSchema = z.object({
  cliVersion: z.string(),
  command: z.literal('composition'),
  error: z.null(),
  result: z.object({ packages: z.array(z.object({ name: z.string(), version: z.string() })) }),
  schemaVersion: z.number().int().positive(),
  status: z.literal('valid'),
});

/** Verifies the published artifact names and all bytes against its checksum manifest. */
export const verifyPortableCli = (directory: string): string => {
  if (!lstatSync(directory).isDirectory())
    throw new Error('The portable CLI directory is invalid.');
  const entries = readdirSync(directory, { withFileTypes: true });
  const names = entries.map(({ name }) => name).sort();
  if (
    entries.some((entry) => !entry.isFile() || !CLI_ARTIFACT_NAMES.test(entry.name)) ||
    REQUIRED_CLI_ARTIFACTS.some((name) => !names.includes(name))
  ) {
    throw new Error('The portable CLI artifact set is invalid.');
  }

  const calculated = names
    .filter((name) => name !== 'SHA256SUMS')
    .map((name) => {
      const sha256 = createHash('sha256')
        .update(readFileSync(path.join(directory, name)))
        .digest('hex');
      return `${sha256}  ${name}\n`;
    })
    .join('');
  if (readFileSync(path.join(directory, 'SHA256SUMS'), 'utf8') !== calculated) {
    throw new Error('The portable CLI checksum manifest does not match its files.');
  }
  return calculated;
};

/** Reads the composition emitted by the checksummed CLI, including its embedded Core. */
export const readPortableCliIdentity = (directory: string) => {
  const checksums = verifyPortableCli(directory);
  const stdout = execFileSync(
    process.execPath,
    [path.resolve(directory, 'moldea.mjs'), 'composition', '--json'],
    { cwd: directory, encoding: 'utf8', maxBuffer: 65_536, timeout: 30_000 },
  );
  const composition = CliCompositionSchema.parse(JSON.parse(stdout) as unknown);
  const core = composition.result.packages.filter(({ name }) => name === '@moldea.ai/core');
  if (core.length !== 1)
    throw new Error('The portable CLI must identify exactly one embedded Core.');
  return {
    checksums,
    cliJsonSchemaVersion: composition.schemaVersion,
    cliVersion: parseStableVersion(composition.cliVersion),
    coreVersion: parseStableVersion(core[0]?.version),
  };
};
