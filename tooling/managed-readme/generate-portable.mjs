#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { chmod, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { assertCanonicalManagedReadmeBlock } from './managed-readme.template.mjs';

const RESERVED_LITERAL = '__MOLDEA_MANAGED_README_BLOCK_JSON__';
const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_TEMPLATE_PATH = join(
  SOURCE_ROOT,
  'tooling/managed-readme/managed-readme.template.mjs',
);
const DEFAULT_ASSET_PATH = join(SOURCE_ROOT, 'moldea/assets/managed-readme-block.md');
const DEFAULT_OUTPUT_PATH = join(SOURCE_ROOT, 'moldea/scripts/managed-readme.mjs');

const decodeUtf8 = (bytes, description) => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${description} is not valid UTF-8`);
  }
};

/**
 * Injects the canonical block into the single reserved template literal.
 * @param {string} templateSource The complete authored template source.
 * @param {string} managedReadmeBlock The canonical block text.
 * @returns {string} The complete portable runtime source.
 */
export const createPortableManagedReadmeSource = (templateSource, managedReadmeBlock) => {
  assertCanonicalManagedReadmeBlock(managedReadmeBlock);
  const reservedLiteral = `'${RESERVED_LITERAL}'`;
  const firstIndex = templateSource.indexOf(reservedLiteral);
  const lastIndex = templateSource.lastIndexOf(reservedLiteral);

  if (firstIndex === -1 || firstIndex !== lastIndex) {
    throw new Error('The managed README template must contain exactly one reserved literal');
  }

  const portableSource = `${templateSource.slice(0, firstIndex)}${JSON.stringify(managedReadmeBlock)}${templateSource.slice(firstIndex + reservedLiteral.length)}`;

  if (portableSource.includes(RESERVED_LITERAL)) {
    throw new Error('The generated managed README script retains its reserved literal');
  }

  return portableSource;
};

const writeAtomically = async (filePath, source) => {
  const temporaryPath = join(dirname(filePath), `.mr.${process.pid}.${randomUUID()}.tmp`);

  try {
    await writeFile(temporaryPath, source, { flag: 'wx', mode: 0o755 });
    await chmod(temporaryPath, 0o755);
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};

/**
 * Generates or verifies the self-contained portable writer.
 * @param {{ check?: boolean, templatePath?: string, assetPath?: string, outputPath?: string }} options Generation paths and mode.
 * @returns {Promise<'generated' | 'current'>} The completed generation status.
 */
export const generatePortableManagedReadme = async ({
  check = false,
  templatePath = DEFAULT_TEMPLATE_PATH,
  assetPath = DEFAULT_ASSET_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
} = {}) => {
  const [templateBytes, assetBytes] = await Promise.all([
    readFile(templatePath),
    readFile(assetPath),
  ]);
  const templateSource = decodeUtf8(templateBytes, 'Managed README template');
  const managedReadmeBlock = decodeUtf8(assetBytes, 'Managed README asset');
  const portableSource = createPortableManagedReadmeSource(templateSource, managedReadmeBlock);

  if (check) {
    const currentSource = decodeUtf8(await readFile(outputPath), 'Generated managed README script');

    if (currentSource !== portableSource) {
      throw new Error('The generated managed README script is stale');
    }

    return 'current';
  }

  await writeAtomically(outputPath, portableSource);
  return 'generated';
};

const parseArguments = (argumentsList) => {
  if (argumentsList.length === 0) {
    return false;
  }

  if (argumentsList.length === 1 && argumentsList[0] === '--check') {
    return true;
  }

  throw new Error('Usage: generate-portable.mjs [--check]');
};

const isDirectExecution =
  process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  try {
    const check = parseArguments(process.argv.slice(2));
    const status = await generatePortableManagedReadme({ check });
    process.stdout.write(`${status}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown failure';
    process.stderr.write(`managed README generation failed: ${message}\n`);
    process.exitCode = 1;
  }
}
