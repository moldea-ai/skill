import { z } from 'zod';

// exhaustive profile-claim coverage result persisted with each attempt
export const QualificationCoverageResultSchema = z.strictObject({
  passed: z.boolean(),
  requiredClaims: z.array(z.string().trim().min(1)),
  declaredClaims: z.array(z.string().trim().min(1)),
  missingClaims: z.array(z.string().trim().min(1)),
  unknownClaims: z.array(z.string().trim().min(1)),
  uncoveredCaseIds: z.array(z.string().trim().min(1)),
});

export type IQualificationCoverageResult = z.infer<typeof QualificationCoverageResultSchema>;
