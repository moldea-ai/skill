#!/usr/bin/env node

import { realpath } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import { hasCanonicalManagedReadmeBlock } from './managed-readme.ts';
import { matchManifestScope, type IManifestScopeInput } from './manifest-scope.ts';
import { readRepositoryFile, resolveRepositoryFile } from './repository-files.ts';

const MAX_MANIFEST_BYTES = 2_097_152;
const MAX_PATH_INPUT_BYTES = 2_097_152;
const MAX_README_BYTES = 2_097_152;
const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const MANIFEST_LOGICAL_PATH = '/moldea/moldea.yaml';

/** Checks the complete repository-adoption marker contract. */
const hasInitializedProject = async (repositoryRoot: string): Promise<boolean> => {
  await Promise.all([
    resolveRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, 'moldea', 'moldea.yaml'),
      MAX_MANIFEST_BYTES,
      'reject',
    ),
    resolveRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, 'moldea', 'project.md'),
      MAX_README_BYTES,
      'reject',
    ),
  ]);

  return hasCanonicalManagedReadmeBlock(
    await readRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, 'README.md'),
      MAX_README_BYTES,
      'reject',
    ),
  );
};

/** Reads a bounded NUL-delimited repository-path set from standard input. */
const readPathInput = async (): Promise<string[]> => {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  const inputStream = process.stdin as AsyncIterable<Buffer | string>;
  for await (const chunk of inputStream) {
    const inputChunk = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    byteLength += inputChunk.byteLength;

    if (byteLength > MAX_PATH_INPUT_BYTES) {
      throw new Error('path input is too large');
    }

    chunks.push(inputChunk);
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
const parseArguments = (): { isAdoptionOnly: boolean; repositoryRoot: string } => {
  const arguments_ = process.argv.slice(2);

  if (
    arguments_.length < 2 ||
    arguments_.length > 3 ||
    arguments_[0] !== '--repository' ||
    arguments_[1] === undefined ||
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
const evaluateGate = async (): Promise<boolean> => {
  const parsed = parseArguments();
  const repositoryRoot = await realpath(parsed.repositoryRoot);

  if (!(await hasInitializedProject(repositoryRoot))) {
    return false;
  }

  if (parsed.isAdoptionOnly) {
    return true;
  }

  const [manifest, paths] = await Promise.all([
    readRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, 'moldea', 'moldea.yaml'),
      MAX_MANIFEST_BYTES,
      'reject',
    ),
    readPathInput(),
  ]);
  const result = await matchManifestScope({
    manifest: {
      content: manifest,
      path: MANIFEST_LOGICAL_PATH as IManifestScopeInput['manifest']['path'],
    },
    paths,
  });

  return result.valid && result.relevant;
};

const isRelevant = await evaluateGate().catch(() => false);

process.stdout.write(isRelevant ? '1\n' : '0\n');
