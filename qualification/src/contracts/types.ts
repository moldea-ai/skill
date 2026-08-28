import path from 'node:path';
import { z } from 'zod';

import { calculateCodexEvaluationOperationalRetryDelay } from '../../../tooling/codex-evaluation-host/index.mjs';

import {
  DEFAULT_PACKAGES_REPOSITORY,
  QUALIFICATION_ALLOWED_EGRESS_HOSTS,
  QUALIFICATION_CONFIRMATION_POLICY,
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  QUALIFICATION_MODEL,
  QUALIFICATION_MODEL_ENDPOINT_ORIGINS,
  QUALIFICATION_PROTOCOL_VERSION,
  QUALIFICATION_REASONING_EFFORT,
  QUALIFICATION_TRIAL_IDS,
} from '../constants/index.ts';

const StableIdSchema = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u, 'Expected a stable kebab-case id.');

const RelativePathSchema = z
  .string()
  .min(1)
  .superRefine((candidatePath, context) => {
    const normalizedPath = path.posix.normalize(candidatePath);

    if (
      path.posix.isAbsolute(candidatePath) ||
      candidatePath.includes('\\') ||
      normalizedPath === '..' ||
      normalizedPath.startsWith('../') ||
      normalizedPath !== candidatePath
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Expected a normalized repository-relative POSIX path.',
      });
    }
  });

const RelativePathPatternSchema = z
  .string()
  .min(1)
  .superRefine((candidatePattern, context) => {
    const normalizedPattern = path.posix.normalize(candidatePattern);
    const unsupportedGlobTokens = ['?', '[', ']', '{', '}', '(', ')', '!', '+'];
    const hasUnsupportedStarRun = /\*{3,}/u.test(candidatePattern);

    if (
      path.posix.isAbsolute(candidatePattern) ||
      candidatePattern.includes('\\') ||
      normalizedPattern === '..' ||
      normalizedPattern.startsWith('../') ||
      normalizedPattern !== candidatePattern ||
      !candidatePattern.includes('*') ||
      hasUnsupportedStarRun ||
      unsupportedGlobTokens.some((token) => candidatePattern.includes(token))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Expected a normalized repository-relative POSIX pattern using only * or **.',
      });
    }
  });

// selected matrix target evaluated by one qualification attempt
export const QualificationSelectionSchema = z.strictObject({
  adapterId: StableIdSchema,
  implementationId: StableIdSchema,
});

export type IQualificationSelection = z.infer<typeof QualificationSelectionSchema>;

// profile case references resolved relative to the owning profile directory
export const QualificationProfileCaseSchema = z.strictObject({
  id: StableIdSchema,
  projectDirectory: RelativePathSchema,
  scenarioFile: RelativePathSchema,
});

export const QualificationProfileSchema = z.strictObject({
  version: z.literal(QUALIFICATION_PROTOCOL_VERSION),
  adapterId: StableIdSchema,
  implementationId: StableIdSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  runtimePackages: z
    .array(
      z.strictObject({
        name: z.string().trim().min(1),
        version: z.string().regex(/^\d+\.\d+\.\d+$/u),
      }),
    )
    .optional(),
  probesFile: RelativePathSchema,
  cases: z.array(QualificationProfileCaseSchema).min(1),
});

export type IQualificationProfile = z.infer<typeof QualificationProfileSchema>;
export type IQualificationProfileCase = z.infer<typeof QualificationProfileCaseSchema>;

// deterministic fixture setup and observable post-actor requirements for one case
export const QualificationCaseScenarioSchema = z.strictObject({
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
  inspection: z.strictObject({
    before: z.enum(['valid', 'invalid']),
    after: z.enum(['valid', 'invalid']),
  }),
  deterministicEvidence: z.strictObject({
    before: z.strictObject({
      requiredDiagnosticCodes: z.array(z.string().trim().min(1)),
      forbiddenDiagnosticCodes: z.array(z.string().trim().min(1)),
      requiredEvidenceKinds: z.array(z.string().trim().min(1)),
      forbiddenEvidenceKinds: z.array(z.string().trim().min(1)),
    }),
    after: z.strictObject({
      requiredDiagnosticCodes: z.array(z.string().trim().min(1)),
      forbiddenDiagnosticCodes: z.array(z.string().trim().min(1)),
      requiredEvidenceKinds: z.array(z.string().trim().min(1)),
      forbiddenEvidenceKinds: z.array(z.string().trim().min(1)),
    }),
  }),
  expectedActorOutcome: z.enum(['blocked', 'completed']),
  workspace: z.strictObject({
    expectation: z.enum(['changed', 'unchanged']),
    mustPreservePaths: z.array(RelativePathSchema),
    mustChangePaths: z.array(RelativePathSchema),
    mustExistPaths: z.array(RelativePathSchema),
    mustNotExistPaths: z.array(RelativePathSchema),
    allowedChangePaths: z.array(RelativePathSchema),
    allowedChangePathPatterns: z.array(RelativePathPatternSchema),
    mustChangePathPatterns: z.array(RelativePathPatternSchema),
  }),
  judgeRequirements: z
    .array(
      z.strictObject({
        id: StableIdSchema,
        description: z.string().trim().min(1),
      }),
    )
    .min(1),
});

export type IQualificationCaseScenario = z.infer<typeof QualificationCaseScenarioSchema>;

// transparent catalog rendered in documentation and checked against every profile
export const QualificationCaseCatalogSchema = z.strictObject({
  version: z.literal(QUALIFICATION_PROTOCOL_VERSION),
  cases: z
    .array(
      z.strictObject({
        id: StableIdSchema,
        title: z.string().trim().min(1),
        layer: z.enum(['adapter-specific', 'universal-baseline']),
        description: z.string().trim().min(1),
        challenge: z.string().trim().min(1),
      }),
    )
    .min(1),
});

export type IQualificationCaseCatalog = z.infer<typeof QualificationCaseCatalogSchema>;

// matrix claims that the profile must cover with one or more concrete cases
export const QualificationProbesSchema = z.strictObject({
  version: z.literal(QUALIFICATION_PROTOCOL_VERSION),
  adapterId: StableIdSchema,
  implementationId: StableIdSchema,
  probes: z
    .array(
      z.strictObject({
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

export type IQualificationProbes = z.infer<typeof QualificationProbesSchema>;

// exact packed package identity installed for deterministic and semantic stages
export const CandidatePackageSchema = z.strictObject({
  name: z.string().trim().min(1),
  version: z.string().trim().min(1),
  registryIntegrity: z.string().startsWith('sha512-'),
  registryShasum: z.string().regex(/^[a-f0-9]{40}$/u),
  registryTarballUrl: z.url().startsWith('https://registry.npmjs.org/'),
  tarballPath: z.string().min(1),
  tarballName: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
});

export const CandidateClosureSchema = z.strictObject({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  cliVersion: z.string().regex(/^\d+\.\d+\.\d+$/u),
  cliJsonSchemaVersion: z.number().int().positive(),
  packages: z.array(CandidatePackageSchema).min(1),
  runtimePackages: z.array(CandidatePackageSchema).optional(),
  typeScriptPackage: CandidatePackageSchema.extend({
    name: z.literal('typescript'),
  }),
  runtimeDirectory: z.string().min(1),
});

export type ICandidatePackage = z.infer<typeof CandidatePackageSchema>;
export type ICandidateClosure = z.infer<typeof CandidateClosureSchema>;

// model token accounting emitted by Codex JSONL completion events when available
export const ModelUsageSchema = z.strictObject({
  inputTokens: z.number().int().nonnegative(),
  cachedInputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});

export type IModelUsage = z.infer<typeof ModelUsageSchema>;

// immutable protocol 3–5 model-stage provenance retained for historical evidence
export const QualificationHistoricalModelStageEvidenceSchema = z.strictObject({
  role: z.enum(['actor', 'judge']),
  createdAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  usage: ModelUsageSchema.nullable(),
  cacheKey: z.string().regex(/^[a-f0-9]{64}$/u),
  sourceAttemptId: z.string().trim().min(1),
  cacheSourceAttemptId: z.string().trim().min(1).nullable(),
});

// current model-stage provenance includes the trial that produced the evidence
export const QualificationModelStageEvidenceSchema =
  QualificationHistoricalModelStageEvidenceSchema.extend({
    trialId: z.enum(QUALIFICATION_TRIAL_IDS),
  });

export type IQualificationModelStageEvidence = z.infer<
  typeof QualificationModelStageEvidenceSchema
>;
export type IQualificationHistoricalModelStageEvidence = z.infer<
  typeof QualificationHistoricalModelStageEvidenceSchema
>;

// exact local execution identity that must remain stable across resume boundaries
export const QualificationExecutionEnvironmentSchema = z.strictObject({
  model: z.literal(QUALIFICATION_MODEL),
  reasoningEffort: z.literal(QUALIFICATION_REASONING_EFFORT),
  codexVersion: z.string().trim().min(1),
  nodeVersion: z.string().trim().min(1),
  pnpmVersion: z.string().trim().min(1),
  gitVersion: z.string().trim().min(1),
  allowedEgressHosts: z.array(z.string().trim().min(1)).min(1),
  hostTimeoutMs: z.number().int().positive(),
  modelEndpoint: z
    .strictObject({
      origin: z.url(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    })
    .nullable(),
  sslCertificateFileSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable(),
});

export type IQualificationExecutionEnvironment = z.infer<
  typeof QualificationExecutionEnvironmentSchema
>;

// structured actor completion written through the Codex output-schema boundary
export const ActorOutputSchema = z.strictObject({
  outcome: z.enum(['blocked', 'completed']).meta({
    description: 'Whether the project task was completed or could not be completed.',
  }),
  summary: z.string().trim().min(1).meta({
    description: 'A concise evidence-based account of the work and outcome.',
  }),
  commands: z.array(z.string()).meta({
    description: 'The exact project inspection and validation commands executed.',
  }),
  changedFiles: z.array(RelativePathSchema).meta({
    description: 'Repository-relative project files intentionally changed by the task.',
  }),
  observations: z.array(z.string().trim().min(1)).meta({
    description: 'Material observations established from repository evidence.',
  }),
  unresolved: z.array(z.string().trim().min(1)).meta({
    description: 'Remaining blockers or uncertainties that were not invented away.',
  }),
});

export type IActorOutput = z.infer<typeof ActorOutputSchema>;

// structured independent judgment over the actor result and resulting workspace
export const JudgeOutputSchema = z.strictObject({
  verdict: z
    .enum(['fail', 'pass'])
    .meta({ description: 'The independent verdict for the complete case.' }),
  summary: z.string().trim().min(1).meta({
    description: 'A concise explanation grounded in the workspace and evidence.',
  }),
  requirements: z.array(
    z.strictObject({
      id: StableIdSchema.meta({
        description: 'The exact declared requirement id.',
      }),
      verdict: z
        .enum(['fail', 'pass'])
        .meta({ description: 'The verdict for this declared requirement.' }),
      evidence: z.string().trim().min(1).meta({
        description: 'Concrete repository or deterministic evidence for the verdict.',
      }),
    }),
  ),
  failures: z.array(z.string().trim().min(1)).meta({
    description: 'Actionable case failures, empty only when the verdict passes.',
  }),
});

export type IJudgeOutput = z.infer<typeof JudgeOutputSchema>;

// deterministic full-stack verification evidence for one prepared project state
export const DeterministicVerificationSchema = z.strictObject({
  passed: z.boolean(),
  inspectionStatus: z.enum(['invalid', 'valid']),
  repositoryFilesystemValid: z.boolean(),
  memoryRepositoryEquivalent: z.boolean(),
  coreValid: z.boolean(),
  cliCompositionValid: z.boolean(),
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
});

export type IDeterministicVerification = z.infer<typeof DeterministicVerificationSchema>;

// deterministic summary plus the inspect and CLI details used to derive it
export const DeterministicVerificationArtifactSchema = z.strictObject({
  summary: DeterministicVerificationSchema,
  details: z.strictObject({
    direct: z.unknown(),
    cliComposition: z.unknown(),
    cliValidate: z.unknown(),
    cliInspect: z.unknown(),
    typecheck: z.strictObject({
      exitCode: z.number().int(),
      stdout: z.string(),
      stderr: z.string(),
    }),
  }),
});

export type IDeterministicVerificationArtifact = z.infer<
  typeof DeterministicVerificationArtifactSchema
>;

// protocol 3 and 4 deterministic artifacts retained only for immutable history verification
const HistoricalDeterministicVerificationSchema = DeterministicVerificationSchema.omit({
  cliCompositionValid: true,
}).extend({
  cliCompatibilityValid: z.boolean(),
});
export const QualificationHistoricalDeterministicVerificationArtifactSchema = z.strictObject({
  summary: HistoricalDeterministicVerificationSchema,
  details: z.strictObject({
    direct: z.unknown(),
    cliCompatibility: z.unknown(),
    cliValidate: z.unknown(),
    cliInspect: z.unknown(),
    typecheck: z.strictObject({
      exitCode: z.number().int(),
      stdout: z.string(),
      stderr: z.string(),
    }),
  }),
});

export type IQualificationRecordedDeterministicVerificationArtifact =
  | z.infer<typeof QualificationHistoricalDeterministicVerificationArtifactSchema>
  | IDeterministicVerificationArtifact;

// one exact filesystem observation used for preservation and mutation assertions
export const WorkspaceFileStateSchema = z.strictObject({
  path: RelativePathSchema,
  kind: z.enum(['file', 'symlink']),
  mode: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
});

export const WorkspaceAssertionResultSchema = z.strictObject({
  passed: z.boolean(),
  failures: z.array(z.string()),
  before: z.array(WorkspaceFileStateSchema),
  after: z.array(WorkspaceFileStateSchema),
  changedPaths: z.array(RelativePathSchema),
});

export type IWorkspaceFileState = z.infer<typeof WorkspaceFileStateSchema>;
export type IWorkspaceAssertionResult = z.infer<typeof WorkspaceAssertionResultSchema>;

// public preflight decision that prevents passing evidence from uncommitted source
export const QualificationSourceStateResultSchema = z.strictObject({
  passed: z.boolean(),
  requiresCleanInputs: z.boolean(),
  isExecutionHostTrusted: z.boolean(),
  packagesRepositoryDirty: z.boolean(),
  qualificationRepositoryDirty: z.boolean(),
  skillRepositoryDirty: z.boolean(),
  failures: z.array(z.string()),
});

export type IQualificationSourceStateResult = z.infer<typeof QualificationSourceStateResultSchema>;

// terminal or resumable execution failure persisted at the public evidence boundary
export const QualificationExecutionErrorSchema = z.strictObject({
  stageId: z.string().trim().min(1).nullable(),
  message: z.string().trim().min(1),
});

export type IQualificationExecutionError = z.infer<typeof QualificationExecutionErrorSchema>;

// public reason recorded when deterministic failure makes semantic judgment unnecessary
export const QualificationJudgeSkippedSchema = z.strictObject({
  reason: z.string().trim().min(1),
  deterministicAfterPassed: z.boolean(),
  workspaceAssertionsPassed: z.boolean(),
});

export type IQualificationJudgeSkipped = z.infer<typeof QualificationJudgeSkippedSchema>;

// durable stage state written atomically after every execution boundary
export const QualificationStageStatusSchema = z.enum([
  'cached',
  'errored',
  'failed',
  'passed',
  'pending',
  'running',
  'skipped',
]);

const QualificationStageCheckpointShape = {
  id: z.string().trim().min(1),
  status: QualificationStageStatusSchema,
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  cacheKey: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable(),
  cacheSourceAttemptId: z.string().nullable(),
  error: z.string().nullable(),
};

// frozen protocol 3–5 checkpoint stage
export const QualificationHistoricalStageCheckpointSchema = z.strictObject(
  QualificationStageCheckpointShape,
);

// stable safe evidence for one retryable Codex host failure
export const QualificationOperationalRetrySchema = z
  .strictObject({
    category: z.enum(['execution-failed', 'proxy-unavailable', 'timed-out']),
    failedAt: z.string().datetime(),
    failureCount: z.number().int().positive(),
    retryDelayMs: z.number().int().nonnegative(),
  })
  .superRefine((retry, context) => {
    const minimumDelayMs = calculateCodexEvaluationOperationalRetryDelay(retry.failureCount, 0);
    const maximumDelayMs = calculateCodexEvaluationOperationalRetryDelay(retry.failureCount, 1);

    if (retry.retryDelayMs < minimumDelayMs || retry.retryDelayMs > maximumDelayMs) {
      context.addIssue({
        code: 'custom',
        message: 'Operational retry delay does not match the bounded backoff policy.',
        path: ['retryDelayMs'],
      });
    }
  });

// current checkpoint stage with append-only operational retry evidence
export const QualificationStageCheckpointSchema = z
  .strictObject({
    ...QualificationStageCheckpointShape,
    operationalRetries: z.array(QualificationOperationalRetrySchema),
  })
  .superRefine((stage, context) => {
    const isModelStage = /:trial:(?:initial|confirmation-[12]):(?:actor|judge)$/u.test(stage.id);

    for (const [index, retry] of stage.operationalRetries.entries()) {
      if (retry.failureCount !== index + 1) {
        context.addIssue({
          code: 'custom',
          message: 'Operational retry failure counts must be contiguous from one.',
          path: ['operationalRetries', index, 'failureCount'],
        });
      }
    }

    if (stage.operationalRetries.length > 0 && !isModelStage) {
      context.addIssue({
        code: 'custom',
        message: 'Only actor and judge trial stages may record operational retries.',
        path: ['operationalRetries'],
      });
    }

    if (
      stage.operationalRetries.length > 0 &&
      (stage.status === 'cached' || stage.status === 'skipped')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Cached and skipped stages cannot record operational retries.',
        path: ['operationalRetries'],
      });
    }
  });

export type IQualificationStageCheckpoint = z.infer<typeof QualificationStageCheckpointSchema>;
export type IQualificationOperationalRetry = z.infer<typeof QualificationOperationalRetrySchema>;
export type IQualificationHistoricalStageCheckpoint = z.infer<
  typeof QualificationHistoricalStageCheckpointSchema
>;

export const QualificationAttemptStatusSchema = z.enum([
  'errored',
  'failed',
  'incomplete',
  'passed',
  'running',
]);

// local checkpoint may contain absolute paths and is never committed as public evidence
export const QualificationAttemptCheckpointSchema = z.strictObject({
  protocolVersion: z.literal(QUALIFICATION_EVIDENCE_PROTOCOL_VERSION),
  attemptId: z.string().trim().min(1),
  parentAttemptId: z.string().trim().min(1).nullable(),
  selection: QualificationSelectionSchema,
  status: QualificationAttemptStatusSchema,
  isDryRun: z.boolean(),
  useCache: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  recordedAt: z.string().datetime().nullable().default(null),
  packagesRepository: z.string().min(1).default(DEFAULT_PACKAGES_REPOSITORY),
  skillRepository: z.string().min(1),
  profileDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  qualificationDigest: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable()
    .default(null),
  skillDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  packagesRepositoryFingerprint: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable()
    .default(null),
  packagesDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  targetDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  executionEnvironment: QualificationExecutionEnvironmentSchema.nullable().default(null),
  candidate: CandidateClosureSchema.nullable(),
  stages: z.record(z.string(), QualificationStageCheckpointSchema),
  workspaceDirectories: z.record(z.string(), z.string()),
});

export type IQualificationAttemptCheckpoint = z.infer<typeof QualificationAttemptCheckpointSchema>;

// frozen protocol 3–5 per-case summary and flat artifact references
export const QualificationHistoricalCaseResultSchema = z.strictObject({
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
  actorEvidenceCreatedAt: z.string().datetime(),
  judgeEvidenceCreatedAt: z.string().datetime().nullable(),
  actorCacheSourceAttemptId: z.string().nullable(),
  judgeCacheSourceAttemptId: z.string().nullable(),
  failures: z.array(z.string()),
});

export type IQualificationHistoricalCaseResult = z.infer<
  typeof QualificationHistoricalCaseResultSchema
>;

// one protocol 6 initial or confirmation trial and its complete artifact references
export const QualificationTrialResultSchema = z
  .strictObject({
    trialId: z.enum(QUALIFICATION_TRIAL_IDS),
    kind: z.enum(['confirmation', 'initial']),
    confirmationIndex: z.number().int().min(1).max(2).nullable(),
    passed: z.boolean(),
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
    actorEvidenceCreatedAt: z.string().datetime(),
    judgeEvidenceCreatedAt: z.string().datetime().nullable(),
    actorCacheSourceAttemptId: z.string().nullable(),
    judgeCacheSourceAttemptId: z.string().nullable(),
    failures: z.array(z.string()),
  })
  .superRefine((trial, context) => {
    const expectedTrialId =
      trial.kind === 'initial' ? 'initial' : `confirmation-${trial.confirmationIndex}`;

    if (
      (trial.kind === 'initial' && trial.confirmationIndex !== null) ||
      (trial.kind === 'confirmation' && trial.confirmationIndex === null) ||
      trial.trialId !== expectedTrialId
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Trial id, kind, and confirmation index must identify the same trial.',
        path: ['trialId'],
      });
    }

    if (
      (trial.passed && trial.failures.length > 0) ||
      (!trial.passed && trial.failures.length === 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Trial pass state must agree with its recorded failures.',
        path: ['failures'],
      });
    }

    if (
      trial.kind === 'confirmation' &&
      (trial.actorCacheSourceAttemptId !== null || trial.judgeCacheSourceAttemptId !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Confirmation trials must contain fresh actor and judge evidence.',
        path: ['actorCacheSourceAttemptId'],
      });
    }
  });

export type IQualificationTrialResult = z.infer<typeof QualificationTrialResultSchema>;

// terminal protocol 6 case history preserving the original trial and every confirmation
export const QualificationCaseResultSchema = z
  .strictObject({
    caseId: StableIdSchema,
    title: z.string().trim().min(1),
    status: z.enum(['failed', 'passed', 'recovered']),
    confirmationStatus: z.enum(['not-required', 'passed', 'rejected']),
    durationMs: z.number().int().nonnegative(),
    trials: z.array(QualificationTrialResultSchema).min(1).max(3),
    failures: z.array(z.string()),
  })
  .superRefine((caseResult, context) => {
    const trialIds = caseResult.trials.map(({ trialId }) => trialId);
    const initial = caseResult.trials[0];
    const confirmation1 = caseResult.trials[1];
    const confirmation2 = caseResult.trials[2];
    let isValidHistory = initial?.trialId === 'initial';

    if (initial?.passed === true) {
      isValidHistory =
        isValidHistory &&
        caseResult.trials.length === 1 &&
        caseResult.status === 'passed' &&
        caseResult.confirmationStatus === 'not-required';
    } else if (initial !== undefined) {
      isValidHistory =
        isValidHistory &&
        confirmation1?.trialId === 'confirmation-1' &&
        (confirmation1.passed
          ? confirmation2?.trialId === 'confirmation-2' &&
            caseResult.trials.length === 3 &&
            (confirmation2.passed
              ? caseResult.status === 'recovered' && caseResult.confirmationStatus === 'passed'
              : caseResult.status === 'failed' && caseResult.confirmationStatus === 'rejected')
          : caseResult.trials.length === 2 &&
            caseResult.status === 'failed' &&
            caseResult.confirmationStatus === 'rejected');
    }

    if (!isValidHistory || new Set(trialIds).size !== trialIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Case status must agree with its ordered initial and confirmation trials.',
        path: ['trials'],
      });
    }

    if (
      ((caseResult.status === 'passed' || caseResult.status === 'recovered') &&
        caseResult.failures.length > 0) ||
      (caseResult.status === 'failed' && caseResult.failures.length === 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Case status must agree with its terminal failures.',
        path: ['failures'],
      });
    }
  });

export type IQualificationCaseResult = z.infer<typeof QualificationCaseResultSchema>;

// public provenance is content-addressed and intentionally contains no host-absolute paths
export const QualificationProvenanceSchema = z.strictObject({
  ...QualificationExecutionEnvironmentSchema.shape,
  packagesRepositoryCommit: z.string().trim().min(1),
  packagesRepositoryFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  packagesRepositoryDirty: z.boolean(),
  qualificationRepositoryCommit: z.string().trim().min(1),
  qualificationRepositoryDirty: z.boolean(),
  skillRepositoryCommit: z.string().trim().min(1),
  skillRepositoryFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  skillRepositoryDirty: z.boolean(),
  profileDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  qualificationDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  targetDigest: z.string().regex(/^[a-f0-9]{64}$/u),
  baselineAttemptId: z.string().trim().min(1).nullable(),
  packages: z.array(
    CandidatePackageSchema.omit({
      tarballPath: true,
    }),
  ),
});

export type IQualificationProvenance = z.infer<typeof QualificationProvenanceSchema>;

// historical Terra provenance retained for protocol 3 result verification
const QualificationTerraProvenanceSchema = QualificationProvenanceSchema.extend({
  model: z.literal('gpt-5.6-terra'),
});

const QualificationAttemptResultSharedShape = {
  attemptId: z.string().trim().min(1),
  parentAttemptId: z.string().trim().min(1).nullable(),
  selection: QualificationSelectionSchema,
  status: z.enum(['errored', 'failed', 'incomplete', 'passed']),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  evidenceGeneratedAt: z.string().datetime().nullable(),
  summary: z.string().trim().min(1),
  artifactDigests: z.record(RelativePathSchema, z.string().regex(/^[a-f0-9]{64}$/u)),
};

// fixed protocol 6 confirmation policy committed with every current attempt
export const QualificationConfirmationPolicySchema = z.strictObject({
  version: z.literal(QUALIFICATION_CONFIRMATION_POLICY.version),
  requiredPassingConfirmations: z.literal(
    QUALIFICATION_CONFIRMATION_POLICY.requiredPassingConfirmations,
  ),
});

// local protocol 6 result draft shared by dry runs and official result publication
export const QualificationAttemptResultDraftSchema = z.strictObject({
  protocolVersion: z.literal(QUALIFICATION_EVIDENCE_PROTOCOL_VERSION),
  ...QualificationAttemptResultSharedShape,
  confirmationPolicy: QualificationConfirmationPolicySchema,
  provenance: QualificationProvenanceSchema,
  stages: z.array(QualificationStageCheckpointSchema),
  cases: z.array(QualificationCaseResultSchema),
});

export type IQualificationAttemptResult = z.infer<typeof QualificationAttemptResultDraftSchema>;

const QualificationHistoricalAttemptResultShape = {
  ...QualificationAttemptResultSharedShape,
  stages: z.array(QualificationHistoricalStageCheckpointSchema),
  cases: z.array(QualificationHistoricalCaseResultSchema),
};

// protocol 3 Terra draft retained exclusively for immutable history verification
const QualificationTerraAttemptResultDraftSchema = z.strictObject({
  protocolVersion: z.literal(3),
  ...QualificationHistoricalAttemptResultShape,
  provenance: QualificationTerraProvenanceSchema,
});

// protocol 4 Sol draft retained exclusively for immutable history verification
const QualificationProtocol4AttemptResultDraftSchema = z.strictObject({
  protocolVersion: z.literal(4),
  ...QualificationHistoricalAttemptResultShape,
  provenance: QualificationProvenanceSchema,
});

// protocol 5 Sol draft retained exclusively for immutable history verification
const QualificationProtocol5AttemptResultDraftSchema = z.strictObject({
  protocolVersion: z.literal(5),
  ...QualificationHistoricalAttemptResultShape,
  provenance: QualificationProvenanceSchema,
});

const validateQualificationAttemptResult = (
  result:
    | z.infer<typeof QualificationAttemptResultDraftSchema>
    | z.infer<typeof QualificationProtocol5AttemptResultDraftSchema>
    | z.infer<typeof QualificationProtocol4AttemptResultDraftSchema>
    | z.infer<typeof QualificationTerraAttemptResultDraftSchema>,
  context: z.RefinementCtx,
): void => {
  if (
    result.status === 'passed' &&
    (result.provenance.packagesRepositoryDirty ||
      result.provenance.qualificationRepositoryDirty ||
      result.provenance.skillRepositoryDirty)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Passing qualification evidence requires clean repository inputs.',
      path: ['provenance'],
    });
  }

  if (
    result.status === 'passed' &&
    result.selection.adapterId !== 'custom' &&
    result.provenance.baselineAttemptId === null
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Passing adapter qualification evidence requires a compatible Custom baseline.',
      path: ['provenance', 'baselineAttemptId'],
    });
  }

  const hasTrustedModelEndpoint =
    result.provenance.modelEndpoint === null ||
    QUALIFICATION_MODEL_ENDPOINT_ORIGINS.some(
      (origin) => origin === result.provenance.modelEndpoint?.origin,
    );
  const hasRestrictedEgress =
    JSON.stringify([...result.provenance.allowedEgressHosts].sort()) ===
    JSON.stringify(QUALIFICATION_ALLOWED_EGRESS_HOSTS);

  if (
    result.status === 'passed' &&
    (!hasTrustedModelEndpoint ||
      !hasRestrictedEgress ||
      result.provenance.sslCertificateFileSha256 !== null)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Passing qualification evidence requires the trusted execution-host boundary.',
      path: ['provenance'],
    });
  }
};

const validateCurrentQualificationAttemptResult = (
  result: z.infer<typeof QualificationAttemptResultDraftSchema>,
  context: z.RefinementCtx,
): void => {
  validateQualificationAttemptResult(result, context);

  if (result.status === 'passed' && result.cases.some(({ status }) => status === 'failed')) {
    context.addIssue({
      code: 'custom',
      message: 'A passing qualification attempt cannot contain a failed case.',
      path: ['cases'],
    });
  }

  if (
    result.status === 'failed' &&
    result.cases.length > 0 &&
    !result.cases.some(({ status }) => status === 'failed')
  ) {
    context.addIssue({
      code: 'custom',
      message: 'A case-driven failed qualification attempt must contain a failed case.',
      path: ['cases'],
    });
  }
};

// current committed attempt record used by the release workflow
export const QualificationAttemptResultSchema = QualificationAttemptResultDraftSchema.superRefine(
  validateCurrentQualificationAttemptResult,
);

// protocol 3 Terra attempt retained exclusively for immutable history verification
const QualificationTerraAttemptResultSchema =
  QualificationTerraAttemptResultDraftSchema.superRefine(validateQualificationAttemptResult);

// protocol 4 and 5 Sol attempts retained exclusively for immutable history verification
const QualificationProtocol4AttemptResultSchema =
  QualificationProtocol4AttemptResultDraftSchema.superRefine(validateQualificationAttemptResult);
const QualificationProtocol5AttemptResultSchema =
  QualificationProtocol5AttemptResultDraftSchema.superRefine(validateQualificationAttemptResult);

// complete readable history across frozen protocols 3–5 plus the current contract
export const QualificationRecordedAttemptResultSchema = z.union([
  QualificationTerraAttemptResultSchema,
  QualificationProtocol4AttemptResultSchema,
  QualificationProtocol5AttemptResultSchema,
  QualificationAttemptResultSchema,
]);

export type IQualificationRecordedAttemptResult = z.infer<
  typeof QualificationRecordedAttemptResultSchema
>;

// latest always names the newest attempt while preserving the newest passing baseline separately
export const QualificationLatestResultSchema = z.strictObject({
  protocolVersion: z.literal(QUALIFICATION_EVIDENCE_PROTOCOL_VERSION),
  adapterId: StableIdSchema,
  implementationId: StableIdSchema,
  latestAttemptId: z.string().trim().min(1),
  latestStatus: z.enum(['errored', 'failed', 'incomplete', 'passed']),
  lastPassingAttemptId: z.string().trim().min(1).nullable(),
  updatedAt: z.string().datetime(),
});

export type IQualificationLatestResult = z.infer<typeof QualificationLatestResultSchema>;

// protocol 3 pointer retained exclusively for immutable history verification
const QualificationTerraLatestResultSchema = QualificationLatestResultSchema.extend({
  protocolVersion: z.literal(3),
});

// protocol 4 pointer retained exclusively for immutable history verification
const QualificationProtocol4LatestResultSchema = QualificationLatestResultSchema.extend({
  protocolVersion: z.literal(4),
});

// protocol 5 pointer retained exclusively for immutable history verification
const QualificationProtocol5LatestResultSchema = QualificationLatestResultSchema.extend({
  protocolVersion: z.literal(5),
});

export const QualificationRecordedLatestResultSchema = z.union([
  QualificationTerraLatestResultSchema,
  QualificationProtocol4LatestResultSchema,
  QualificationProtocol5LatestResultSchema,
  QualificationLatestResultSchema,
]);

export type IQualificationRecordedLatestResult = z.infer<
  typeof QualificationRecordedLatestResultSchema
>;
