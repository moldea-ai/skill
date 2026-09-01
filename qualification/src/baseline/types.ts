import { z } from 'zod';

// deterministic Custom-baseline decision persisted with each adapter attempt
export const QualificationBaselineCheckSchema = z.strictObject({
  required: z.boolean(),
  passed: z.boolean(),
  status: z.enum(['incompatible', 'missing', 'not-required', 'passed']),
  baselineAttemptId: z.string().trim().min(1).nullable(),
  failures: z.array(z.string()),
});

export type IQualificationBaselineCheck = z.infer<typeof QualificationBaselineCheckSchema>;
