import type { ICarryForward401Attestation } from './carry-forward-4-0-1.mjs';

// compatible historical semantic evidence selected for the current candidate
export const resolveCompatibleHistoricalSemanticAttemptId: (options: {
  attestation: ICarryForward401Attestation | null;
  candidateCliClosureDigest: string | null;
  candidatePortableSkillBehaviorDigest: string | null;
  candidateSemanticCompatibilityDigest: string | null;
  semanticResultSha256: string | null;
}) => string | null;
