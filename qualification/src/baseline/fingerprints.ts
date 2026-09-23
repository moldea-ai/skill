import { SKILL_REPOSITORY_ROOT } from '../constants/index.ts';
import { createQualificationCompatibilityIdentity } from '../evidence-identity/index.ts';

// one immutable evaluator identity is shared by every target in the current process
const baselineDigestByRepositoryRoot = new Map<string, Promise<string>>();

/**
 * Calculates the versioned Custom evaluator and universal logical-input identity at one commit.
 * @param commit The exact qualification source commit.
 * @param repositoryRoot The repository containing qualification and shared evaluator inputs.
 * @returns A promise resolving to the reusable Custom baseline evaluator digest.
 */
export const calculateQualificationBaselineDigest = async (
  repositoryRoot: string = SKILL_REPOSITORY_ROOT,
): Promise<string> => {
  const cachedDigest = baselineDigestByRepositoryRoot.get(repositoryRoot);
  if (cachedDigest !== undefined) return cachedDigest;

  const pendingDigest = createQualificationCompatibilityIdentity({
    repositoryRoot,
    selection: { adapterId: 'custom', implementationId: 'custom' },
  }).then((identity) => identity.qualificationBaselineEvaluatorDigest);
  baselineDigestByRepositoryRoot.set(repositoryRoot, pendingDigest);

  try {
    return await pendingDigest;
  } catch (error) {
    baselineDigestByRepositoryRoot.delete(repositoryRoot);
    throw error;
  }
};
