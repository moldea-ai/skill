import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createCliClosureDigest,
  createPortableSkillBehaviorDigest,
  createSemanticCompatibilityDigest,
} from '../../../../tooling/evidence-identity/index.mjs';
import { readCarryForward401Attestation } from '../../../../tooling/release-identity/carry-forward-4-0-1.mjs';
import { resolveCompatibleHistoricalSemanticAttemptId } from '../../../../tooling/release-identity/historical-semantic.mjs';

const SEMANTIC_RESULT_PATH = 'fixtures/semantic-evaluation-result.json';
const SEMANTIC_ATTEMPTS_PATH = 'fixtures/semantic-evaluation-results/attempts';

const createFileSha256 = (path: string): string | null =>
  existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : null;

/**
 * Selects the immutable carried attempt that is compatible with the current release candidate.
 * @param repositoryRoot Repository root containing the attestation and semantic evidence.
 * @returns The compatible attempt ID, or null when no carried evidence matches.
 */
export const resolveCompatibleSemanticAttemptId = (repositoryRoot: string): string | null => {
  const attestation = readCarryForward401Attestation(repositoryRoot);
  if (attestation === null) return null;

  const semanticResultSha256 = createFileSha256(join(repositoryRoot, SEMANTIC_RESULT_PATH));
  if (semanticResultSha256 === null) return null;

  const attemptId = resolveCompatibleHistoricalSemanticAttemptId({
    attestation,
    candidateCliClosureDigest: createCliClosureDigest(repositoryRoot),
    candidatePortableSkillBehaviorDigest: createPortableSkillBehaviorDigest(repositoryRoot),
    candidateSemanticCompatibilityDigest: createSemanticCompatibilityDigest(repositoryRoot),
    semanticResultSha256,
  });
  if (attemptId === null) return null;

  const attemptRoot = join(repositoryRoot, SEMANTIC_ATTEMPTS_PATH, attemptId);
  const hasAttestedAttemptFiles =
    createFileSha256(join(attemptRoot, 'attempt.json')) === attestation.semantic.attemptSha256 &&
    createFileSha256(join(attemptRoot, 'evidence.json')) === attestation.semantic.evidenceSha256;

  return hasAttestedAttemptFiles ? attemptId : null;
};
