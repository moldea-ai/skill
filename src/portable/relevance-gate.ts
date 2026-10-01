#!/usr/bin/env node

import { realpath } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import { hasCanonicalManagedReadmeBlock } from './managed-readme.ts';
import { matchManifestScope, type IManifestScopeInput } from './manifest-scope.ts';
import { readRepositoryFile, resolveRepositoryFile } from './repository-files.ts';
import { readScopePathInput } from './scope-path-input.ts';

const MAX_MANIFEST_BYTES = 2_097_152;
const MAX_README_BYTES = 2_097_152;
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
    readScopePathInput(process.stdin),
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
