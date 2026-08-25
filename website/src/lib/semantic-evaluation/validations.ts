import { z } from 'zod';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const StableIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const AttemptStatusSchema = z.enum(['failed', 'incomplete', 'passed']);

// additive semantic result contracts preserve compatibility with new diagnostic fields
const SemanticHostSchema = z.object({
  model: z.literal('gpt-5.6-terra'),
  name: z.string().trim().min(1),
  reasoningEffort: z.literal('medium'),
  version: z.string().trim().min(1),
});

const SemanticHostContractSchema = SemanticHostSchema.omit({ version: true });

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
const SemanticAttemptTrialSchema = z.object({
  actorHost: SemanticHostSchema,
  ...SemanticAttemptTrialShape,
  judgeHost: SemanticHostSchema,
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
  actorHost: SemanticHostSchema,
  ...SemanticAttemptRecordShape,
  cases: createSemanticAttemptCasesSchema(SemanticLegacyAttemptTrialSchema),
  judgeHost: SemanticHostSchema,
  schemaVersion: z.literal(1),
});

const SemanticCurrentAttemptRecordSchema = z.object({
  ...SemanticAttemptRecordShape,
  cases: createSemanticAttemptCasesSchema(SemanticAttemptTrialSchema),
  hostContract: SemanticHostContractSchema,
  schemaVersion: z.literal(2),
});

export const SemanticAttemptRecordSchema = z.discriminatedUnion('schemaVersion', [
  SemanticLegacyAttemptRecordSchema,
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
