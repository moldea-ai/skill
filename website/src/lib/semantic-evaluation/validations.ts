import { z } from 'zod';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const StableIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const AttemptStatusSchema = z.enum(['failed', 'incomplete', 'passed']);

// additive semantic result contracts preserve compatibility with new diagnostic fields
const createSemanticHostSchema = <TModel extends 'gpt-5.6-sol' | 'gpt-5.6-terra'>(model: TModel) =>
  z.object({
    model: z.literal(model),
    name: z.string().trim().min(1),
    reasoningEffort: z.literal('medium'),
    version: z.string().trim().min(1),
  });
const SemanticSolHostSchema = createSemanticHostSchema('gpt-5.6-sol');
const SemanticTerraHostSchema = createSemanticHostSchema('gpt-5.6-terra');
const SemanticSolHostContractSchema = SemanticSolHostSchema.omit({ version: true });
const SemanticTerraHostContractSchema = SemanticTerraHostSchema.omit({ version: true });

export const SemanticCliIdentitySchema = z.object({
  integrity: z.string().startsWith('sha512-'),
  jsonSchemaVersion: z.number().int().positive(),
  name: z.literal('@moldea.ai/cli'),
  packageLockSha256: Sha256Schema,
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u),
});

const SemanticAttemptTrialShape = {
  confirmationIndex: z.union([z.literal(1), z.literal(2)]).nullable(),
  evaluatedAt: z.iso.datetime(),
  forbidden: z.array(StableIdSchema),
  kind: z.enum(['confirmation', 'initial']),
  observed: z.array(StableIdSchema),
  passed: z.boolean(),
  rationale: z.string().trim().min(1),
};

const SemanticLegacyAttemptTrialSchema = z.object(SemanticAttemptTrialShape);
const createSemanticAttemptTrialSchema = (
  hostSchema: typeof SemanticSolHostSchema | typeof SemanticTerraHostSchema,
) =>
  z.object({
    actorHost: hostSchema,
    ...SemanticAttemptTrialShape,
    judgeHost: hostSchema,
  });

const createSemanticAttemptCasesSchema = <TSchema extends z.ZodType>(trialSchema: TSchema) =>
  z.array(
    z.object({
      confirmationStatus: z.enum(['not-required', 'passed', 'rejected', 'required']),
      id: StableIdSchema,
      status: z.enum(['failed', 'passed', 'recovered']),
      trials: z.array(trialSchema).min(1),
    }),
  );

const SemanticAttemptRecordShape = {
  artifactDigest: Sha256Schema,
  attemptId: z.string().trim().min(1),
  caseSuiteDigest: Sha256Schema,
  cli: SemanticCliIdentitySchema,
  coverageDigest: Sha256Schema.nullable(),
  createdAt: z.iso.datetime(),
  evidence: z.object({
    evaluationProtocolVersion: z.number().int().positive(),
    kind: z.enum(['candidate', 'result']),
    path: z.literal('evidence.json'),
    schemaVersion: z.number().int().positive(),
    sha256: Sha256Schema,
  }),
  failedCaseCount: z.number().int().nonnegative(),
  passedCaseCount: z.number().int().nonnegative(),
  pendingCaseCount: z.number().int().nonnegative(),
  recordedAt: z.iso.datetime(),
  recoveredCaseCount: z.number().int().nonnegative(),
  status: AttemptStatusSchema,
  stopReason: z.enum([
    'case-failure',
    'complete',
    'confirmation-failure',
    'confirmations-passed',
    'operator-recorded',
  ]),
  totalCaseCount: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
};

const SemanticLegacyAttemptRecordSchema = z.object({
  actorHost: SemanticTerraHostSchema,
  ...SemanticAttemptRecordShape,
  cases: createSemanticAttemptCasesSchema(SemanticLegacyAttemptTrialSchema),
  judgeHost: SemanticTerraHostSchema,
  schemaVersion: z.literal(1),
});

const SemanticTerraAttemptRecordSchema = z.object({
  ...SemanticAttemptRecordShape,
  cases: createSemanticAttemptCasesSchema(
    createSemanticAttemptTrialSchema(SemanticTerraHostSchema),
  ),
  hostContract: SemanticTerraHostContractSchema,
  schemaVersion: z.literal(2),
});

const SemanticCurrentAttemptRecordSchema = z.object({
  ...SemanticAttemptRecordShape,
  cases: createSemanticAttemptCasesSchema(createSemanticAttemptTrialSchema(SemanticSolHostSchema)),
  hostContract: SemanticSolHostContractSchema,
  schemaVersion: z.literal(3),
});

export const SemanticAttemptRecordSchema = z.discriminatedUnion('schemaVersion', [
  SemanticLegacyAttemptRecordSchema,
  SemanticTerraAttemptRecordSchema,
  SemanticCurrentAttemptRecordSchema,
]);

export const SemanticLatestResultSchema = z.object({
  lastPassingAttemptId: z.string().trim().min(1).nullable(),
  latestAttemptId: z.string().trim().min(1),
  latestStatus: AttemptStatusSchema,
  schemaVersion: z.literal(1),
  updatedAt: z.iso.datetime(),
});

export type ISemanticAttemptRecord = z.infer<typeof SemanticAttemptRecordSchema>;
export type ISemanticLatestResult = z.infer<typeof SemanticLatestResultSchema>;
