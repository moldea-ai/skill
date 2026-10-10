import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { z } from 'zod';

import {
  parseRuntimeCompatibilityPublication,
  RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME,
} from '../compatibility/index.ts';

import { loadCandidateArtifacts, validateCandidateArtifacts } from './artifacts.ts';

// trusted builds record the exact source commit beside their checksummed package set
const CommitSchema = z.string().regex(/^[0-9a-f]{40}$/u);
const CHECKSUM_FILE_NAME = 'SHA256SUMS';
const COMMIT_FILE_NAME = 'packages-commit.txt';

const isOutside = (root: string, candidate: string): boolean => {
  const path = relative(root, candidate);
  return isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`);
};

/**
 * Copies the verified CLI closure from a trusted public-package build without repacking it.
 * Both directories must exist, and the separate output directory must be empty.
 * @throws If source identity, checksums, package closure, publication, or output isolation fails.
 */
export const prepareTrustedCandidate = (options: {
  artifactDirectory: string;
  outputDirectory: string;
  packagesCommit: string;
}): void => {
  const input = realpathSync(options.artifactDirectory);
  const output = realpathSync(options.outputDirectory);
  assert.ok(isOutside(input, output) && isOutside(output, input), 'Candidate directories overlap.');
  assert.equal(readdirSync(output).length, 0, 'Candidate output must be empty.');
  const entries = readdirSync(input, { withFileTypes: true });
  assert.ok(
    entries.every((entry) => entry.isFile()),
    'Trusted artifacts must be regular files.',
  );
  const packagesCommit = CommitSchema.parse(options.packagesCommit);
  assert.equal(readFileSync(join(input, COMMIT_FILE_NAME), 'utf8'), `${packagesCommit}\n`);

  const archives = entries.filter((entry) => entry.name.endsWith('.tgz'));
  assert.ok(archives.length > 0, 'Trusted package artifacts are missing.');
  const orderedChecksums = archives
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    .map(({ name }) => {
      assert.match(name, /^[a-z0-9.-]+\.tgz$/u, 'Unsafe trusted archive name.');
      return `${createHash('sha256')
        .update(readFileSync(join(input, name)))
        .digest('hex')}  ${name}`;
    });
  assert.equal(
    readFileSync(join(input, CHECKSUM_FILE_NAME), 'utf8'),
    `${orderedChecksums.join('\n')}\n`,
    'Trusted package checksums do not match.',
  );
  const publication = readFileSync(join(input, RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME));
  parseRuntimeCompatibilityPublication(publication.toString('utf8'));
  const candidate = loadCandidateArtifacts(input, ['@moldea.ai/website-ui']);
  candidate.artifacts.delete('@moldea.ai/website-ui');
  validateCandidateArtifacts(candidate.artifacts);
  const candidateNames = new Set(
    [...candidate.artifacts.values()].map(({ archiveName }) => archiveName),
  );

  for (const artifact of candidate.artifacts.values()) {
    copyFileSync(join(input, artifact.archiveName), join(output, artifact.archiveName));
  }
  writeFileSync(join(output, RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME), publication);
  writeFileSync(join(output, COMMIT_FILE_NAME), `${packagesCommit}\n`);
  writeFileSync(
    join(output, CHECKSUM_FILE_NAME),
    `${orderedChecksums.filter((line) => candidateNames.has(line.slice(66))).join('\n')}\n`,
  );
};

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [artifactDirectory, outputDirectory, packagesCommit] = process.argv.slice(2);
  assert.ok(
    process.argv.length === 5 && artifactDirectory && outputDirectory && packagesCommit,
    'Use trusted-candidate.ts <artifact-directory> <empty-output-directory> <packages-commit>.',
  );
  prepareTrustedCandidate({ artifactDirectory, outputDirectory, packagesCommit });
}
