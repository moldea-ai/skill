import { SKILL_REPOSITORY_ROOT } from '../constants/index.ts';
import { createQualificationCompatibilityIdentityAtCommit } from '../evidence-identity/index.ts';

/**
 * Calculates the versioned Custom evaluator and universal logical-input identity at one commit.
 * @param commit The exact qualification source commit.
 * @param repositoryRoot The repository containing qualification and shared evaluator inputs.
 * @returns A promise resolving to the reusable Custom baseline evaluator digest.
 */
export const calculateQualificationBaselineDigestAtCommit = async (
  commit: string,
  repositoryRoot: string = SKILL_REPOSITORY_ROOT,
): Promise<string> => {
  const identity = await createQualificationCompatibilityIdentityAtCommit({
    commit,
    repositoryRoot,
    selection: { adapterId: 'custom', implementationId: 'custom' },
  });

  return identity.qualificationBaselineEvaluatorDigest;
};
