import { z } from 'zod';

import { JOURNEY_PLATFORMS } from '../constants.ts';
import {
  JourneyActivitySchema,
  JourneyAssessmentSchema,
  JourneyCheckResultSchema,
  JourneyFactsSchema,
  JourneyOutcomeSchema,
  JourneysBundleSchema,
} from '../types.ts';

// additive presentation contracts retain the origin of every displayed observation
const PlatformSchema = JourneyAssessmentSchema.shape.platforms.element.omit({ journeys: true });
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

export const ScriptedJourneysWebsiteModelSchema = JourneyAssessmentSchema.omit({
  platforms: true,
}).extend({
  route: z.literal('/evidence/journeys/'),
  skill: JourneysBundleSchema.shape.skill,
  instructions: JourneysBundleSchema.shape.instructions,
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

export type IScriptedJourneysWebsiteModel = z.infer<typeof ScriptedJourneysWebsiteModelSchema>;
export type IJourneyWebsiteResult = z.infer<typeof ResultSchema>;
