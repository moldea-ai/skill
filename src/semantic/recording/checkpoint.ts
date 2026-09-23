import path from 'node:path';

import { z } from 'zod';

import { readJsonFile, writeJsonFileAtomically } from '../../filesystem/index.ts';
import {
  hasValidActorExecutionEvidence,
  type ISemanticActorExecutionEvidenceOptions,
} from '../execution/index.ts';
import type { ISemanticCandidateCheckpoint } from './types.ts';

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
const CommandPolicySchema = z.strictObject({
  completedCommandCount: z.number().int().nonnegative(),
  credentialExposure: z.strictObject({
    observedCount: z.number().int().nonnegative(),
    reasons: z.array(CommandPolicyReasonSchema),
    status: z.enum(['not-observed', 'observed']),
  }),
  maximumCommandOutputByteCount: z.number().int().nonnegative(),
  modelVisibleToolOutputByteCount: z.number().int().nonnegative(),
  moldeaCommandCount: z.number().int().nonnegative(),
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
const RecordedTrialSchema = z.strictObject({
  actorExecutionEvidence: z.array(z.unknown()),
  actorResponse: z.string(),
  developerDirection: z.string().trim().min(1),
  operationalRetries: OperationalRetryStateSchema,
  stageIdentities: z.strictObject({
    actorSha256: Sha256Schema,
    judgeSha256: Sha256Schema,
  }),
  trial: z.looseObject({
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
    executionOrigin: z.enum(['executed', 'reused']),
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
  workspaceChanges: z.strictObject({
    created: z.array(WorkspaceEntrySchema),
    deleted: z.array(WorkspaceEntrySchema),
    modified: z.array(
      z.strictObject({
        after: WorkspaceStateSchema,
        before: WorkspaceStateSchema,
        path: z.string().trim().min(1),
      }),
    ),
  }),
});
const RecordedCaseSchema = z.strictObject({
  confirmationStatus: z.enum(['not-applicable', 'not-required', 'passed', 'rejected', 'required']),
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  status: z.enum(['failed', 'passed', 'pending', 'recovered']),
  trials: z.array(RecordedTrialSchema).min(1).max(4),
});
const ActiveTrialActorEvidenceSchema = z.strictObject({
  actorExecutionEvidence: z.array(z.unknown()),
  actorResourceEvidence: ResourceEvidenceSchema,
  actorStageIdentitySha256: Sha256Schema,
  commandPolicyEvidence: CommandPolicySchema,
  isMountIntegrityPassing: z.boolean(),
  isRepositoryControlPassing: z.boolean(),
  response: z.string(),
  usage: UsageSchema,
  workspaceChanges: z.strictObject({
    created: z.array(WorkspaceEntrySchema),
    deleted: z.array(WorkspaceEntrySchema),
    modified: z.array(
      z.strictObject({
        after: WorkspaceStateSchema,
        before: WorkspaceStateSchema,
        path: z.string().trim().min(1),
      }),
    ),
  }),
});
const ActiveTrialSchema = z
  .strictObject({
    actorEvidence: ActiveTrialActorEvidenceSchema.nullable(),
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
    schemaVersion: z.literal(2),
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
      recordedTrials.some(
        ({ actorExecutionEvidence }) =>
          !hasValidActorExecutionEvidence(actorExecutionEvidence, actorEvidenceOptions),
      ) ||
      activeActorEvidence.some(
        ({ actorExecutionEvidence }) =>
          !hasValidActorExecutionEvidence(actorExecutionEvidence, actorEvidenceOptions),
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
        ({ actorExecutionEvidence }) =>
          !hasValidActorExecutionEvidence(actorExecutionEvidence, actorEvidenceOptions),
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

/** Reads one semantic checkpoint whose detailed cases are validated during resume. */
export const readSemanticCheckpoint = async (
  repositoryRoot: string,
): Promise<ISemanticCandidateCheckpoint> =>
  (await readJsonFile(
    getSemanticCheckpointPath(repositoryRoot),
    CandidateCheckpointSchema,
  )) as unknown as ISemanticCandidateCheckpoint;
