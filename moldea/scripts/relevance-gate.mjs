#!/usr/bin/env node

import { lstat, readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import { hasCanonicalManagedReadmeBlock } from './managed-readme.mjs';
import { loadRepositoryCore } from './repository-package.mjs';

const MAX_MANIFEST_BYTES = 2_097_152;
const MAX_PATH_INPUT_BYTES = 2_097_152;
const MAX_README_BYTES = 2_097_152;
const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** Verifies one bounded regular file without reading its content. */
const assertBoundedRegularFile = async (filePath, maximumBytes) => {
  const fileStat = await lstat(filePath);

  if (!fileStat.isFile() || fileStat.size > maximumBytes) {
    throw new Error('invalid file');
  }
};

/** Reads one bounded regular file without following a file-level symbolic link. */
const readBoundedRegularFile = async (filePath, maximumBytes) => {
  await assertBoundedRegularFile(filePath, maximumBytes);

  const bytes = await readFile(filePath);

  if (bytes.byteLength > maximumBytes) {
    throw new Error('invalid file');
  }

  return bytes;
};

/** Checks the complete repository-adoption marker contract. */
const hasInitializedProject = async (repositoryRoot) => {
  await Promise.all([
    assertBoundedRegularFile(join(repositoryRoot, 'moldea', 'moldea.yaml'), MAX_MANIFEST_BYTES),
    assertBoundedRegularFile(join(repositoryRoot, 'moldea', 'project.md'), MAX_README_BYTES),
  ]);

  return hasCanonicalManagedReadmeBlock(
    await readBoundedRegularFile(join(repositoryRoot, 'README.md'), MAX_README_BYTES),
  );
};

/** Reads a bounded NUL-delimited repository-path set from standard input. */
const readPathInput = async () => {
  const chunks = [];
  let byteLength = 0;

  for await (const chunk of process.stdin) {
    byteLength += chunk.byteLength;

    if (byteLength > MAX_PATH_INPUT_BYTES) {
      throw new Error('path input is too large');
    }

    chunks.push(chunk);
  }

  const input = Buffer.concat(chunks, byteLength);

  if (input.byteLength === 0 || input.at(-1) !== 0) {
    throw new Error('invalid path input');
  }

  const paths = utf8Decoder.decode(input.subarray(0, -1)).split('\0');

  if (paths.some((path) => path.length === 0)) {
    throw new Error('invalid path input');
  }

  return paths.map((path) => {
    if (/^[A-Za-z]:/u.test(path) || path.startsWith('\\\\')) {
      throw new Error('invalid path input');
    }

    return path.startsWith('/') ? path : `/${path}`;
  });
};

/** Parses the closed command contract. */
const parseArguments = () => {
  const arguments_ = process.argv.slice(2);

  if (
    arguments_.length < 2 ||
    arguments_.length > 3 ||
    arguments_[0] !== '--repository' ||
    !isAbsolute(arguments_[1]) ||
    (arguments_.length === 3 && arguments_[2] !== '--adoption-only')
  ) {
    throw new Error('invalid arguments');
  }

  return {
    isAdoptionOnly: arguments_[2] === '--adoption-only',
    repositoryRoot: resolve(arguments_[1]),
  };
};

/** Evaluates adoption and, when requested, manifest relationship relevance. */
const evaluateGate = async () => {
  const { isAdoptionOnly, repositoryRoot } = parseArguments();

  if (!(await hasInitializedProject(repositoryRoot))) {
    return false;
  }

  if (isAdoptionOnly) {
    return true;
  }

  const [core, manifest, paths] = await Promise.all([
    loadRepositoryCore(repositoryRoot),
    readBoundedRegularFile(join(repositoryRoot, 'moldea', 'moldea.yaml'), MAX_MANIFEST_BYTES),
    readPathInput(),
  ]);
  const result = await core.matchManifestScope({
    manifest: { content: manifest, path: '/moldea/moldea.yaml' },
    paths,
  });

  return result.valid && result.relevant;
};

let isRelevant = false;

try {
  isRelevant = await evaluateGate();
} catch {
  isRelevant = false;
}

process.stdout.write(isRelevant ? '1\n' : '0\n');
