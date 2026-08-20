import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { QUALIFICATION_ROOT } from '../constants/index.ts';
import {
  calculateDirectoryFingerprint,
  calculateSha256,
  type IDirectoryFingerprintEntry,
} from '../filesystem/index.ts';

const COMPATIBILITY_MATRIX_PATH = 'compatibility/runtimes.yaml';
const NON_BEHAVIORAL_COMPATIBILITY_FIELDS = new Set(['lastVerifiedAt', 'supportLevel']);

/** Removes maturity and verification metadata while retaining every behavioral matrix field. */
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

/**
 * Calculates the stable source-input fingerprint for the qualification suite.
 * @returns A promise resolving to the qualification input digest.
 */
export const calculateQualificationDigest = (
  qualificationRoot: string = QUALIFICATION_ROOT,
): Promise<string> =>
  calculateDirectoryFingerprint(qualificationRoot, {
    excludedDirectoryNames: new Set(['node_modules']),
    excludedRelativePathPrefixes: ['results'],
  });

/**
 * Calculates the packages input digest without treating maturity or verification dates as behavior.
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
      ? { ...entry, sha256: calculateSha256(`${JSON.stringify(normalizedMatrix)}\n`) }
      : entry,
  );

  return calculateSha256(`${JSON.stringify(normalizedEntries)}\n`);
};
