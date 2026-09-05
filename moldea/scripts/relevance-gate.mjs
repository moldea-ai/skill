#!/usr/bin/env node

import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EXPECTED_CLI_VERSION = '7.0.0';
const EXPECTED_CORE_VERSION = '3.0.0';
const MAX_MANIFEST_BYTES = 2_097_152;
const MAX_PATH_INPUT_BYTES = 2_097_152;
const MAX_README_BYTES = 2_097_152;
const START_MARKER = '<!-- moldea:start -->';
const END_MARKER = '<!-- moldea:end -->';
const utf8Decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** Returns whether a resolved path remains inside the trusted root. */
const isPathWithin = (trustedRoot, candidatePath) => {
  const relativePath = relative(trustedRoot, candidatePath);

  return (
    relativePath === '' ||
    (!relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !isAbsolute(relativePath))
  );
};

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

/** Reads and validates one JSON object from a bounded regular file. */
const readJsonObject = async (filePath) => {
  const parsed = JSON.parse(utf8Decoder.decode(await readBoundedRegularFile(filePath, 65_536)));

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('invalid package metadata');
  }

  return parsed;
};

/** Checks the complete repository-adoption marker contract. */
const hasInitializedProject = async (repositoryRoot) => {
  await Promise.all([
    assertBoundedRegularFile(join(repositoryRoot, 'moldea', 'moldea.yaml'), MAX_MANIFEST_BYTES),
    assertBoundedRegularFile(join(repositoryRoot, 'moldea', 'project.md'), MAX_README_BYTES),
  ]);

  const readme = utf8Decoder.decode(
    await readBoundedRegularFile(join(repositoryRoot, 'README.md'), MAX_README_BYTES),
  );
  const lines = readme.split(/\r?\n/u);
  const startLines = lines.flatMap((line, index) => (line === START_MARKER ? [index] : []));
  const endLines = lines.flatMap((line, index) => (line === END_MARKER ? [index] : []));

  return startLines.length === 1 && endLines.length === 1 && startLines[0] < endLines[0];
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

/** Loads the exact repository-root Core implementation declared by the supported CLI. */
const loadRepositoryCore = async (repositoryRoot) => {
  const projectManifest = await readJsonObject(join(repositoryRoot, 'package.json'));

  if (projectManifest.devDependencies?.['@moldea.ai/cli'] !== EXPECTED_CLI_VERSION) {
    throw new Error('unsupported CLI dependency');
  }

  const nodeModulesRoot = await realpath(join(repositoryRoot, 'node_modules'));
  const cliRoot = await realpath(join(nodeModulesRoot, '@moldea.ai', 'cli'));
  const coreEntry = await realpath(
    fileURLToPath(
      import.meta.resolve('@moldea.ai/core', pathToFileURL(join(cliRoot, 'package.json')).href),
    ),
  );
  const coreRoot = dirname(dirname(coreEntry));

  if (!isPathWithin(nodeModulesRoot, cliRoot) || !isPathWithin(nodeModulesRoot, coreRoot)) {
    throw new Error('package escaped repository dependencies');
  }

  const cliManifest = await readJsonObject(join(cliRoot, 'package.json'));
  const coreManifest = await readJsonObject(join(coreRoot, 'package.json'));

  if (
    cliManifest.name !== '@moldea.ai/cli' ||
    cliManifest.version !== EXPECTED_CLI_VERSION ||
    cliManifest.dependencies?.['@moldea.ai/core'] !== EXPECTED_CORE_VERSION ||
    coreManifest.name !== '@moldea.ai/core' ||
    coreManifest.version !== EXPECTED_CORE_VERSION
  ) {
    throw new Error('unsupported package closure');
  }

  if (relative(coreRoot, coreEntry).split(sep).join('/') !== 'dist/index.js') {
    throw new Error('Core entry escaped its package');
  }

  const coreModule = await import(pathToFileURL(coreEntry).href);

  if (typeof coreModule.createCore !== 'function') {
    throw new Error('invalid Core entry');
  }

  return coreModule.createCore();
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
