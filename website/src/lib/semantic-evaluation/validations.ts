import { z } from 'zod';

import {
  CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
  hasPassingCodexEvaluationCommandPolicy,
} from '../../../../tooling/codex-evaluation-host/index.mjs';
import {
  hasValidActorExecutionEvidence,
  type ISemanticActorExecutionEvidenceOptions,
} from '../../../../tooling/semantic-evaluation/index.mjs';
import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from '../../../../tooling/release-identity/constants.mjs';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../../tooling/resource-calibration/profiles.mjs';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const StableIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const AttemptStatusSchema = z.enum(['failed', 'incomplete', 'passed']);

// website read models select the current evidence fields rendered by public pages
const SemanticActorHostSchema = z.strictObject({
  developerInstructionsSha256: z.literal(CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256),
  model: z.literal('gpt-5.6-sol'),
  name: z.literal('codex'),
  reasoningEffort: z.literal('high'),
  role: z.literal('actor'),
  version: z.string().trim().min(1),
});
const SemanticJudgeHostSchema = z.strictObject({
  developerInstructionsSha256: z.literal(CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256),
  model: z.literal('gpt-5.6-sol'),
  name: z.literal('codex'),
  reasoningEffort: z.literal('xhigh'),
  role: z.literal('judge'),
  version: z.string().trim().min(1),
});
const SemanticHostContractSchema = z.strictObject({
  actor: SemanticActorHostSchema.omit({ version: true }),
  judge: SemanticJudgeHostSchema.omit({ version: true }),
});
const SemanticFailureClassificationSchema = z.enum([
  'semantic',
  'resource',
  'commandPolicy',
  'repositoryControl',
  'mountIntegrity',
  'operational',
]);
const SEMANTIC_FAILURE_CLASSIFICATIONS = SemanticFailureClassificationSchema.options;
const SemanticResultDimensionsSchema = z.strictObject({
  semantic: z.boolean(),
  resource: z.boolean(),
  commandPolicy: z.boolean(),
  repositoryControl: z.boolean(),
  mountIntegrity: z.boolean(),
  operational: z.boolean(),
});

/** Derives the exact content-free failure classification for one public trial. */
const getSemanticFailureClassifications = (
  dimensions: z.infer<typeof SemanticResultDimensionsSchema>,
): Array<z.infer<typeof SemanticFailureClassificationSchema>> =>
  SEMANTIC_FAILURE_CLASSIFICATIONS.filter((dimension) => !dimensions[dimension]);

/** Limits confirmation eligibility to semantic-only failures. */
const isSemanticConfirmationEligible = (
  dimensions: z.infer<typeof SemanticResultDimensionsSchema>,
): boolean =>
  !dimensions.semantic &&
  SEMANTIC_FAILURE_CLASSIFICATIONS.filter((dimension) => dimension !== 'semantic').every(
    (dimension) => dimensions[dimension],
  );
const SemanticModelUsageSchema = z
  .strictObject({
    cachedInputTokens: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  })
  .refine(
    (usage) =>
      usage.cachedInputTokens <= usage.inputTokens &&
      usage.inputTokens + usage.outputTokens <=
        MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount,
    'Model usage exceeds the semantic token boundary.',
  );
const SemanticCommandPolicyReasonSchema = z.strictObject({
  code: z.enum([
    'broad-filesystem-read',
    'credential-material',
    'dynamic-execution',
    'environment-dump',
    'environment-value-read',
    'evaluator-auth-file',
    'evaluator-home',
    'git-network',
    'network-client',
    'oversized-command',
    'package-manager-network',
    'process-environment',
    'unclassified-command',
  ]),
  count: z.number().int().positive(),
});
const NETWORK_OBSERVED_REASON_CODES = new Set([
  'git-network',
  'network-client',
  'package-manager-network',
]);
const NETWORK_INDETERMINATE_REASON_CODES = new Set([
  'dynamic-execution',
  'oversized-command',
  'unclassified-command',
]);
const SENSITIVE_OBSERVED_REASON_CODES = new Set([
  'environment-dump',
  'environment-value-read',
  'evaluator-auth-file',
  'evaluator-home',
  'process-environment',
]);
const SENSITIVE_INDETERMINATE_REASON_CODES = new Set([
  'broad-filesystem-read',
  'dynamic-execution',
  'oversized-command',
  'unclassified-command',
]);
const SemanticCommandPolicyObservationSchema = z.strictObject({
  status: z.enum(['indeterminate', 'not-observed', 'observed']),
  observedCount: z.number().int().nonnegative(),
  indeterminateCount: z.number().int().nonnegative(),
  reasons: z.array(SemanticCommandPolicyReasonSchema),
});
const SemanticCommandPolicyEvidenceSchema = z
  .strictObject({
    completedCommandCount: z
      .number()
      .int()
      .min(0)
      .max(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxCompletedCommandCount),
    credentialExposure: z.strictObject({
      status: z.enum(['not-observed', 'observed']),
      observedCount: z.number().int().nonnegative(),
      reasons: z.array(SemanticCommandPolicyReasonSchema),
    }),
    maximumCommandOutputByteCount: z
      .number()
      .int()
      .min(0)
      .max(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxModelVisibleToolOutputBytes),
    modelVisibleToolOutputByteCount: z
      .number()
      .int()
      .min(0)
      .max(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxModelVisibleToolOutputBytes),
    moldeaCommandCount: z
      .number()
      .int()
      .min(0)
      .max(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaCommandCount),
    moldeaOutputByteCount: z
      .number()
      .int()
      .min(0)
      .max(MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaOutputBytes),
    networkAccess: SemanticCommandPolicyObservationSchema,
    sensitiveAccess: SemanticCommandPolicyObservationSchema,
  })
  .superRefine((evidence, context) => {
    for (const field of ['networkAccess', 'sensitiveAccess'] as const) {
      const observation = evidence[field];
      const observedReasonCodes =
        field === 'networkAccess' ? NETWORK_OBSERVED_REASON_CODES : SENSITIVE_OBSERVED_REASON_CODES;
      const indeterminateReasonCodes =
        field === 'networkAccess'
          ? NETWORK_INDETERMINATE_REASON_CODES
          : SENSITIVE_INDETERMINATE_REASON_CODES;
      const expectedStatus =
        observation.observedCount > 0
          ? 'observed'
          : observation.indeterminateCount > 0
            ? 'indeterminate'
            : 'not-observed';
      const observedReasonCount = observation.reasons.reduce(
        (total, reason) => total + (observedReasonCodes.has(reason.code) ? reason.count : 0),
        0,
      );
      const indeterminateReasonCount = observation.reasons.reduce(
        (total, reason) => total + (indeterminateReasonCodes.has(reason.code) ? reason.count : 0),
        0,
      );
      if (
        observation.status !== expectedStatus ||
        observation.observedCount + observation.indeterminateCount >
          evidence.completedCommandCount ||
        observedReasonCount !== observation.observedCount ||
        indeterminateReasonCount !== observation.indeterminateCount ||
        observation.reasons.reduce((total, reason) => total + reason.count, 0) !==
          observation.observedCount + observation.indeterminateCount ||
        new Set(observation.reasons.map(({ code }) => code)).size !== observation.reasons.length ||
        observation.reasons.some(
          (reason, index) =>
            index > 0 && (observation.reasons[index - 1]?.code ?? '') >= reason.code,
        )
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Command-policy status must match its bounded counts.',
          path: [field],
        });
      }
    }
    const expectedCredentialStatus =
      evidence.credentialExposure.observedCount > 0 ? 'observed' : 'not-observed';
    if (
      evidence.credentialExposure.status !== expectedCredentialStatus ||
      evidence.credentialExposure.reasons.reduce((total, reason) => total + reason.count, 0) !==
        evidence.credentialExposure.observedCount ||
      (evidence.credentialExposure.observedCount > 0 &&
        (evidence.credentialExposure.reasons.length !== 1 ||
          evidence.credentialExposure.reasons[0]?.code !== 'credential-material')) ||
      (evidence.credentialExposure.observedCount === 0 &&
        evidence.credentialExposure.reasons.length !== 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Credential-exposure evidence is inconsistent.',
        path: ['credentialExposure'],
      });
    }
    if (
      evidence.maximumCommandOutputByteCount > evidence.modelVisibleToolOutputByteCount ||
      (evidence.completedCommandCount === 0 && evidence.maximumCommandOutputByteCount !== 0) ||
      evidence.moldeaCommandCount > evidence.completedCommandCount ||
      (evidence.moldeaCommandCount === 0 && evidence.moldeaOutputByteCount !== 0) ||
      evidence.moldeaOutputByteCount > evidence.modelVisibleToolOutputByteCount
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Command-policy resource totals are inconsistent.',
      });
    }
  });
const SemanticActorResourceEvidenceSchema = z
  .strictObject({
    commandCount: z.number().int().min(0).max(16),
    maximumInvocationByteCount: z.number().int().min(0).max(1_048_576),
    modelVisibleToolOutputByteCount: z.number().int().min(0).max(1_048_576),
    operations: z
      .array(z.enum(['composition', 'content', 'inspect', 'scope', 'unrecognized', 'validate']))
      .max(16),
    stdoutByteCount: z.number().int().min(0).max(1_048_576),
  })
  .superRefine((evidence, context) => {
    if (
      evidence.operations.length !== evidence.commandCount ||
      evidence.maximumInvocationByteCount > evidence.stdoutByteCount ||
      evidence.modelVisibleToolOutputByteCount !== evidence.stdoutByteCount ||
      (evidence.commandCount === 0 &&
        (evidence.maximumInvocationByteCount !== 0 || evidence.stdoutByteCount !== 0))
    ) {
      context.addIssue({ code: 'custom', message: 'Invalid moldea resource aggregate.' });
    }
  });

export const SemanticCliIdentitySchema = z.strictObject({
  integrity: z.string().startsWith('sha512-'),
  jsonSchemaVersion: z.number().int().positive(),
  name: z.literal('@moldea.ai/cli'),
  packageLockSha256: Sha256Schema,
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u),
});

const SemanticStageTrialIdentitySchema = z.strictObject({
  caseId: StableIdSchema,
  confirmationIndex: z.union([z.literal(1), z.literal(2)]).nullable(),
  kind: z.enum(['confirmation', 'initial']),
});
const SemanticStageReuseRecordShape = {
  identitySha256: Sha256Schema,
  origin: z.literal('reused'),
  schemaVersion: z.literal(1),
  source: z.strictObject({
    attemptId: z.string().trim().min(1),
    commit: z.string().regex(/^[a-f0-9]{40,64}$/u),
    evidencePath: z
      .string()
      .startsWith('fixtures/semantic-evaluation-results/attempts/')
      .endsWith('/evidence.json'),
    evidenceSha256: Sha256Schema,
    trial: SemanticStageTrialIdentitySchema,
  }),
};
const SemanticStageReuseSchema = z.strictObject({
  actor: z.strictObject({ ...SemanticStageReuseRecordShape, stage: z.literal('actor') }),
  judge: z.strictObject({ ...SemanticStageReuseRecordShape, stage: z.literal('judge') }),
});
type ISemanticStageReuseSource = z.infer<typeof SemanticStageReuseRecordShape.source>;

/** Compares actor and judge provenance for one shared source trial. */
const hasMatchingStageReuseSource = (
  actorSource: ISemanticStageReuseSource,
  judgeSource: ISemanticStageReuseSource,
): boolean =>
  actorSource.attemptId === judgeSource.attemptId &&
  actorSource.commit === judgeSource.commit &&
  actorSource.evidencePath === judgeSource.evidencePath &&
  actorSource.evidenceSha256 === judgeSource.evidenceSha256 &&
  actorSource.trial.caseId === judgeSource.trial.caseId &&
  actorSource.trial.confirmationIndex === judgeSource.trial.confirmationIndex &&
  actorSource.trial.kind === judgeSource.trial.kind;

const SemanticAttemptTrialSchema = z
  .strictObject({
    actorCommandPolicyEvidence: SemanticCommandPolicyEvidenceSchema,
    actorResourceEvidence: SemanticActorResourceEvidenceSchema,
    actorHost: SemanticActorHostSchema,
    confirmationEligible: z.boolean(),
    confirmationIndex: z.union([z.literal(1), z.literal(2)]).nullable(),
    dimensions: SemanticResultDimensionsSchema,
    evaluatedAt: z.iso.datetime(),
    executionOrigin: z.enum(['executed', 'reused']),
    forbidden: z.array(StableIdSchema),
    failureClassifications: z.array(SemanticFailureClassificationSchema),
    judgeCommandPolicyEvidence: SemanticCommandPolicyEvidenceSchema,
    judgeHost: SemanticJudgeHostSchema,
    kind: z.enum(['confirmation', 'initial']),
    observed: z.array(StableIdSchema),
    passed: z.boolean(),
    rationale: z.string().trim().min(1),
    stageReuse: SemanticStageReuseSchema.nullable(),
  })
  .superRefine((trial, context) => {
    const failureClassifications = getSemanticFailureClassifications(trial.dimensions);
    const commandPolicyPassed =
      hasPassingCodexEvaluationCommandPolicy(trial.actorCommandPolicyEvidence) &&
      hasPassingCodexEvaluationCommandPolicy(trial.judgeCommandPolicyEvidence);
    if (
      (trial.executionOrigin === 'executed' && trial.stageReuse !== null) ||
      (trial.executionOrigin === 'reused' &&
        (trial.stageReuse === null ||
          trial.stageReuse.actor.stage !== 'actor' ||
          trial.stageReuse.judge.stage !== 'judge' ||
          !hasMatchingStageReuseSource(
            trial.stageReuse.actor.source,
            trial.stageReuse.judge.source,
          ) ||
          trial.stageReuse.actor.source.trial.caseId !==
            trial.stageReuse.judge.source.trial.caseId ||
          trial.stageReuse.actor.source.trial.confirmationIndex !== trial.confirmationIndex ||
          trial.stageReuse.actor.source.trial.kind !== trial.kind))
    ) {
      context.addIssue({ code: 'custom', message: 'Invalid semantic execution provenance.' });
    }
    if (
      trial.dimensions.commandPolicy !== commandPolicyPassed ||
      trial.passed !== (failureClassifications.length === 0) ||
      trial.confirmationEligible !== isSemanticConfirmationEligible(trial.dimensions) ||
      JSON.stringify(trial.failureClassifications) !== JSON.stringify(failureClassifications)
    ) {
      context.addIssue({ code: 'custom', message: 'Invalid semantic result dimensions.' });
    }
  });

const SemanticAttemptEvidenceReferenceBaseSchema = z.strictObject({
  kind: z.literal('candidate'),
  path: z.literal('evidence.json'),
  sha256: Sha256Schema,
});
const SemanticAttemptEvidenceReferenceSchema = SemanticAttemptEvidenceReferenceBaseSchema.extend({
  evaluationProtocolVersion: z.literal(SEMANTIC_EVALUATION_PROTOCOL_VERSION),
  schemaVersion: z.literal(9),
});

const SemanticReplayMoldeaOutputFactSchema = z.object({
  cliVersion: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u),
  command: z.enum(['composition', 'content', 'inspect', 'scope', 'validate']),
  containsContent: z.boolean(),
  errorCode: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]{0,63}$/u)
    .nullable(),
  errorPresent: z.boolean(),
  hasNextPage: z.boolean(),
  kind: z.literal('moldea-cli-envelope'),
  pageRecordCount: z.number().int().nonnegative(),
  relevant: z.boolean().nullable(),
  resultPresent: z.boolean(),
  schemaVersion: z.number().int().positive(),
  status: z.enum(['error', 'invalid', 'valid']),
});
const SemanticReplayNodeTestSummaryFactSchema = z
  .object({
    cancelledCount: z.literal(0),
    failedCount: z.literal(0),
    kind: z.literal('node-test-summary'),
    passedCount: z.number().int().positive(),
    skippedCount: z.literal(0),
    status: z.literal('passed'),
    testCount: z.number().int().positive(),
    testKind: z.enum(['correctness', 'e2e', 'integration', 'unit']),
    todoCount: z.literal(0),
  })
  .refine(({ passedCount, testCount }) => passedCount === testCount, {
    message: 'Projected repository test totals must describe a complete passing run.',
  });
const SemanticReplayOutputFactSchema = z.discriminatedUnion('kind', [
  SemanticReplayMoldeaOutputFactSchema,
  SemanticReplayNodeTestSummaryFactSchema,
]);
const SemanticReplayCommandSchema = z.object({
  eventType: z.literal('item.completed'),
  item: z.object({
    commandKind: z.enum(['moldea', 'other']),
    exitCode: z.number().int(),
    outputEvidence: z.object({
      byteCount: z.number().int().nonnegative(),
      disposition: z.enum(['empty', 'projected', 'too-large', 'unrecognized']),
      facts: z.array(SemanticReplayOutputFactSchema).max(1),
    }),
    status: z.enum(['completed', 'failed']),
    type: z.literal('command_execution'),
  }),
});
const SemanticReplayExecutionEvidenceCandidateSchema = z.object({
  confirmations: z.array(z.object({ actorExecutionEvidence: z.unknown() })),
  results: z.array(z.object({ actorExecutionEvidence: z.unknown() })),
});
const SemanticReplayDeveloperDirectionEvidenceEntrySchema = z.object({
  observation: z.object({
    content: z
      .string()
      .min(1)
      .refine((content) => content.trim() === content, 'Developer direction must be trimmed.'),
    type: z.literal('developer-direction'),
  }),
  source: z.object({ kind: z.literal('developer-direction') }),
});

const isUnknownRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

// selects the sole recorded developer direction without retaining other scenario evidence
const SemanticReplayDeveloperDirectionSchema = z
  .array(z.unknown())
  .transform((entries, context) => {
    const developerDirectionEntries = entries.filter((entry) => {
      if (!isUnknownRecord(entry) || !isUnknownRecord(entry['source'])) return false;
      return entry['source']['kind'] === 'developer-direction';
    });
    if (developerDirectionEntries.length > 1) {
      context.addIssue({
        code: 'custom',
        message: 'Replay evidence contains multiple recorded developer directions.',
      });
      return null;
    }
    if (developerDirectionEntries.length === 0) return null;

    const parsedEntry = SemanticReplayDeveloperDirectionEvidenceEntrySchema.safeParse(
      developerDirectionEntries[0],
    );
    if (!parsedEntry.success) {
      context.addIssue({
        code: 'custom',
        message: 'Replay evidence contains an invalid recorded developer direction.',
      });
      return null;
    }

    return parsedEntry.data.observation.content;
  });
const SemanticReplayWorkspaceStateSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('file') }),
  z.object({ type: z.literal('symlink') }),
]);
const SemanticReplayWorkspaceChangesSchema = z.object({
  created: z.array(
    z.object({ path: z.string().min(1), state: SemanticReplayWorkspaceStateSchema }),
  ),
  deleted: z.array(
    z.object({ path: z.string().min(1), state: SemanticReplayWorkspaceStateSchema }),
  ),
  modified: z.array(
    z.object({
      after: SemanticReplayWorkspaceStateSchema,
      before: SemanticReplayWorkspaceStateSchema,
      path: z.string().min(1),
    }),
  ),
});
const SemanticReplayTrialShape = {
  actorCommandPolicyEvidence: SemanticCommandPolicyEvidenceSchema,
  actorResourceEvidence: SemanticActorResourceEvidenceSchema,
  actorExecutionEvidence: z.array(SemanticReplayCommandSchema).max(128),
  actorHost: SemanticActorHostSchema,
  actorUsage: SemanticModelUsageSchema,
  actorResponse: z.string(),
  caseDefinitionDigest: Sha256Schema,
  caseId: StableIdSchema,
  confirmationEligible: z.boolean(),
  dimensions: SemanticResultDimensionsSchema,
  evaluatedAt: z.iso.datetime(),
  executionOrigin: z.enum(['executed', 'reused']),
  forbidden: z.array(StableIdSchema),
  judgeCommandPolicyEvidence: SemanticCommandPolicyEvidenceSchema,
  failureClassifications: z.array(SemanticFailureClassificationSchema),
  id: StableIdSchema,
  judgeHost: SemanticJudgeHostSchema,
  judgeUsage: SemanticModelUsageSchema,
  observed: z.array(StableIdSchema),
  passed: z.boolean(),
  rationale: z.string().trim().min(1),
  stageReuse: SemanticStageReuseSchema.nullable(),
  workspaceChanges: SemanticReplayWorkspaceChangesSchema,
};
const SemanticReplayInitialTrialSchema = z
  .object({
    ...SemanticReplayTrialShape,
    scenarioEvidence: SemanticReplayDeveloperDirectionSchema,
  })
  .superRefine((trial, context) => {
    if (
      trial.dimensions.commandPolicy !==
      (hasPassingCodexEvaluationCommandPolicy(trial.actorCommandPolicyEvidence) &&
        hasPassingCodexEvaluationCommandPolicy(trial.judgeCommandPolicyEvidence))
    ) {
      context.addIssue({ code: 'custom', message: 'Invalid semantic command-policy dimension.' });
    }
  })
  .transform(({ scenarioEvidence: developerDirection, ...trial }) => ({
    ...trial,
    developerDirection,
  }));
const SemanticReplayConfirmationTrialSchema = z
  .object({
    ...SemanticReplayTrialShape,
    confirmationIndex: z.union([z.literal(1), z.literal(2)]),
    scenarioEvidence: SemanticReplayDeveloperDirectionSchema,
  })
  .superRefine((trial, context) => {
    if (
      trial.dimensions.commandPolicy !==
      (hasPassingCodexEvaluationCommandPolicy(trial.actorCommandPolicyEvidence) &&
        hasPassingCodexEvaluationCommandPolicy(trial.judgeCommandPolicyEvidence))
    ) {
      context.addIssue({ code: 'custom', message: 'Invalid semantic command-policy dimension.' });
    }
  })
  .transform(({ scenarioEvidence: developerDirection, ...trial }) => ({
    ...trial,
    developerDirection,
  }));

// public-safe projection selected from one digest-verified current evidence artifact
export const SemanticReplayCandidateSchema = z.object({
  confirmations: z.array(SemanticReplayConfirmationTrialSchema),
  evaluationProtocolVersion: z.literal(SEMANTIC_EVALUATION_PROTOCOL_VERSION),
  results: z.array(SemanticReplayInitialTrialSchema),
  schemaVersion: z.literal(9),
});

/**
 * Validates raw replay command evidence with the evaluator-owned protocol validator.
 * @param candidate Raw immutable semantic evidence.
 * @param options Exact release CLI envelope identity.
 * @returns Whether every initial and confirmation trial contains strict bounded command evidence.
 */
export const hasValidSemanticReplayExecutionEvidence = (
  candidate: unknown,
  options: ISemanticActorExecutionEvidenceOptions,
): boolean => {
  const parsedCandidate = SemanticReplayExecutionEvidenceCandidateSchema.safeParse(candidate);
  if (!parsedCandidate.success) return false;

  return [...parsedCandidate.data.results, ...parsedCandidate.data.confirmations].every(
    ({ actorExecutionEvidence }) => hasValidActorExecutionEvidence(actorExecutionEvidence, options),
  );
};

type ISemanticAttemptCase = {
  confirmationStatus: 'not-applicable' | 'not-required' | 'passed' | 'rejected' | 'required';
  id: string;
  status: 'failed' | 'passed' | 'recovered';
  trials: Array<z.infer<typeof SemanticAttemptTrialSchema>>;
};

/** Validates the complete ordered trial history and derived status for one semantic case. */
const hasValidSemanticAttemptCaseHistory = (attemptCase: ISemanticAttemptCase): boolean => {
  const [initial, confirmation1, confirmation2] = attemptCase.trials;
  if (initial?.kind !== 'initial' || initial.confirmationIndex !== null) return false;
  if (
    attemptCase.trials.length > 3 ||
    attemptCase.trials
      .slice(1)
      .some(
        (trial, index) => trial.kind !== 'confirmation' || trial.confirmationIndex !== index + 1,
      )
  ) {
    return false;
  }

  if (initial.passed) {
    return (
      attemptCase.trials.length === 1 &&
      attemptCase.status === 'passed' &&
      attemptCase.confirmationStatus === 'not-required'
    );
  }
  if (!initial.confirmationEligible) {
    return (
      attemptCase.trials.length === 1 &&
      attemptCase.status === 'failed' &&
      attemptCase.confirmationStatus === 'not-applicable'
    );
  }
  if (confirmation1 === undefined) {
    return attemptCase.status === 'failed' && attemptCase.confirmationStatus === 'required';
  }
  if (!confirmation1.passed) {
    return (
      attemptCase.trials.length === 2 &&
      attemptCase.status === 'failed' &&
      attemptCase.confirmationStatus === 'rejected'
    );
  }
  if (confirmation2 === undefined) {
    return attemptCase.status === 'failed' && attemptCase.confirmationStatus === 'required';
  }

  return (
    attemptCase.trials.length === 3 &&
    (confirmation2.passed
      ? attemptCase.status === 'recovered' && attemptCase.confirmationStatus === 'passed'
      : attemptCase.status === 'failed' && attemptCase.confirmationStatus === 'rejected')
  );
};

export const SemanticAttemptRecordSchema = z
  .strictObject({
    artifactDigest: Sha256Schema,
    attemptId: z.string().trim().min(1),
    caseSuiteDigest: Sha256Schema,
    cases: z.array(
      z.strictObject({
        confirmationStatus: z.enum([
          'not-applicable',
          'not-required',
          'passed',
          'rejected',
          'required',
        ]),
        id: StableIdSchema,
        status: z.enum(['failed', 'passed', 'recovered']),
        trials: z.array(SemanticAttemptTrialSchema).min(1).max(3),
      }),
    ),
    cli: SemanticCliIdentitySchema,
    coverageDigest: Sha256Schema,
    createdAt: z.iso.datetime(),
    evidence: SemanticAttemptEvidenceReferenceSchema,
    failedCaseCount: z.number().int().nonnegative(),
    executedStageCount: z.number().int().nonnegative(),
    executedTrialCount: z.number().int().nonnegative(),
    hostContract: SemanticHostContractSchema,
    passedCaseCount: z.number().int().nonnegative(),
    pendingCaseCount: z.number().int().nonnegative(),
    recordedAt: z.iso.datetime(),
    recoveredCaseCount: z.number().int().nonnegative(),
    reusedStageCount: z.number().int().nonnegative(),
    reusedTrialCount: z.number().int().nonnegative(),
    schemaVersion: z.literal(6),
    status: AttemptStatusSchema,
    stopReason: z.enum([
      'case-failure',
      'complete',
      'complete-with-failures',
      'confirmation-failure',
      'confirmations-passed',
      'operator-recorded',
    ]),
    totalCaseCount: z.number().int().positive(),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((attempt, context) => {
    const passedCaseCount = attempt.cases.filter(({ status }) => status === 'passed').length;
    const recoveredCaseCount = attempt.cases.filter(({ status }) => status === 'recovered').length;
    const failedCaseCount = attempt.cases.filter(({ status }) => status === 'failed').length;
    const pendingCaseCount = attempt.totalCaseCount - attempt.cases.length;
    const status = failedCaseCount > 0 ? 'failed' : pendingCaseCount > 0 ? 'incomplete' : 'passed';
    const hasRejectedConfirmation = attempt.cases.some(
      ({ confirmationStatus }) => confirmationStatus === 'rejected',
    );
    const hasUnconfirmedInitialFailure = attempt.cases.some(
      ({ confirmationStatus, trials: caseTrials }) =>
        confirmationStatus === 'required' && caseTrials.length === 1,
    );
    const hasValidStopReason =
      attempt.stopReason === 'operator-recorded' ||
      (attempt.stopReason === 'complete' && status === 'passed') ||
      (attempt.stopReason === 'complete-with-failures' &&
        status === 'failed' &&
        pendingCaseCount === 0 &&
        !hasUnconfirmedInitialFailure) ||
      (attempt.stopReason === 'case-failure' && hasUnconfirmedInitialFailure) ||
      (attempt.stopReason === 'confirmation-failure' && hasRejectedConfirmation) ||
      (attempt.stopReason === 'confirmations-passed' &&
        failedCaseCount === 0 &&
        recoveredCaseCount > 0);
    if (
      new Set(attempt.cases.map(({ id }) => id)).size !== attempt.cases.length ||
      pendingCaseCount < 0 ||
      attempt.passedCaseCount !== passedCaseCount ||
      attempt.recoveredCaseCount !== recoveredCaseCount ||
      attempt.failedCaseCount !== failedCaseCount ||
      attempt.pendingCaseCount !== pendingCaseCount ||
      attempt.status !== status ||
      !hasValidStopReason ||
      attempt.cases.some((attemptCase) => !hasValidSemanticAttemptCaseHistory(attemptCase))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic attempt case history and aggregate result are contradictory.',
      });
    }

    const trials = attempt.cases.flatMap(({ trials: caseTrials }) => caseTrials);
    const executedTrialCount = trials.filter(
      ({ executionOrigin }) => executionOrigin === 'executed',
    ).length;
    const reusedTrialCount = trials.length - executedTrialCount;
    if (
      attempt.executedTrialCount !== executedTrialCount ||
      attempt.reusedTrialCount !== reusedTrialCount ||
      attempt.executedStageCount !== executedTrialCount * 2 ||
      attempt.reusedStageCount !== reusedTrialCount * 2
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic execution counts are contradictory.',
      });
    }

    for (const [caseIndex, attemptCase] of attempt.cases.entries()) {
      for (const [trialIndex, trial] of attemptCase.trials.entries()) {
        if (
          trial.executionOrigin === 'reused' &&
          trial.stageReuse?.actor.source.trial.caseId !== attemptCase.id
        ) {
          context.addIssue({
            code: 'custom',
            message: 'Semantic reuse provenance references another case.',
            path: ['cases', caseIndex, 'trials', trialIndex, 'stageReuse'],
          });
        }
      }
    }
  });

export const SemanticLatestResultSchema = z.object({
  lastPassingAttemptId: z.string().trim().min(1).nullable(),
  latestAttemptId: z.string().trim().min(1),
  latestStatus: AttemptStatusSchema,
  schemaVersion: z.literal(1),
  updatedAt: z.iso.datetime(),
});

export type ISemanticAttemptRecord = z.infer<typeof SemanticAttemptRecordSchema>;
export type ISemanticLatestResult = z.infer<typeof SemanticLatestResultSchema>;
export type ISemanticReplayCandidate = z.infer<typeof SemanticReplayCandidateSchema>;
export type ISemanticReplayCommand = z.infer<typeof SemanticReplayCommandSchema>;
export type ISemanticReplayTrial = z.infer<typeof SemanticReplayInitialTrialSchema>;
