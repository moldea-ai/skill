import { z } from 'zod';

import { JOURNEY_PLATFORMS, RUN_ID_PATTERN } from '../constants.ts';
import {
  HashSchema,
  JourneyConfigurationSchema,
  JourneyActivitySchema,
  JourneyCheckResultSchema,
  JourneyFactsSchema,
  JourneyOutcomeSchema,
  JourneysBundleSchema,
} from '../types.ts';

const IdentifierSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  .max(48);
export const LegacyAssessmentSchema = z.object({
  runId: z.string().regex(RUN_ID_PATTERN),
  status: z.enum(['passed', 'failed', 'incomplete']),
  evaluatedAt: z.iso.datetime(),
  assessor: z.object({ commit: z.string(), sourceSha256: HashSchema }),
  bundleSha256: HashSchema,
  platforms: z.array(
    z.object({
      platform: z.enum(JOURNEY_PLATFORMS),
      configuration: JourneyConfigurationSchema,
      environment: z.record(z.string(), z.string()),
      restartCounts: z.record(z.string(), z.number()),
      journeys: z.array(
        z.object({
          id: IdentifierSchema,
          status: JourneyOutcomeSchema,
          steps: z.array(
            z.object({
              id: IdentifierSchema,
              status: JourneyOutcomeSchema,
              checks: z.array(JourneyCheckResultSchema),
              unverified: z.array(z.string()),
              facts: JourneyFactsSchema.nullable(),
              reply: z.string(),
              activity: JourneyActivitySchema.nullable(),
            }),
          ),
        }),
      ),
    }),
  ),
});

// additive presentation contracts retain the origin of every displayed observation
const PlatformSchema = LegacyAssessmentSchema.shape.platforms.element.omit({ journeys: true });
const ResultSchema = z.object({
  platform: z.enum(JOURNEY_PLATFORMS),
  status: JourneyOutcomeSchema,
  checks: z.array(JourneyCheckResultSchema),
  unverified: z.array(z.string()),
  facts: JourneyFactsSchema.nullable(),
  reply: z.string(),
  activity: JourneyActivitySchema.nullable(),
  files: z.array(
    z.object({ path: z.string(), status: z.enum(['created', 'modified', 'deleted']) }),
  ),
  patch: z.string(),
  patchUrl: z.string().nullable(),
  replyUrl: z.string().nullable(),
  activityUrl: z.string().nullable(),
});

export const LegacyWebsiteModelSchema = LegacyAssessmentSchema.omit({
  platforms: true,
}).extend({
  route: z.literal('/evidence/journeys/'),
  skill: JourneysBundleSchema.shape.skill,
  instructions: z.object({ version: z.literal(1), sha256: z.string().regex(/^[a-f0-9]{64}$/u) }),
  assessmentUrl: z.string(),
  definitionsUrl: z.string(),
  platforms: z.array(PlatformSchema),
  journeys: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
      route: z.string(),
      steps: z.array(
        z.object({
          id: z.string(),
          request: z.string(),
          results: z.array(ResultSchema),
        }),
      ),
    }),
  ),
});

export type ILegacyWebsiteModel = z.infer<typeof LegacyWebsiteModelSchema>;
export type IJourneyWebsiteResult = z.infer<typeof ResultSchema>;
