import { z } from 'zod';

import { JOURNEY_PLATFORMS, JOURNEYS_FORMAT_VERSION, RUN_ID_PATTERN } from './constants.ts';

// closed exchange contracts reject unsupported harness state and grading inputs
const IdentifierSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
  .max(48);
const HashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
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
  instructions: z.strictObject({ version: z.literal(1), sha256: HashSchema }),
  files: FileHashesSchema,
  npmCache: z.strictObject({ sha256: HashSchema, packages: z.array(z.string()) }),
  journeys: z
    .array(
      z.strictObject({
        id: IdentifierSchema,
        title: z.string(),
        stepCount: z.number().int().positive(),
        definitionDigest: HashSchema,
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
export const JourneyOperatorRecordSchema = z.strictObject({
  chatgpt: JourneyConfigurationSchema.optional(),
  claude: JourneyConfigurationSchema.optional(),
});

// website payloads permit additive presentation fields without changing the exchange format
export const JourneyAssessmentSchema = z.object({
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
