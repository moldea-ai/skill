import { QUALIFICATION_ROOT } from '../constants/index.ts';
import { calculateDirectoryFingerprint } from '../filesystem/index.ts';

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
