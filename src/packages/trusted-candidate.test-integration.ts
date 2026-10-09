// @vitest-environment node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, expect, test } from 'vitest';

import { RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME } from '../compatibility/index.ts';
import { executeProcess } from '../process/index.ts';

import { loadCandidateArtifacts } from './artifacts.ts';
import { prepareTrustedCandidate } from './trusted-candidate.ts';

const PACKAGES_COMMIT = 'a'.repeat(40);
const roots: string[] = [];
let fixture: string;

const createRoot = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-trusted-candidate-'));
  roots.push(root);
  return root;
};

const writeChecksums = (directory: string): void => {
  const lines = readdirSync(directory)
    .filter((name) => name.endsWith('.tgz'))
    .sort()
    .map(
      (name) =>
        `${createHash('sha256')
          .update(readFileSync(join(directory, name)))
          .digest('hex')}  ${name}`,
    );
  writeFileSync(join(directory, 'SHA256SUMS'), `${lines.join('\n')}\n`);
};

beforeAll(async () => {
  fixture = createRoot();
  const npmCli = process.env['npm_execpath'];
  assert.ok(npmCli);
  for (const manifest of [
    {
      name: '@moldea.ai/cli',
      version: '3.0.0',
      preferUnplugged: true,
      dependencies: { '@moldea.ai/core': '^2.0.0' },
    },
    { name: '@moldea.ai/core', version: '2.0.0' },
    { name: '@moldea.ai/website-ui', version: '1.0.0' },
  ]) {
    const source = join(fixture, manifest.name.slice('@moldea.ai/'.length));
    mkdirSync(source);
    writeFileSync(join(source, 'package.json'), JSON.stringify(manifest));
    await executeProcess({
      command: process.execPath,
      args: [npmCli, 'pack', '--ignore-scripts', '--pack-destination', fixture],
      cwd: source,
    });
    rmSync(source, { recursive: true });
  }
  writeChecksums(fixture);
  writeFileSync(join(fixture, 'packages-commit.txt'), `${PACKAGES_COMMIT}\n`);
  cpSync(
    resolve(import.meta.dirname, '../../fixtures/tooling/runtime-compatibility-publication.json'),
    join(fixture, RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME),
  );
});

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

const createCandidate = () => {
  const root = createRoot();
  const artifactDirectory = join(root, 'input');
  const outputDirectory = join(root, 'output');
  cpSync(fixture, artifactDirectory, { recursive: true });
  mkdirSync(outputDirectory);
  return { artifactDirectory, outputDirectory, packagesCommit: PACKAGES_COMMIT };
};

test('selects the complete CLI closure with identical tarball and publication bytes', () => {
  const options = createCandidate();
  const originalNames = readdirSync(options.artifactDirectory).sort();
  prepareTrustedCandidate(options);
  const candidate = loadCandidateArtifacts(options.outputDirectory);
  expect([...candidate.artifacts.keys()].sort()).toStrictEqual([
    '@moldea.ai/cli',
    '@moldea.ai/core',
  ]);
  for (const artifact of candidate.artifacts.values()) {
    expect(readFileSync(join(options.outputDirectory, artifact.archiveName))).toStrictEqual(
      readFileSync(join(options.artifactDirectory, artifact.archiveName)),
    );
  }
  expect(
    readFileSync(join(options.outputDirectory, RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME)),
  ).toStrictEqual(
    readFileSync(join(options.artifactDirectory, RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME)),
  );
  expect(readdirSync(options.artifactDirectory).sort()).toStrictEqual(originalNames);
  expect(readFileSync(join(options.outputDirectory, 'packages-commit.txt'), 'utf8')).toBe(
    `${PACKAGES_COMMIT}\n`,
  );
  const selectedManifest = readFileSync(join(options.outputDirectory, 'SHA256SUMS'), 'utf8');
  writeChecksums(options.outputDirectory);
  expect(readFileSync(join(options.outputDirectory, 'SHA256SUMS'), 'utf8')).toBe(selectedManifest);
});

test.each(['checksum', 'corrupt archive', 'source', 'publication', 'dependency', 'extra archive'])(
  'rejects invalid %s before writing candidate output',
  (failure) => {
    const options = createCandidate();
    if (failure === 'checksum')
      writeFileSync(join(options.artifactDirectory, 'SHA256SUMS'), '../unexpected.tgz\n');
    if (failure === 'corrupt archive')
      writeFileSync(join(options.artifactDirectory, 'moldea.ai-core-2.0.0.tgz'), 'corrupt bytes');
    if (failure === 'source') options.packagesCommit = 'b'.repeat(40);
    if (failure === 'publication')
      writeFileSync(
        join(options.artifactDirectory, RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME),
        '{}',
      );
    if (failure === 'dependency') {
      rmSync(join(options.artifactDirectory, 'moldea.ai-core-2.0.0.tgz'));
      writeChecksums(options.artifactDirectory);
    }
    if (failure === 'extra archive') {
      cpSync(
        join(options.artifactDirectory, 'moldea.ai-cli-3.0.0.tgz'),
        join(options.artifactDirectory, 'unexpected.tgz'),
      );
      writeChecksums(options.artifactDirectory);
    }
    expect(() => prepareTrustedCandidate(options)).toThrow();
    expect(readdirSync(options.outputDirectory)).toStrictEqual([]);
  },
);

test('rejects overlapping directories and preserves existing output', () => {
  const options = createCandidate();
  expect(() =>
    prepareTrustedCandidate({ ...options, outputDirectory: options.artifactDirectory }),
  ).toThrow('overlap');
  writeFileSync(join(options.outputDirectory, 'existing.txt'), 'preserve');
  expect(() => prepareTrustedCandidate(options)).toThrow('must be empty');
  expect(readFileSync(join(options.outputDirectory, 'existing.txt'), 'utf8')).toBe('preserve');
});
