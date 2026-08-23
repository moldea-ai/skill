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

const SemanticScenarioEvidenceSchema = z.array(
  z.object({
    claim: z.string().trim().min(1),
    observation: z.looseObject({ type: z.string().trim().min(1) }),
    source: z.looseObject({ kind: z.string().trim().min(1) }),
  }),
);

const SemanticRepositoryControlStateSchema = z.object({
  gitDigest: Sha256Schema,
  head: z.object({
    commit: z
      .string()
      .regex(/^[a-f0-9]{40,64}$/u)
      .nullable(),
    symbolicRef: z.string().nullable(),
  }),
  indexDigest: Sha256Schema,
  installedSkillDigest: Sha256Schema,
  localConfigDigest: Sha256Schema,
  refs: z.array(
    z.object({
      name: z.string().trim().min(1),
      oid: z.string().regex(/^[a-f0-9]{40,64}$/u),
    }),
  ),
});

const SemanticRepositoryControlEvidenceSchema = z.object({
  after: SemanticRepositoryControlStateSchema,
  before: SemanticRepositoryControlStateSchema,
  violations: z.array(z.string()),
});

const SemanticCaseResultSchema = z.object({
  caseDefinitionDigest: Sha256Schema,
  evaluatedAt: z.iso.datetime(),
  expectedSatisfied: z.array(StableIdSchema),
  forbiddenTriggered: z.array(StableIdSchema),
  id: StableIdSchema,
  passed: z.boolean(),
  rationale: z.string().trim().min(20),
  repositoryControlEvidence: SemanticRepositoryControlEvidenceSchema,
  scenarioEvidence: SemanticScenarioEvidenceSchema,
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
  repositoryControlEvidence: SemanticRepositoryControlEvidenceSchema,
  scenarioEvidence: SemanticScenarioEvidenceSchema,
});

export const SemanticEvaluationResultSchema = z.object({
  actorHost: SemanticHostSchema,
  artifact: z.object({ sha256: Sha256Schema }),
  artifactDigest: Sha256Schema,
  artifactSha256: Sha256Schema,
  cases: z.array(SemanticCaseResultSchema).min(1),
  caseSuiteDigest: Sha256Schema,
  cli: SemanticCliIdentitySchema,
  coverageDigest: Sha256Schema,
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
  schemaVersion: z.literal(2),
  skillDigest: Sha256Schema,
});

export type ISemanticEvaluationResult = z.infer<typeof SemanticEvaluationResultSchema>;
