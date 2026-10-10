#!/usr/bin/env node

import { realpath } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

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
  const arguments_ = process.argv.slice(2);
  if (arguments_[0] !== '--repository' || arguments_[1] === undefined || !isAbsolute(arguments_[1]))
    throw new Error('Invalid gate arguments.');
  let isAdoptionOnly = false;
  let hasDiagnosticFlag = false;
  const paths: string[] = [];
  for (let index = 2; index < arguments_.length; index++) {
    const argument = arguments_[index];
    if (argument === '--adoption-only' && !isAdoptionOnly) isAdoptionOnly = true;
    else if (argument === '--diagnose' && !hasDiagnosticFlag) hasDiagnosticFlag = true;
    else if (
      argument === '--path' &&
      arguments_[index + 1] !== undefined &&
      !arguments_[index + 1]!.startsWith('--')
    )
      paths.push(arguments_[++index]!);
    else throw new Error('Invalid gate arguments.');
  }
  if (isAdoptionOnly && paths.length > 0) throw new Error('Adoption-only does not accept paths.');
  return {
    isAdoptionOnly,
    repositoryRoot: resolve(arguments_[1]),
    paths: paths.length === 0 ? undefined : normalizeScopePathArguments(paths),
  };
};

/** Evaluates canonical adoption and the bundled manifest relationship matcher. */
const evaluateGate = async (): Promise<boolean> => {
  const parsed = parseArguments();
  const repositoryRoot = await realpath(parsed.repositoryRoot);
  if (!(await hasInitializedProject(repositoryRoot))) return false;
  if (parsed.isAdoptionOnly) return true;
  const [manifest, paths] = await Promise.all([
    readRepositoryFile(
      repositoryRoot,
      join(repositoryRoot, 'moldea', 'moldea.yaml'),
      MAX_FOUNDATION_BYTES,
      'reject',
    ),
    parsed.paths ?? readScopePathInput(process.stdin),
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
