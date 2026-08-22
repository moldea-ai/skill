import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import {
  QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES,
  QUALIFICATION_ROOT,
  SKILL_REPOSITORY_ROOT,
} from '../constants/index.ts';
import {
  collectDirectoryFingerprintEntries,
  calculateSha256,
  type IDirectoryFingerprintEntry,
} from '../filesystem/index.ts';

const COMPATIBILITY_MATRIX_PATH = 'compatibility/runtimes.yaml';
const NON_BEHAVIORAL_COMPATIBILITY_FIELDS = new Set(['lastVerifiedAt', 'qualificationEvidence']);

// one namespaced source root included in the qualification engine identity
export type IQualificationDigestRoot = {
  pathPrefix: string;
  rootDirectory: string;
  excludedDirectoryNames?: ReadonlySet<string>;
  excludedRelativePathPrefixes?: readonly string[];
};

const DEFAULT_QUALIFICATION_DIGEST_ROOTS: readonly IQualificationDigestRoot[] = [
  {
    pathPrefix: QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES[0],
    rootDirectory: QUALIFICATION_ROOT,
    excludedDirectoryNames: new Set(['node_modules']),
    excludedRelativePathPrefixes: ['results'],
  },
  ...QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES.slice(1).map((pathPrefix) => ({
    pathPrefix,
    rootDirectory: path.join(SKILL_REPOSITORY_ROOT, pathPrefix),
  })),
];

/** Removes publication metadata while retaining every behavioral matrix field. */
const normalizeCompatibilityInput = (input: unknown): unknown => {
  if (Array.isArray(input)) {
    return input.map(normalizeCompatibilityInput);
  }

  if (typeof input !== 'object' || input === null) {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input)
      .filter(([fieldName]) => !NON_BEHAVIORAL_COMPATIBILITY_FIELDS.has(fieldName))
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([fieldName, fieldValue]) => [fieldName, normalizeCompatibilityInput(fieldValue)]),
  );
};

/** Calculates a stable digest for behavior-bearing compatibility data. */
export const calculateCompatibilityBehaviorDigest = (input: unknown): string =>
  calculateSha256(`${JSON.stringify(normalizeCompatibilityInput(input))}\n`);

/**
 * Calculates the stable source-input fingerprint for the qualification suite.
 * @returns A promise resolving to the qualification input digest.
 */
export const calculateQualificationDigest = async (
  digestRoots: readonly IQualificationDigestRoot[] = DEFAULT_QUALIFICATION_DIGEST_ROOTS,
): Promise<string> => {
  const entries = (
    await Promise.all(
      digestRoots.map(async (digestRoot) => {
        const rootEntries = await collectDirectoryFingerprintEntries(digestRoot.rootDirectory, {
          ...(digestRoot.excludedDirectoryNames === undefined
            ? {}
            : { excludedDirectoryNames: digestRoot.excludedDirectoryNames }),
          ...(digestRoot.excludedRelativePathPrefixes === undefined
            ? {}
            : { excludedRelativePathPrefixes: digestRoot.excludedRelativePathPrefixes }),
        });

        return rootEntries.map((entry) => ({
          ...entry,
          path: path.posix.join(digestRoot.pathPrefix, entry.path),
        }));
      }),
    )
  )
    .flat()
    .sort((left, right) => left.path.localeCompare(right.path, 'en'));

  return calculateSha256(`${JSON.stringify(entries)}\n`);
};

/**
 * Calculates the packages input digest without treating verification metadata as behavior.
 * @param packagesRepository The selected packages repository root.
 * @param repositoryEntries The exact package repository fingerprint entries.
 * @returns A promise resolving to the behavior-sensitive package input digest.
 */
export const calculatePackagesQualificationDigest = async (
  packagesRepository: string,
  repositoryEntries: readonly IDirectoryFingerprintEntry[],
): Promise<string> => {
  const matrixEntry = repositoryEntries.find(
    ({ path: relativePath }) => relativePath === COMPATIBILITY_MATRIX_PATH,
  );

  if (matrixEntry === undefined) {
    throw new Error(`Packages repository is missing ${COMPATIBILITY_MATRIX_PATH}.`);
  }

  const matrixSource = await readFile(
    path.join(packagesRepository, COMPATIBILITY_MATRIX_PATH),
    'utf8',
  );
  const normalizedMatrix = normalizeCompatibilityInput(parseYaml(matrixSource) as unknown);
  const normalizedEntries = repositoryEntries.map((entry) =>
    entry.path === COMPATIBILITY_MATRIX_PATH
      ? { ...entry, sha256: calculateCompatibilityBehaviorDigest(normalizedMatrix) }
      : entry,
  );

  return calculateSha256(`${JSON.stringify(normalizedEntries)}\n`);
};
