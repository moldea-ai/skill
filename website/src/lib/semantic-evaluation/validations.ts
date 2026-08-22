import { z } from 'zod';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const StableIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

// additive semantic result contracts preserve compatibility with new diagnostic fields
const SemanticHostSchema = z.object({
  model: z.literal('gpt-5.6-terra'),
  name: z.string().trim().min(1),
  reasoningEffort: z.literal('medium'),
  version: z.string().trim().min(1),
});

export const SemanticCliIdentitySchema = z.object({
  integrity: z.string().startsWith('sha512-'),
  jsonSchemaVersion: z.number().int().positive(),
  name: z.literal('@moldea.ai/cli'),
  packageLockSha256: Sha256Schema,
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u),
});

const SemanticCaseResultSchema = z.object({
  caseDefinitionDigest: Sha256Schema,
  evaluatedAt: z.iso.datetime(),
  expectedSatisfied: z.array(StableIdSchema),
  forbiddenTriggered: z.array(StableIdSchema),
  id: StableIdSchema,
  passed: z.boolean(),
  rationale: z.string().trim().min(20),
  skillArtifactEvidence: z.array(z.unknown()),
});

const SemanticRawResultSchema = z.object({
  caseDefinitionDigest: Sha256Schema,
  evaluatedAt: z.iso.datetime(),
  forbidden: z.array(StableIdSchema),
  id: StableIdSchema,
  observed: z.array(StableIdSchema),
  passed: z.boolean(),
  rationale: z.string().trim().min(20),
});

export const SemanticEvaluationResultSchema = z.object({
  actorHost: SemanticHostSchema,
  artifact: z.object({ sha256: Sha256Schema }),
  artifactDigest: Sha256Schema,
  artifactSha256: Sha256Schema,
  cases: z.array(SemanticCaseResultSchema).min(1),
  caseSuiteDigest: Sha256Schema,
  cli: SemanticCliIdentitySchema,
  evaluatedAt: z.iso.datetime(),
  evaluationProtocolVersion: z.number().int().positive(),
  generatedAt: z.iso.datetime(),
  host: SemanticHostSchema,
  judgeHost: SemanticHostSchema,
  releaseEvidenceCarryForward: z
    .object({
      carriedForwardAt: z.iso.datetime(),
      changedPortablePaths: z.array(z.string()),
      fromArtifactDigest: Sha256Schema,
      fromSemanticDigest: Sha256Schema,
      reason: z.string().trim().min(1),
      toArtifactDigest: Sha256Schema,
      toSemanticDigest: Sha256Schema,
    })
    .optional(),
  results: z.array(SemanticRawResultSchema).min(1),
  schemaVersion: z.literal(1),
  skillDigest: Sha256Schema,
});

export type ISemanticEvaluationResult = z.infer<typeof SemanticEvaluationResultSchema>;
