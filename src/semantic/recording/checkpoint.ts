import path from 'node:path';

import { z } from 'zod';

import {
  GitInvocationEvidenceSchema,
  hasValidCodexEvaluationCommandPolicy,
} from '../../execution/host/index.ts';
import {
  readJsonFile,
  resolveContainedPath,
  writeJsonFileAtomically,
} from '../../filesystem/index.ts';
import {
  hasValidSemanticCycles,
  summarizeSemanticCycles,
  type ISemanticCycleEvidence,
  type ISemanticActorExecutionEvidenceOptions,
} from '../execution/index.ts';
import { serializeSemanticStageValue } from '../stages/index.ts';
import type {
  ISemanticCandidateCheckpoint,
  ISemanticRecordedTrial,
  ISemanticActiveTrialActorEvidence,
} from './types.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const HostIdentitySchema = z.strictObject({
  developerInstructionsSha256: Sha256Schema,
  model: z.string().trim().min(1),
  name: z.string().trim().min(1),
  reasoningEffort: z.string().trim().min(1),
  role: z.enum(['actor', 'judge']),
  version: z.string().trim().min(1),
});
const CommandPolicyReasonSchema = z.strictObject({
  code: z.string().trim().min(1),
  count: z.number().int().nonnegative(),
});
const CommandPolicyObservationSchema = z.strictObject({
  indeterminateCount: z.number().int().nonnegative(),
  observedCount: z.number().int().nonnegative(),
  reasons: z.array(CommandPolicyReasonSchema),
  status: z.enum(['indeterminate', 'not-observed', 'observed']),
});
const OwnedCommandTotalsSchema = z.strictObject({
  commandCount: z.number().int().nonnegative(),
  maximumOutputByteCount: z.number().int().nonnegative(),
  outputByteCount: z.number().int().nonnegative(),
});
const MoldeaEventSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('command'),
    operation: z.enum(['composition', 'content', 'inspect', 'scope', 'validate']).nullable(),
    outputByteCount: z.number().int().nonnegative(),
    ownership: z.enum(['canonical', 'cli', 'helper']),
  }),
  z.strictObject({
    kind: z.literal('file-change'),
    moldeaPath: z.enum(['not-touching', 'touching', 'unreadable']),
  }),
]);
const CommandPolicySchema = z.strictObject({
  commandOwnership: z.strictObject({
    canonical: OwnedCommandTotalsSchema,
    cli: OwnedCommandTotalsSchema,
    helper: OwnedCommandTotalsSchema,
    project: OwnedCommandTotalsSchema,
    source: OwnedCommandTotalsSchema,
  }),
  completedCommandCount: z.number().int().nonnegative(),
  credentialExposure: z.strictObject({
    observedCount: z.number().int().nonnegative(),
    reasons: z.array(CommandPolicyReasonSchema),
    status: z.enum(['not-observed', 'observed']),
  }),
  maximumCommandOutputByteCount: z.number().int().nonnegative(),
  modelVisibleToolOutputByteCount: z.number().int().nonnegative(),
  moldeaCommandCount: z.number().int().nonnegative(),
  moldeaEvents: z.array(MoldeaEventSchema),
  moldeaLauncherMissReasons: z
    .array(
      z.strictObject({
        code: z.enum(['unrecognized-node-path', 'unrecognized-launcher-path']),
        count: z.number().int().positive(),
      }),
    )
    .max(2)
    .refine((reasons) => new Set(reasons.map(({ code }) => code)).size === reasons.length),
  moldeaOutputByteCount: z.number().int().nonnegative(),
  networkAccess: CommandPolicyObservationSchema,
  sensitiveAccess: CommandPolicyObservationSchema,
});
const UsageSchema = z
  .strictObject({
    cachedInputTokens: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  })
  .refine(
    (usage) =>
      usage.cachedInputTokens <= usage.inputTokens &&
      Number.isSafeInteger(usage.inputTokens + usage.outputTokens),
  )
  .nullable();
const ResourceEvidenceSchema = z.strictObject({
  commandCount: z.number().int().nonnegative(),
  maximumInvocationByteCount: z.number().int().nonnegative(),
  modelVisibleToolOutputByteCount: z.number().int().nonnegative(),
  operations: z.array(
    z.enum(['composition', 'content', 'inspect', 'scope', 'unrecognized', 'validate']),
  ),
  stdoutByteCount: z.number().int().nonnegative(),
});
const WorkspaceStateSchema = z.discriminatedUnion('type', [
  z.strictObject({
    content: z.string().nullable(),
    mode: z.number().int().nonnegative(),
    omission: z.enum(['file-too-large', 'non-utf8']).nullable(),
    sha256: Sha256Schema,
    type: z.literal('file'),
  }),
  z.strictObject({
    mode: z.number().int().nonnegative(),
    target: z.string(),
    type: z.literal('symlink'),
  }),
]);
const WorkspaceEntrySchema = z.strictObject({
  path: z.string().trim().min(1),
  state: WorkspaceStateSchema,
});
const OperationalFailureSchema = z.strictObject({
  category: z.enum(['execution-failed', 'proxy-unavailable', 'timed-out']),
  failedAt: z.iso.datetime(),
  isExhausted: z.boolean(),
  stage: z.enum(['actor', 'judge']),
});
const OperationalRetryStateSchema = z.strictObject({
  actorFailureCount: z.number().int().nonnegative(),
  judgeFailureCount: z.number().int().nonnegative(),
  lastFailure: OperationalFailureSchema.nullable(),
});
const WorkspaceChangesSchema = z.strictObject({
  created: z.array(WorkspaceEntrySchema),
  deleted: z.array(WorkspaceEntrySchema),
  modified: z.array(
    z.strictObject({
      after: WorkspaceStateSchema,
      before: WorkspaceStateSchema,
      path: z.string().trim().min(1),
    }),
  ),
});
const CycleSchema = z.strictObject({
  actorExecutionEvidence: z.array(z.unknown()),
  gitInvocationEvidence: GitInvocationEvidenceSchema,
  actorResourceEvidence: ResourceEvidenceSchema,
  commandPolicyEvidence: CommandPolicySchema,
  response: z.string().refine((text) => text.trim().length > 0),
  usage: UsageSchema,
  developerRequest: z.string().refine((text) => text.trim().length > 0),
  requestIndex: z.number().int().nonnegative(),
  isMountIntegrityPassing: z.boolean(),
  isRepositoryControlPassing: z.boolean(),
  workspaceChanges: WorkspaceChangesSchema,
});
const PaidInvocationSchema = z.strictObject({
  commandPolicyEvidence: CommandPolicySchema.optional(),
  stage: z.enum(['actor', 'judge']),
  usage: UsageSchema,
  cycle: CycleSchema.optional(),
});
const RecordedTrialSchema = z.strictObject({
  cycles: z.array(CycleSchema).min(1),
  paidInvocations: z.array(PaidInvocationSchema),
  actorExecutionEvidence: z.array(z.unknown()),
  gitInvocationEvidence: GitInvocationEvidenceSchema,
  actorResponse: z.string(),
  developerDirection: z.string().refine((text) => text.trim().length > 0),
  operationalRetries: OperationalRetryStateSchema,
  stageIdentities: z.strictObject({
    actorSha256: Sha256Schema,
    judgeSha256: Sha256Schema,
  }),
  trial: z.looseObject({
    cycles: z.array(CycleSchema).min(1),
    paidInvocations: z.array(PaidInvocationSchema),
    actorCommandPolicyEvidence: CommandPolicySchema,
    actorResourceEvidence: ResourceEvidenceSchema,
    actorHost: HostIdentitySchema.extend({ role: z.literal('actor') }),
    actorUsage: UsageSchema,
    confirmationEligible: z.boolean(),
    confirmationIndex: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]),
    dimensions: z.strictObject({
      commandPolicy: z.boolean(),
      mountIntegrity: z.boolean(),
      operational: z.boolean(),
      repositoryControl: z.boolean(),
      resource: z.boolean(),
      semantic: z.boolean(),
    }),
    evaluatedAt: z.iso.datetime(),
    executionOrigin: z.enum(['carried', 'executed', 'reused']),
    carriedFrom: z
      .strictObject({
        attemptId: z.string().min(1),
        artifactDigest: Sha256Schema.optional(),
        cliVersion: z.string().min(1).optional(),
        evidenceSha256: Sha256Schema,
        reassessment: z.string().trim().min(1).nullable(),
        recordedVerdict: z
          .strictObject({
            passed: z.boolean(),
            rationale: z.string(),
          })
          .optional(),
        version: z.string().min(1).optional(),
      })
      .optional(),
    failureClassifications: z.array(
      z.enum([
        'semantic',
        'resource',
        'commandPolicy',
        'repositoryControl',
        'mountIntegrity',
        'operational',
      ]),
    ),
    forbidden: z.array(z.string()),
    judgeCommandPolicyEvidence: CommandPolicySchema,
    judgeHost: HostIdentitySchema.extend({ role: z.literal('judge') }),
    judgeUsage: UsageSchema,
    kind: z.enum(['confirmation', 'initial']),
    observed: z.array(z.string()),
    passed: z.boolean(),
    rationale: z.string(),
    stageReuse: z.unknown().nullable(),
  }),
  workspaceChanges: WorkspaceChangesSchema,
});
const RecordedCaseSchema = z.strictObject({
  confirmationStatus: z.enum(['not-applicable', 'not-required', 'passed', 'rejected', 'required']),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  status: z.enum(['failed', 'passed', 'pending', 'recovered']),
  trials: z.array(RecordedTrialSchema).min(1).max(4),
});
const ActiveTrialActorEvidenceSchema = z.strictObject({
  cycles: z.array(CycleSchema).min(1),
  actorExecutionEvidence: z.array(z.unknown()),
  gitInvocationEvidence: GitInvocationEvidenceSchema,
  actorResourceEvidence: ResourceEvidenceSchema,
  actorStageIdentitySha256: Sha256Schema,
  commandPolicyEvidence: CommandPolicySchema,
  isMountIntegrityPassing: z.boolean(),
  isRepositoryControlPassing: z.boolean(),
  response: z.string(),
  usage: UsageSchema,
  workspaceChanges: WorkspaceChangesSchema,
});
const ActiveTrialSchema = z
  .strictObject({
    actorEvidence: ActiveTrialActorEvidenceSchema.nullable(),
    actorCycles: z.array(CycleSchema),
    paidInvocations: z.array(PaidInvocationSchema),
    confirmationIndex: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]),
    operationalRetries: OperationalRetryStateSchema,
    phase: z.enum(['actor-pending', 'judge-pending', 'trial-complete']),
    recordedTrial: RecordedTrialSchema.nullable(),
    startedAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((trial, context) => {
    const hasActorEvidence = trial.actorEvidence !== null;
    const hasRecordedTrial = trial.recordedTrial !== null;
    if (
      trial.actorEvidence !== null &&
      serializeSemanticStageValue(trial.actorCycles) !==
        serializeSemanticStageValue(trial.actorEvidence.cycles)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic active cycle evidence does not match the completed actor session.',
      });
    }
    if (
      (trial.phase === 'actor-pending' && (hasActorEvidence || hasRecordedTrial)) ||
      (trial.phase === 'judge-pending' && (!hasActorEvidence || hasRecordedTrial)) ||
      (trial.phase === 'trial-complete' && (!hasActorEvidence || !hasRecordedTrial))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic active-trial evidence does not match its phase.',
      });
    }
    const lastFailure = trial.operationalRetries.lastFailure;
    if (lastFailure !== null && trial.operationalRetries[`${lastFailure.stage}FailureCount`] < 1) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic active-trial failure metadata has no matching failure count.',
      });
    }
    if (lastFailure?.isExhausted === true && trial.phase !== `${lastFailure.stage}-pending`) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic stopped stage does not match the active-trial phase.',
      });
    }
  });
const CaseCheckpointSchema = z
  .strictObject({
    activeTrial: ActiveTrialSchema.nullable(),
    caseDefinitionDigest: Sha256Schema,
    caseId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    completedCase: RecordedCaseSchema.nullable(),
    trials: z.array(RecordedTrialSchema).max(4),
  })
  .superRefine((caseCheckpoint, context) => {
    if (
      caseCheckpoint.completedCase !== null &&
      (caseCheckpoint.activeTrial !== null ||
        caseCheckpoint.completedCase.id !== caseCheckpoint.caseId ||
        JSON.stringify(caseCheckpoint.completedCase.trials) !==
          JSON.stringify(caseCheckpoint.trials))
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic completed case does not match its private case checkpoint.',
      });
    }
    const confirmationIndex = caseCheckpoint.activeTrial?.confirmationIndex;
    const expectedTrialCount = confirmationIndex === null ? 0 : confirmationIndex;
    if (
      caseCheckpoint.activeTrial !== null &&
      caseCheckpoint.trials.length !== expectedTrialCount
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic active trial does not follow the recorded trial prefix.',
      });
    }
  });
const CliIdentitySchema = z.strictObject({
  integrity: z.string().trim().min(1),
  jsonSchemaVersion: z.number().int().positive(),
  name: z.literal('@moldea.ai/cli'),
  packageLockSha256: Sha256Schema,
  version: z.string().trim().min(1),
});

const hasValidActorSummary = (
  evidence: Pick<
    ISemanticActiveTrialActorEvidence,
    | 'cycles'
    | 'actorExecutionEvidence'
    | 'actorResourceEvidence'
    | 'commandPolicyEvidence'
    | 'gitInvocationEvidence'
    | 'response'
    | 'usage'
  >,
  options: ISemanticActorExecutionEvidenceOptions,
): boolean => {
  if (!hasValidSemanticCycles(evidence.cycles, options)) return false;
  const summary = summarizeSemanticCycles(evidence.cycles);
  return (Object.keys(summary) as Array<keyof typeof summary>).every(
    (key) =>
      serializeSemanticStageValue(summary[key]) === serializeSemanticStageValue(evidence[key]),
  );
};

const hasValidPaidCycles = (
  invocations: ISemanticRecordedTrial['paidInvocations'],
  options: ISemanticActorExecutionEvidenceOptions,
): boolean =>
  invocations.every(
    ({ stage, usage, cycle, commandPolicyEvidence }) =>
      (commandPolicyEvidence === undefined ||
        hasValidCodexEvaluationCommandPolicy(commandPolicyEvidence)) &&
      (cycle === undefined ||
        (stage === 'actor' &&
          serializeSemanticStageValue(usage) === serializeSemanticStageValue(cycle.usage) &&
          hasValidSemanticCycles([{ ...cycle, requestIndex: 0 }], options))),
  );

const hasValidRecordedTrial = (
  recorded: ISemanticRecordedTrial,
  options: ISemanticActorExecutionEvidenceOptions,
): boolean =>
  hasValidPaidCycles(recorded.paidInvocations, options) &&
  hasValidActorSummary(
    {
      cycles: recorded.cycles,
      actorExecutionEvidence: recorded.actorExecutionEvidence,
      actorResourceEvidence: recorded.trial.actorResourceEvidence,
      commandPolicyEvidence: recorded.trial.actorCommandPolicyEvidence,
      gitInvocationEvidence: recorded.gitInvocationEvidence,
      response: recorded.actorResponse,
      usage: recorded.trial.actorUsage,
    },
    options,
  ) &&
  serializeSemanticStageValue(recorded.cycles) ===
    serializeSemanticStageValue(recorded.trial.cycles) &&
  serializeSemanticStageValue(recorded.paidInvocations) ===
    serializeSemanticStageValue(recorded.trial.paidInvocations) &&
  recorded.paidInvocations.filter(({ stage }) => stage === 'actor').length >=
    recorded.cycles.length &&
  recorded.paidInvocations.some(({ stage }) => stage === 'judge');

const CandidateCheckpointSchema = z
  .strictObject({
    actorHost: HostIdentitySchema.extend({ role: z.literal('actor') }),
    artifactDigest: Sha256Schema,
    attemptId: z.string().min(1),
    caseCheckpoints: z.record(z.string(), CaseCheckpointSchema),
    caseSuiteDigest: Sha256Schema,
    cases: z.array(RecordedCaseSchema),
    cli: CliIdentitySchema,
    coverageDigest: Sha256Schema,
    createdAt: z.iso.datetime(),
    judgeHost: HostIdentitySchema.extend({ role: z.literal('judge') }),
    mode: z.enum(['diagnostic', 'official']),
    schemaVersion: z.literal(3),
    selectedCaseIds: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)).min(1),
    updatedAt: z.iso.datetime(),
  })
  .superRefine((checkpoint, context) => {
    if (new Set(checkpoint.selectedCaseIds).size !== checkpoint.selectedCaseIds.length) {
      context.addIssue({ code: 'custom', message: 'Selected semantic case ids must be unique.' });
    }
    if (checkpoint.cases.length > checkpoint.selectedCaseIds.length) {
      context.addIssue({ code: 'custom', message: 'Semantic checkpoint has too many cases.' });
      return;
    }
    checkpoint.cases.forEach((recordedCase, index) => {
      if (recordedCase.id !== checkpoint.selectedCaseIds[index]) {
        context.addIssue({
          code: 'custom',
          message: 'Semantic checkpoint cases must be an ordered selected-case prefix.',
          path: ['cases', index, 'id'],
        });
      }
    });
    const committedCaseIds = new Set(checkpoint.cases.map(({ id }) => id));
    for (const [caseId, caseCheckpoint] of Object.entries(checkpoint.caseCheckpoints)) {
      if (
        caseCheckpoint.caseId !== caseId ||
        !checkpoint.selectedCaseIds.includes(caseId) ||
        committedCaseIds.has(caseId)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Semantic private case checkpoint does not match the remaining selection.',
          path: ['caseCheckpoints', caseId],
        });
      }
    }
    const actorEvidenceOptions = {
      cliVersion: checkpoint.cli.version,
      jsonSchemaVersion: checkpoint.cli.jsonSchemaVersion,
    };
    const recordedTrials = [
      ...checkpoint.cases.flatMap(({ trials }) => trials),
      ...Object.values(checkpoint.caseCheckpoints).flatMap(({ activeTrial, trials }) => [
        ...trials,
        ...(activeTrial?.recordedTrial === null || activeTrial?.recordedTrial === undefined
          ? []
          : [activeTrial.recordedTrial]),
      ]),
    ];
    const activeActorEvidence = Object.values(checkpoint.caseCheckpoints)
      .map(({ activeTrial }) => activeTrial?.actorEvidence)
      .filter((evidence) => evidence !== null && evidence !== undefined);
    if (
      Object.values(checkpoint.caseCheckpoints).some(
        ({ activeTrial }) =>
          activeTrial !== null &&
          !hasValidPaidCycles(
            activeTrial.paidInvocations as ISemanticRecordedTrial['paidInvocations'],
            actorEvidenceOptions,
          ),
      ) ||
      recordedTrials.some(
        (trial) =>
          !hasValidRecordedTrial(trial as unknown as ISemanticRecordedTrial, actorEvidenceOptions),
      ) ||
      Object.values(checkpoint.caseCheckpoints).some(
        ({ activeTrial }) =>
          activeTrial !== null &&
          activeTrial.actorCycles.length > 0 &&
          !hasValidSemanticCycles(
            activeTrial.actorCycles as ISemanticCycleEvidence[],
            actorEvidenceOptions,
          ),
      ) ||
      activeActorEvidence.some(
        (evidence) =>
          !hasValidActorSummary(
            evidence as unknown as ISemanticActiveTrialActorEvidence,
            actorEvidenceOptions,
          ),
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Semantic checkpoint contains invalid actor execution evidence.',
      });
    }
  });

/** Validates completed semantic cases loaded from private local run evidence. */
export const parseSemanticRecordedCases = (
  input: unknown,
  actorEvidenceOptions: ISemanticActorExecutionEvidenceOptions,
): ISemanticCandidateCheckpoint['cases'] => {
  const recordedCases = z.array(RecordedCaseSchema).parse(input);
  if (
    recordedCases.some(({ trials }) =>
      trials.some(
        (trial) =>
          !hasValidRecordedTrial(trial as unknown as ISemanticRecordedTrial, actorEvidenceOptions),
      ),
    )
  ) {
    throw new Error('Semantic local run contains invalid actor execution evidence.');
  }
  return recordedCases as unknown as ISemanticCandidateCheckpoint['cases'];
};

/** Returns the ignored semantic checkpoint path. */
export const getSemanticCheckpointPath = (repositoryRoot: string): string =>
  path.join(repositoryRoot, '.evidence', 'semantic', 'checkpoint.json');

/** Writes one durable semantic candidate boundary atomically. */
export const writeSemanticCheckpoint = async (
  repositoryRoot: string,
  checkpoint: ISemanticCandidateCheckpoint,
): Promise<void> => {
  CandidateCheckpointSchema.parse(checkpoint);
  await writeJsonFileAtomically(getSemanticCheckpointPath(repositoryRoot), checkpoint);
};

/**
 * Archives a completed diagnostic while leaving active-checkpoint cleanup to its caller.
 * @returns The private archive path; these records are never official reusable evidence.
 * @throws
 * - Semantic diagnostic attempt identity is not a safe archive component.
 * - Semantic diagnostic archive requires a complete terminal selection.
 */
export const archiveSemanticDiagnosticCheckpoint = async (
  repositoryRoot: string,
  checkpoint: ISemanticCandidateCheckpoint,
): Promise<string> => {
  CandidateCheckpointSchema.parse(checkpoint);
  if (
    !/^sem-[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(checkpoint.attemptId) ||
    checkpoint.attemptId.length > 64
  )
    throw new Error('Semantic diagnostic attempt identity is not a safe archive component.');
  if (
    checkpoint.mode !== 'diagnostic' ||
    checkpoint.cases.length !== checkpoint.selectedCaseIds.length ||
    Object.keys(checkpoint.caseCheckpoints).length !== 0 ||
    checkpoint.cases.some(({ status, trials }) => status === 'pending' || trials.length === 0)
  )
    throw new Error('Semantic diagnostic archive requires a complete terminal selection.');
  const archivePath = resolveContainedPath(
    repositoryRoot,
    path.join('.evidence', 'semantic', 'diagnostics', checkpoint.attemptId, 'checkpoint.json'),
  );
  await writeJsonFileAtomically(archivePath, checkpoint);
  return archivePath;
};

/** Reads one semantic checkpoint whose detailed cases are validated during resume. */
export const readSemanticCheckpoint = async (
  repositoryRoot: string,
): Promise<ISemanticCandidateCheckpoint> =>
  (await readJsonFile(
    getSemanticCheckpointPath(repositoryRoot),
    CandidateCheckpointSchema,
  )) as unknown as ISemanticCandidateCheckpoint;
