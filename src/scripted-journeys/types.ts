import { z } from 'zod';

import { EVALUATION_CONFIRMATION_POLICY } from '../execution/confirmation/index.ts';

import { JOURNEY_PLATFORMS, JOURNEYS_FORMAT_VERSION, RUN_ID_PATTERN } from './constants.ts';

// closed exchange contracts reject unsupported harness state and grading inputs
const IdentifierSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  .max(48);
export const HashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const FileHashesSchema = z.record(z.string(), HashSchema);
const FixtureSchema = z
  .strictObject({
    adopted: z.boolean(),
    installCli: z.boolean(),
    integrationDrift: z.boolean().optional(),
  })
  .refine((fixture) => !fixture.integrationDrift || fixture.adopted, {
    message: 'Integration drift requires an adopted fixture.',
  });
const ReferenceSchema = z.strictObject({ path: z.string(), statement: z.string().min(1) });
const SinceSchema = z.enum(['step', 'fixture']).default('step');

export const JourneyCheckSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('path-exists'), path: z.string() }),
  z.strictObject({ kind: z.literal('path-absent'), path: z.string() }),
  z.strictObject({ kind: z.literal('no-changes') }),
  z.strictObject({ kind: z.literal('paths-changed'), paths: z.array(z.string()).min(1) }),
  z.strictObject({
    kind: z.literal('paths-unchanged'),
    paths: z.array(z.string()).min(1),
    since: SinceSchema,
  }),
  z.strictObject({
    kind: z.literal('content-matches'),
    path: z.string(),
    pattern: z.string().min(1),
  }),
  z.strictObject({ kind: z.literal('validate'), result: z.enum(['valid', 'invalid']) }),
  z.strictObject({
    kind: z.literal('reply-matches'),
    pattern: z.string().min(1),
    absent: z.string().optional(),
    skillBehavior: z.boolean().default(false),
    reference: ReferenceSchema.optional(),
  }),
]);

export const JourneyDefinitionSchema = z
  .strictObject({
    id: IdentifierSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    order: z.number().int().nonnegative(),
    fixture: FixtureSchema,
    steps: z
      .array(
        z.strictObject({
          id: IdentifierSchema,
          request: z.string().min(1),
          dependsOn: z.array(IdentifierSchema),
          checks: z.array(JourneyCheckSchema).min(1),
          unverified: z.array(z.string().min(1)),
        }),
      )
      .min(1),
  })
  .superRefine((journey, context) => {
    const seen = new Set<string>();
    for (const step of journey.steps) {
      if (seen.has(step.id) || step.dependsOn.some((id) => !seen.has(id))) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate step or non-earlier dependency: ${step.id}`,
        });
      }
      seen.add(step.id);
      for (const check of step.checks) {
        if (
          check.kind === 'reply-matches' &&
          check.skillBehavior &&
          check.reference === undefined
        ) {
          context.addIssue({
            code: 'custom',
            message: `Skill behavior requires a reference: ${step.id}`,
          });
        }
        if ('pattern' in check) {
          try {
            new RegExp(check.pattern, 'iu');
            if ('absent' in check && check.absent) new RegExp(check.absent, 'iu');
          } catch {
            context.addIssue({ code: 'custom', message: `Invalid pattern: ${step.id}` });
          }
        }
      }
    }
  });

export const JourneyStepsSchema = z
  .array(
    z.strictObject({
      id: IdentifierSchema,
      request: z.string().min(1),
      dependsOn: z.array(IdentifierSchema),
    }),
  )
  .min(1);
export const JourneysBundleSchema = z.strictObject({
  bundleFormatVersion: z.literal(JOURNEYS_FORMAT_VERSION),
  runId: z.string().regex(RUN_ID_PATTERN),
  createdAt: z.iso.datetime(),
  skill: z.strictObject({
    commit: z.string().regex(/^[a-f0-9]{40}$/u),
    version: z.string(),
    cliRepairVersion: z.string(),
    treeSha256: HashSchema,
  }),
  instructions: z.strictObject({ version: z.literal(2), sha256: HashSchema }),
  assessorSourceSha256: HashSchema,
  policy: z.strictObject({
    version: z.literal(EVALUATION_CONFIRMATION_POLICY.version),
    requiredPassingConfirmations: z.literal(
      EVALUATION_CONFIRMATION_POLICY.requiredPassingConfirmations,
    ),
    requiredFailingConfirmations: z.literal(
      EVALUATION_CONFIRMATION_POLICY.requiredFailingConfirmations,
    ),
    maximumConfirmations: z.literal(EVALUATION_CONFIRMATION_POLICY.maximumConfirmations),
  }),
  files: FileHashesSchema,
  npmCache: z.strictObject({ sha256: HashSchema, packages: z.array(z.string()) }),
  journeys: z
    .array(
      z.strictObject({
        id: IdentifierSchema,
        title: z.string(),
        stepCount: z.number().int().positive(),
        definitionDigest: HashSchema,
        fixtureSha256: HashSchema,
        fixture: FixtureSchema,
      }),
    )
    .min(1),
});

export const JourneyActivitySchema = z.strictObject({
  commands: z.array(z.string()),
  reads: z.array(z.string()),
  writes: z.array(z.string()),
  notes: z.array(z.string()),
});
export const JourneyFactsSchema = z.strictObject({
  issuedAt: z.iso.datetime(),
  recordedAt: z.iso.datetime(),
  cliPresent: z.boolean(),
});
export const JourneyStepRecordSchema = z.strictObject({
  journeyId: IdentifierSchema,
  stepId: IdentifierSchema,
  facts: JourneyFactsSchema,
});
export const JourneysExportSchema = z.strictObject({
  exportFormatVersion: z.literal(JOURNEYS_FORMAT_VERSION),
  trialId: z.string().regex(/^[a-f0-9]{32}$/u),
  kind: z.enum(['initial', 'confirmation']),
  selectedJourneys: z.array(IdentifierSchema).min(1),
  confirmationIndex: z.number().int().min(1).max(3).nullable(),
  runId: z.string().regex(RUN_ID_PATTERN),
  platform: z.enum(JOURNEY_PLATFORMS),
  skillTreeSha256: HashSchema,
  instructionsSha256: HashSchema,
  harnessHashes: FileHashesSchema,
  environment: z.record(z.string(), z.string()),
  steps: z.array(JourneyStepRecordSchema),
  restartCounts: z.record(IdentifierSchema, z.number().int().nonnegative()),
  completedJourneys: z.array(IdentifierSchema),
  complete: z.boolean(),
  checkpoint: z.number().int().positive(),
});
export const JourneyFileHashesSchema = FileHashesSchema;
export const JourneyOutcomeSchema = z.enum(['passed', 'failed', 'blocked']);
export const JourneyCheckResultSchema = z.strictObject({
  check: JourneyCheckSchema,
  status: JourneyOutcomeSchema,
  detail: z.string(),
});

// operator-observed settings stay separate from sandbox-captured environment facts
export const JourneyConfigurationSchema = z.strictObject({
  model: z.string().nullable(),
  settings: z.record(z.string(), z.string()),
  interventions: z.array(z.string()),
});
// digest-keyed observations are immutable admission evidence, not sandbox claims
export const JourneyObservationSchema = z.strictObject({
  configuration: JourneyConfigurationSchema,
  observedAt: z.iso.datetime().nullable(),
  freshChat: z.literal(true),
});
export const JourneyOperatorRecordSchema = z.strictObject({
  trials: z.record(HashSchema, JourneyObservationSchema).optional(),
  chatgpt: JourneyConfigurationSchema.optional(),
  claude: JourneyConfigurationSchema.optional(),
});
export const JourneyAssessedStepSchema = z.object({
  id: IdentifierSchema,
  status: JourneyOutcomeSchema,
  checks: z.array(
    JourneyCheckResultSchema.extend({
      criterion: z.union([z.number().int().nonnegative(), z.literal('nonempty-reply')]),
    }),
  ),
  unverified: z.array(z.string()),
  facts: JourneyFactsSchema.nullable(),
  reply: z.string(),
  activity: JourneyActivitySchema.nullable(),
});
export const JourneyTrialSchema = z.object({
  trialId: JourneysExportSchema.shape.trialId,
  archiveSha256: HashSchema,
  kind: JourneysExportSchema.shape.kind,
  selectedJourneys: JourneysExportSchema.shape.selectedJourneys,
  confirmationIndex: JourneysExportSchema.shape.confirmationIndex,
  observation: JourneyObservationSchema.nullable(),
  diagnosticConfiguration: JourneyConfigurationSchema.nullable(),
  environment: z.record(z.string(), z.string()),
  restartCounts: z.record(z.string(), z.number().int().nonnegative()),
  journeys: z.array(
    z.object({
      id: IdentifierSchema,
      status: JourneyOutcomeSchema,
      steps: z.array(JourneyAssessedStepSchema),
    }),
  ),
});
export const JourneyResolutionSchema = z.object({
  journeyId: IdentifierSchema,
  initialTrialId: JourneysExportSchema.shape.trialId,
  confirmationTrialIds: z.array(JourneysExportSchema.shape.trialId).max(3),
  status: z.enum([
    'passed-initially',
    'awaiting-confirmation',
    'recovered',
    'confirmed-failure',
    'blocked',
  ]),
  failedChecks: z.array(
    z.object({
      trialId: z.string(),
      stepId: IdentifierSchema,
      criterion: z.union([z.number().int().nonnegative(), z.literal('nonempty-reply')]),
    }),
  ),
});
const AssessmentBaseSchema = z.object({
  assessmentFormatVersion: z.literal(2),
  runId: z.string().regex(RUN_ID_PATTERN),
  status: z.enum(['passed', 'failed', 'incomplete']),
  evaluatedAt: z.iso.datetime(),
  assessor: z.object({ commit: z.string(), sourceSha256: HashSchema }),
  bundleSha256: HashSchema,
  bundle: JourneysBundleSchema,
  definitions: z.array(JourneyDefinitionSchema).min(1),
});
const PlatformTrialsSchema = z.object({
  platform: z.enum(JOURNEY_PLATFORMS),
  trials: z.array(JourneyTrialSchema).min(1),
});
export const JourneyCampaignSchema = AssessmentBaseSchema.extend({
  mode: z.literal('campaign'),
  platforms: z.array(
    PlatformTrialsSchema.extend({ resolutions: z.array(JourneyResolutionSchema) }),
  ),
}).superRefine((assessment, context) => {
  if (
    assessment.platforms.some((platform) =>
      platform.trials.some(
        (trial) => trial.observation === null || trial.diagnosticConfiguration !== null,
      ),
    )
  )
    context.addIssue({ code: 'custom', message: 'Campaign trials require admitted observations.' });
});
export const JourneyDiagnosticSchema = AssessmentBaseSchema.extend({
  mode: z.literal('diagnostic'),
  platforms: z.array(PlatformTrialsSchema),
  missingObservations: z.array(HashSchema),
});
export const JourneyAssessmentSchema = z.discriminatedUnion('mode', [
  JourneyCampaignSchema,
  JourneyDiagnosticSchema,
]);

export type IJourneyDefinition = z.infer<typeof JourneyDefinitionSchema>;
export type IJourneyCheck = z.infer<typeof JourneyCheckSchema>;
export type IJourneysBundle = z.infer<typeof JourneysBundleSchema>;
export type IJourneysExport = z.infer<typeof JourneysExportSchema>;
export type IJourneyActivity = z.infer<typeof JourneyActivitySchema>;
export type IJourneyStepRecord = z.infer<typeof JourneyStepRecordSchema>;
export type IJourneyOutcome = z.infer<typeof JourneyOutcomeSchema>;
export type IJourneyCheckResult = z.infer<typeof JourneyCheckResultSchema>;
export type IJourneyAssessment = z.infer<typeof JourneyAssessmentSchema>;
export type IJourneyPlatform = (typeof JOURNEY_PLATFORMS)[number];

export type IJourneyOperatorRecord = z.infer<typeof JourneyOperatorRecordSchema>;

export type IJourneyTrial = z.infer<typeof JourneyTrialSchema>;
export type IJourneyCampaign = z.infer<typeof JourneyCampaignSchema>;
export type IJourneyDiagnostic = z.infer<typeof JourneyDiagnosticSchema>;
export type IJourneyResolution = z.infer<typeof JourneyResolutionSchema>;
export type IJourneyObservation = z.infer<typeof JourneyObservationSchema>;
