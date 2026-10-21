#!/usr/bin/env node

import { realpath } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { parseStrictArgs } from 'jg-process';

import { matchManifestScope, type IManifestScopeInput } from './manifest-scope.ts';
import { readRepositoryFile, resolveRepositoryFile } from './repository-files.ts';
import { normalizeScopePathArguments, readScopePathInput } from './scope-path-input.ts';

const MAX_FOUNDATION_BYTES = 2_097_152;

/** Checks foundation presence without treating discovery as complete structural validation. */
const hasInitializedProject = async (repositoryRoot: string): Promise<boolean> => {
  try {
    await Promise.all(
      ['moldea.yaml', 'project.md'].map((fileName) =>
        resolveRepositoryFile(
          repositoryRoot,
          join(repositoryRoot, 'moldea', fileName),
          MAX_FOUNDATION_BYTES,
          'reject',
        ),
      ),
    );
    return true;
  } catch (error) {
    if (error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return false;
    throw error;
  }
};

/** Parses only the supported modes; argv paths never consume stdin. */
const parseArguments = (): {
  isAdoptionOnly: boolean;
  repositoryRoot: string;
  paths: string[] | undefined;
} => {
  const {
    'adoption-only': isAdoptionOnly,
    path: paths,
    repository,
  } = parseStrictArgs(process.argv.slice(2), {
    'adoption-only': { type: 'boolean' },
    diagnose: { type: 'boolean' },
    path: { type: 'string', multiple: true },
    repository: { type: 'string', required: true },
  });
  if (!isAbsolute(repository)) throw new Error('Invalid gate arguments.');
  if (isAdoptionOnly && paths.length > 0) throw new Error('Adoption-only does not accept paths.');
  return {
    isAdoptionOnly,
    repositoryRoot: resolve(repository),
    paths: paths.length === 0 ? undefined : paths,
  };
};

/** Evaluates canonical adoption and the bundled manifest relationship matcher. */
const evaluateGate = async (): Promise<boolean> => {
  const parsed = parseArguments();
  const repositoryRoot = await realpath(parsed.repositoryRoot);
  const context = { repositoryRoot: parsed.repositoryRoot, resolvedRepositoryRoot: repositoryRoot };
  const argvPaths =
    parsed.paths === undefined ? undefined : normalizeScopePathArguments(parsed.paths, context);
  if (!(await hasInitializedProject(repositoryRoot))) return false;
  if (parsed.isAdoptionOnly) return true;
  const [manifest, paths] = await Promise.all([
    readRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, 'moldea', 'moldea.yaml'),
      MAX_FOUNDATION_BYTES,
      'reject',
    ),
    argvPaths ?? readScopePathInput(context),
  ]);
  const result = await matchManifestScope({
    manifest: {
      content: manifest,
      path: '/moldea/moldea.yaml' as IManifestScopeInput['manifest']['path'],
    },
    paths,
  });
  if (!result.valid) throw new Error('Invalid manifest or relationship path input.');
  return result.relevant;
};

try {
  process.stdout.write((await evaluateGate()) ? '1\n' : '0\n');
} catch {
  if (process.argv.slice(2).includes('--diagnose')) {
    process.stderr.write(
      'moldea gate failed: check arguments, canonical files, and relationship paths.\n',
    );
    process.exitCode = 1;
  } else process.stdout.write('0\n');
}
