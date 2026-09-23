import { z } from 'zod';

import { QualificationAttemptResultSchema } from './types.ts';
import type { IQualificationWebsiteModel } from './types.ts';

const AttemptSchema = z.looseObject({
  artifacts: z.array(z.looseObject({ path: z.string(), rawUrl: z.string() })),
  cases: z.array(
    z.looseObject({
      artifacts: z.array(z.unknown()),
      replay: z.looseObject({ trials: z.array(z.unknown()) }),
      result: z.looseObject({ caseId: z.string() }),
      trials: z.array(z.unknown()),
    }),
  ),
  evidenceSource: z.strictObject({ kind: z.literal('recorded') }),
  rawAttemptUrl: z.string(),
  result: QualificationAttemptResultSchema,
});
const ProfileCaseSchema = z.looseObject({
  id: z.string(),
  purpose: z.string(),
  task: z.string(),
  title: z.string(),
});
const ProfileSchema = z.looseObject({
  adapterId: z.string(),
  attempts: z.array(AttemptSchema),
  cases: z.array(ProfileCaseSchema),
  currentLastPassing: AttemptSchema.nullable(),
  currentLatest: AttemptSchema.nullable(),
  currentStatus: z.enum(['errored', 'failed', 'incomplete', 'not-recorded', 'passed']),
  description: z.string(),
  implementationId: z.string(),
  route: z.string(),
  sharedCases: z.array(ProfileCaseSchema),
  title: z.string(),
});
const QualificationWebsiteModelSchema = z.looseObject({
  profiles: z.array(ProfileSchema).min(1),
  route: z.string(),
  uniqueJourneyCount: z.number().int().nonnegative(),
});

/** Validates the public qualification presentation model at an evidence boundary. */
export const parseQualificationWebsiteModel = (input: unknown): IQualificationWebsiteModel =>
  QualificationWebsiteModelSchema.parse(input) as unknown as IQualificationWebsiteModel;
