import { z } from 'zod';

import type { IEvidenceBundle } from '../../evidence/index.ts';

import { JourneyCampaignSchema, HashSchema, JOURNEY_PLATFORMS } from '../index.ts';

import { LegacyWebsiteModelSchema, type IJourneyWebsiteResult as ILegacyResult } from './legacy.ts';

// one producer-owned source inventory supports both direct and composed presentation
const CaptureSchema = z.object({
  patch: z.string(),
  files: z.array(
    z.object({ path: z.string(), status: z.enum(['created', 'modified', 'deleted']) }),
  ),
});
export const CampaignSourceSchema = z.object({
  id: HashSchema,
  kind: z.literal('campaign'),
  assessment: JourneyCampaignSchema,
  assessmentUrl: z.string(),
  definitionsUrl: z.string(),
  artifactRoot: z.string(),
  captures: z.record(z.string(), CaptureSchema),
});
const LegacySourceSchema = z.object({
  id: z.string(),
  kind: z.literal('legacy'),
  model: LegacyWebsiteModelSchema,
});
export const JourneySourceSchema = z.discriminatedUnion('kind', [
  CampaignSourceSchema,
  LegacySourceSchema,
]);
export const JourneyCellSchema = z.object({
  platform: z.enum(JOURNEY_PLATFORMS),
  journeyId: z.string(),
  sourceId: z.string(),
});
export const ScriptedJourneysWebsiteModelSchema = z.object({
  presentationVersion: z.literal(2),
  route: z.literal('/evidence/journeys/'),
  runId: z.string(),
  evaluatedAt: z.string(),
  status: z.enum(['passed', 'failed', 'incomplete']),
  currentSourceId: z.string(),
  sources: z.array(JourneySourceSchema).min(1),
  cells: z.array(JourneyCellSchema),
  journeys: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
      route: z.string(),
      current: z.boolean(),
      catalogSourceId: z.string().optional(),
    }),
  ),
  coverage: z.array(
    z.object({
      platform: z.enum(JOURNEY_PLATFORMS),
      recorded: z.number().int().nonnegative(),
      current: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
      recovered: z.number().int().nonnegative(),
      pending: z.number().int().nonnegative(),
    }),
  ),
});
// transient render results preserve the established captured-evidence content contract
export type IJourneyWebsiteResult = ILegacyResult;
export type IScriptedJourneysWebsiteModel = z.infer<typeof ScriptedJourneysWebsiteModelSchema>;
export type IJourneyEvidenceSource = z.infer<typeof JourneySourceSchema>;
export type IJourneyEvidenceCell = z.infer<typeof JourneyCellSchema>;

// validated local input retains artifact bytes separately from the source-aware projection
export type IParsedJourneysEvidenceRecord = {
  bundle: IEvidenceBundle;
  model: IScriptedJourneysWebsiteModel;
};
