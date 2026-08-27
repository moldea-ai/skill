import { posix } from 'node:path';

import { z } from 'zod';

const QUALIFICATION_PROTOCOL_VERSION = 1;
const QUALIFICATION_EVIDENCE_PROTOCOL_VERSION = 5;
const QUALIFICATION_PREVIOUS_EVIDENCE_PROTOCOL_VERSION = 4;
const QUALIFICATION_TERRA_EVIDENCE_PROTOCOL_VERSION = 3;
const StableIdSchema = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u, 'Expected a stable kebab-case id.');
const RelativePathSchema = z
  .string()
  .min(1)
  .refine((candidatePath) => {
    const normalizedPath = posix.normalize(candidatePath);

    return (
      !posix.isAbsolute(candidatePath) &&
      !candidatePath.includes('\\') &&
      normalizedPath !== '..' &&
      !normalizedPath.startsWith('../') &&
      normalizedPath === candidatePath
    );
  }, 'Expected a normalized repository-relative POSIX path.');
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const AttemptStatusSchema = z.enum(['errored', 'failed', 'incomplete', 'passed']);

// additive profile and project contracts consumed independently from the qualification producer
export const QualificationCaseCatalogSchema = z.object({
  version: z.literal(QUALIFICATION_PROTOCOL_VERSION),
  cases: z
    .array(
      z.object({
        id: StableIdSchema,
        title: z.string().trim().min(1),
        layer: z.enum(['adapter-specific', 'universal-baseline']),
        description: z.string().trim().min(1),
        challenge: z.string().trim().min(1),
      }),
    )
    .min(1),
});
export const QualificationProfileSchema = z.object({
  version: z.literal(QUALIFICATION_PROTOCOL_VERSION),
  adapterId: StableIdSchema,
  implementationId: StableIdSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  probesFile: RelativePathSchema,
  cases: z
    .array(
      z.object({
        id: StableIdSchema,
        projectDirectory: RelativePathSchema,
        scenarioFile: RelativePathSchema,
      }),
    )
    .min(1),
});
export const QualificationProbesSchema = z.object({
  version: z.literal(QUALIFICATION_PROTOCOL_VERSION),
  adapterId: StableIdSchema,
  implementationId: StableIdSchema,
  probes: z
    .array(
      z.object({
        id: StableIdSchema,
        kind: z.enum([
          'binding-support',
          'compatibility',
          'evidence-kind',
          'known-limitation',
          'pattern',
          'provider-limit',
          'runtime-guidance',
          'support-gate',
        ]),
        matrixPath: z.string().trim().min(1),
        description: z.string().trim().min(1),
        coveredBy: z.array(StableIdSchema).min(1),
      }),
    )
    .min(1),
});
export const QualificationScenarioSchema = z.object({
  version: z.literal(QUALIFICATION_PROTOCOL_VERSION),
  id: StableIdSchema,
  title: z.string().trim().min(1),
  purpose: z.string().trim().min(1),
  taskFile: RelativePathSchema,
  seedDirectory: RelativePathSchema,
  overlayDirectory: RelativePathSchema.optional(),
  expectedDirectory: RelativePathSchema.optional(),
  removePaths: z.array(RelativePathSchema).default([]),
  expectedRemovePaths: z.array(RelativePathSchema).default([]),
  inspection: z.object({
    before: z.enum(['invalid', 'valid']),
    after: z.enum(['invalid', 'valid']),
  }),
  deterministicEvidence: z.object({
    before: z.object({
      requiredDiagnosticCodes: z.array(z.string()),
      forbiddenDiagnosticCodes: z.array(z.string()),
      requiredEvidenceKinds: z.array(z.string()),
      forbiddenEvidenceKinds: z.array(z.string()),
    }),
    after: z.object({
      requiredDiagnosticCodes: z.array(z.string()),
      forbiddenDiagnosticCodes: z.array(z.string()),
      requiredEvidenceKinds: z.array(z.string()),
      forbiddenEvidenceKinds: z.array(z.string()),
    }),
  }),
  expectedActorOutcome: z.enum(['blocked', 'completed']),
  workspace: z.object({
    expectation: z.enum(['changed', 'unchanged']),
    mustPreservePaths: z.array(RelativePathSchema),
    mustChangePaths: z.array(RelativePathSchema),
    mustExistPaths: z.array(RelativePathSchema),
    mustNotExistPaths: z.array(RelativePathSchema),
    allowedChangePaths: z.array(RelativePathSchema),
  }),
  judgeRequirements: z
    .array(
      z.object({
        id: StableIdSchema,
        description: z.string().trim().min(1),
      }),
    )
    .min(1),
});

// additive result contracts keep older website builds compatible with harmless producer fields
const QualificationLatestResultShape = {
  adapterId: StableIdSchema,
  implementationId: StableIdSchema,
  latestAttemptId: z.string().trim().min(1),
  latestStatus: AttemptStatusSchema,
  lastPassingAttemptId: z.string().trim().min(1).nullable(),
  updatedAt: z.iso.datetime(),
};
export const QualificationLatestResultSchema = z.discriminatedUnion('protocolVersion', [
  z.object({
    protocolVersion: z.literal(QUALIFICATION_TERRA_EVIDENCE_PROTOCOL_VERSION),
    ...QualificationLatestResultShape,
  }),
  z.object({
    protocolVersion: z.literal(QUALIFICATION_PREVIOUS_EVIDENCE_PROTOCOL_VERSION),
    ...QualificationLatestResultShape,
  }),
  z.object({
    protocolVersion: z.literal(QUALIFICATION_EVIDENCE_PROTOCOL_VERSION),
    ...QualificationLatestResultShape,
  }),
]);
const ModelUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});
const CandidatePackageSchema = z.object({
  name: z.string().trim().min(1),
  version: z.string().trim().min(1),
  registryIntegrity: z.string().startsWith('sha512-'),
  registryShasum: z.string().regex(/^[a-f0-9]{40}$/u),
  registryTarballUrl: z.url().startsWith('https://registry.npmjs.org/'),
  tarballName: z.string().trim().min(1),
  sha256: Sha256Schema,
});
const QualificationProvenanceShape = {
  reasoningEffort: z.literal('medium'),
  codexVersion: z.string().trim().min(1),
  nodeVersion: z.string().trim().min(1),
  pnpmVersion: z.string().trim().min(1),
  gitVersion: z.string().trim().min(1),
  allowedEgressHosts: z.array(z.string().trim().min(1)).min(1),
  hostTimeoutMs: z.number().int().positive(),
  modelEndpoint: z
    .object({
      origin: z.url(),
      sha256: Sha256Schema,
    })
    .nullable(),
  sslCertificateFileSha256: Sha256Schema.nullable(),
  packagesRepositoryCommit: z.string().trim().min(1),
  packagesRepositoryFingerprint: Sha256Schema,
  packagesRepositoryDirty: z.boolean(),
  qualificationRepositoryCommit: z.string().trim().min(1),
  qualificationRepositoryDirty: z.boolean(),
  skillRepositoryCommit: z.string().trim().min(1),
  skillRepositoryFingerprint: Sha256Schema,
  skillRepositoryDirty: z.boolean(),
  profileDigest: Sha256Schema,
  qualificationDigest: Sha256Schema,
  targetDigest: Sha256Schema,
  baselineAttemptId: z.string().trim().min(1).nullable(),
  packages: z.array(CandidatePackageSchema).min(1),
};
const QualificationTerraProvenanceSchema = z.object({
  model: z.literal('gpt-5.6-terra'),
  ...QualificationProvenanceShape,
});
const QualificationCurrentProvenanceSchema = z.object({
  model: z.literal('gpt-5.6-sol'),
  ...QualificationProvenanceShape,
});
export const QualificationCaseResultSchema = z.object({
  caseId: StableIdSchema,
  title: z.string().trim().min(1),
  status: z.enum(['errored', 'failed', 'passed']),
  durationMs: z.number().int().nonnegative(),
  deterministicBeforePath: RelativePathSchema,
  deterministicAfterPath: RelativePathSchema,
  actorOutputPath: RelativePathSchema,
  judgeStatus: z.enum(['completed', 'skipped']),
  judgeOutputPath: RelativePathSchema.nullable(),
  judgeSkippedPath: RelativePathSchema.nullable(),
  workspaceAssertionsPath: RelativePathSchema,
  patchPath: RelativePathSchema,
  actorUsage: ModelUsageSchema.nullable(),
  judgeUsage: ModelUsageSchema.nullable(),
  actorEvidenceCreatedAt: z.iso.datetime(),
  judgeEvidenceCreatedAt: z.iso.datetime().nullable(),
  actorCacheSourceAttemptId: z.string().nullable(),
  judgeCacheSourceAttemptId: z.string().nullable(),
  failures: z.array(z.string()),
});
const QualificationAttemptResultShape = {
  attemptId: z.string().trim().min(1),
  parentAttemptId: z.string().trim().min(1).nullable(),
  selection: z.object({
    adapterId: StableIdSchema,
    implementationId: StableIdSchema,
  }),
  status: AttemptStatusSchema,
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  evidenceGeneratedAt: z.iso.datetime().nullable(),
  summary: z.string().trim().min(1),
  stages: z.array(
    z.object({
      id: z.string().trim().min(1),
      status: z.enum(['cached', 'errored', 'failed', 'passed', 'pending', 'running', 'skipped']),
      startedAt: z.iso.datetime().nullable(),
      completedAt: z.iso.datetime().nullable(),
      durationMs: z.number().int().nonnegative().nullable(),
      cacheKey: Sha256Schema.nullable(),
      cacheSourceAttemptId: z.string().nullable(),
      error: z.string().nullable(),
    }),
  ),
  cases: z.array(QualificationCaseResultSchema),
  artifactDigests: z.record(RelativePathSchema, Sha256Schema),
};
export const QualificationAttemptResultSchema = z.discriminatedUnion('protocolVersion', [
  z.object({
    protocolVersion: z.literal(QUALIFICATION_TERRA_EVIDENCE_PROTOCOL_VERSION),
    ...QualificationAttemptResultShape,
    provenance: QualificationTerraProvenanceSchema,
  }),
  z.object({
    protocolVersion: z.literal(QUALIFICATION_PREVIOUS_EVIDENCE_PROTOCOL_VERSION),
    ...QualificationAttemptResultShape,
    provenance: QualificationCurrentProvenanceSchema,
  }),
  z.object({
    protocolVersion: z.literal(QUALIFICATION_EVIDENCE_PROTOCOL_VERSION),
    ...QualificationAttemptResultShape,
    provenance: QualificationCurrentProvenanceSchema,
  }),
]);

// additive public artifacts shown on immutable attempt pages
export const QualificationCoverageResultSchema = z.object({
  passed: z.boolean(),
  requiredClaims: z.array(z.string()),
  declaredClaims: z.array(z.string()),
  missingClaims: z.array(z.string()),
  unknownClaims: z.array(z.string()),
  uncoveredCaseIds: z.array(StableIdSchema),
});
export const QualificationSourceStateResultSchema = z.object({
  passed: z.boolean(),
  requiresCleanInputs: z.boolean(),
  isExecutionHostTrusted: z.boolean(),
  packagesRepositoryDirty: z.boolean(),
  qualificationRepositoryDirty: z.boolean(),
  skillRepositoryDirty: z.boolean(),
  failures: z.array(z.string()),
});
const DeterministicVerificationShape = {
  passed: z.boolean(),
  inspectionStatus: z.enum(['invalid', 'valid']),
  repositoryFilesystemValid: z.boolean(),
  memoryRepositoryEquivalent: z.boolean(),
  coreValid: z.boolean(),
  cliIdentityValid: z.boolean(),
  cliPackageInventoryValid: z.boolean(),
  cliAdapterInventoryValid: z.boolean(),
  cliEnvelopeValid: z.boolean(),
  cliValidateStatus: z.enum(['invalid', 'valid']),
  cliInspectStatus: z.enum(['invalid', 'valid']),
  typecheckPassed: z.boolean(),
  repositoryUnchanged: z.boolean(),
  failures: z.array(z.string()),
  durationMs: z.number().int().nonnegative(),
};
export const HistoricalDeterministicVerificationSchema = z.object({
  ...DeterministicVerificationShape,
  cliCompatibilityValid: z.boolean(),
});
export const CurrentDeterministicVerificationSchema = z.object({
  ...DeterministicVerificationShape,
  cliCompositionValid: z.boolean(),
});
// additive producer artifact carrying the stable summary and inspectable diagnostics
export const HistoricalDeterministicVerificationArtifactSchema = z.object({
  summary: HistoricalDeterministicVerificationSchema,
  details: z.object({}),
});
export const CurrentDeterministicVerificationArtifactSchema = z.object({
  summary: CurrentDeterministicVerificationSchema,
  details: z.object({}),
});
export const WorkspaceAssertionResultSchema = z.object({
  passed: z.boolean(),
  failures: z.array(z.string()),
  before: z.array(
    z.object({
      path: RelativePathSchema,
      kind: z.enum(['file', 'symlink']),
      mode: z.number().int().nonnegative(),
      sha256: Sha256Schema,
    }),
  ),
  after: z.array(
    z.object({
      path: RelativePathSchema,
      kind: z.enum(['file', 'symlink']),
      mode: z.number().int().nonnegative(),
      sha256: Sha256Schema,
    }),
  ),
  changedPaths: z.array(RelativePathSchema),
});
export const ActorOutputSchema = z.object({
  outcome: z.enum(['blocked', 'completed']),
  summary: z.string().trim().min(1),
  commands: z.array(z.string()),
  changedFiles: z.array(RelativePathSchema),
  observations: z.array(z.string().trim().min(1)),
  unresolved: z.array(z.string().trim().min(1)),
});
export const JudgeOutputSchema = z.object({
  verdict: z.enum(['fail', 'pass']),
  summary: z.string().trim().min(1),
  requirements: z.array(
    z.object({
      id: StableIdSchema,
      verdict: z.enum(['fail', 'pass']),
      evidence: z.string().trim().min(1),
    }),
  ),
  failures: z.array(z.string().trim().min(1)),
});
export const QualificationExecutionErrorSchema = z.object({
  stageId: z.string().nullable(),
  message: z.string().trim().min(1),
});
export const QualificationBaselineCheckSchema = z.object({
  required: z.boolean(),
  passed: z.boolean(),
  status: z.enum(['incompatible', 'missing', 'not-required', 'passed']),
  baselineAttemptId: z.string().trim().min(1).nullable(),
  failures: z.array(z.string()),
});
export const QualificationJudgeSkippedSchema = z.object({
  reason: z.string().trim().min(1),
  deterministicAfterPassed: z.boolean(),
  workspaceAssertionsPassed: z.boolean(),
});

export type IQualificationStatus = z.infer<typeof AttemptStatusSchema>;
export type IQualificationLatestResult = z.infer<typeof QualificationLatestResultSchema>;
export type IQualificationAttemptResult = z.infer<typeof QualificationAttemptResultSchema>;
export type IQualificationCoverageResult = z.infer<typeof QualificationCoverageResultSchema>;
export type IQualificationSourceStateResult = z.infer<typeof QualificationSourceStateResultSchema>;
export type IDeterministicVerification =
  | z.infer<typeof HistoricalDeterministicVerificationSchema>
  | z.infer<typeof CurrentDeterministicVerificationSchema>;
export type IWorkspaceAssertionResult = z.infer<typeof WorkspaceAssertionResultSchema>;
export type IActorOutput = z.infer<typeof ActorOutputSchema>;
export type IJudgeOutput = z.infer<typeof JudgeOutputSchema>;
export type IQualificationExecutionError = z.infer<typeof QualificationExecutionErrorSchema>;
export type IQualificationBaselineCheck = z.infer<typeof QualificationBaselineCheckSchema>;
export type IQualificationJudgeSkipped = z.infer<typeof QualificationJudgeSkippedSchema>;

// one raw committed artifact linked from public evidence pages
export interface IQualificationArtifactModel {
  path: string;
  rawUrl: string;
  sha256: string | null;
}

// one transparent case and project selected by a qualification profile
export interface IQualificationProfileCaseModel {
  catalogChallenge: string;
  catalogDescription: string;
  id: string;
  projectExplanation: string;
  projectSourceUrl: string;
  purpose: string;
  scenario: z.infer<typeof QualificationScenarioSchema>;
  scenarioSourceUrl: string;
  task: string;
  taskSourceUrl: string;
  title: string;
}

// complete evidence for one case in an immutable attempt
export interface IQualificationAttemptCaseModel {
  actor: IActorOutput;
  artifacts: IQualificationArtifactModel[];
  deterministicAfter: IDeterministicVerification;
  deterministicBefore: IDeterministicVerification;
  judge: IJudgeOutput | null;
  judgeSkipped: IQualificationJudgeSkipped | null;
  result: z.infer<typeof QualificationCaseResultSchema>;
  workspaceAssertions: IWorkspaceAssertionResult;
}

// immutable attempt and the validated artifacts presented by the website
export interface IQualificationAttemptModel {
  artifacts: IQualificationArtifactModel[];
  cases: IQualificationAttemptCaseModel[];
  baseline: IQualificationBaselineCheck | null;
  coverage: IQualificationCoverageResult | null;
  error: IQualificationExecutionError | null;
  rawAttemptUrl: string;
  result: IQualificationAttemptResult;
  route: string;
  sourceState: IQualificationSourceStateResult | null;
}

// one committed adapter implementation profile and its complete result history
export interface IQualificationProfileModel {
  adapterId: string;
  attempts: IQualificationAttemptModel[];
  cases: IQualificationProfileCaseModel[];
  currentLastPassing: IQualificationAttemptModel | null;
  currentLatest: IQualificationAttemptModel | null;
  description: string;
  implementationId: string;
  latest: IQualificationLatestResult | null;
  probes: z.infer<typeof QualificationProbesSchema>['probes'];
  probesSourceUrl: string;
  route: string;
  sourceUrl: string;
  title: string;
}

// deterministic qualification data embedded in the generated static website model
export interface IQualificationWebsiteModel {
  profiles: IQualificationProfileModel[];
  route: string;
}
