import { z } from 'zod';

import {
  hasValidActorExecutionEvidence,
  type ISemanticActorExecutionEvidenceOptions,
} from '../../../../tooling/semantic-evaluation/index.mjs';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const StableIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const AttemptStatusSchema = z.enum(['failed', 'incomplete', 'passed']);

// website read models select the current evidence fields rendered by public pages
const SemanticHostSchema = z.object({
  model: z.literal('gpt-5.6-sol'),
  name: z.literal('codex'),
  reasoningEffort: z.literal('medium'),
  version: z.string().trim().min(1),
});
const SemanticHostContractSchema = SemanticHostSchema.omit({ version: true });
const SemanticActorCommandPolicyEvidenceSchema = z
  .object({
    completedCommandCount: z.number().int().nonnegative(),
    indeterminateCommandCount: z.number().int().nonnegative(),
    packageManagerExecution: z.enum(['indeterminate', 'not-observed', 'observed']),
    packageManagerInvocationCount: z.number().int().nonnegative(),
  })
  .superRefine((evidence, context) => {
    const expectedStatus =
      evidence.packageManagerInvocationCount > 0
        ? 'observed'
        : evidence.indeterminateCommandCount > 0
          ? 'indeterminate'
          : 'not-observed';
    if (
      evidence.indeterminateCommandCount + evidence.packageManagerInvocationCount >
        evidence.completedCommandCount ||
      evidence.packageManagerExecution !== expectedStatus
    ) {
      context.addIssue({ code: 'custom', message: 'Invalid command-policy aggregate.' });
    }
  });

export const SemanticCliIdentitySchema = z.object({
  integrity: z.string().startsWith('sha512-'),
  jsonSchemaVersion: z.number().int().positive(),
  name: z.literal('@moldea.ai/cli'),
  packageLockSha256: Sha256Schema,
  version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u),
});

const SemanticAttemptTrialSchema = z.object({
  actorCommandPolicyEvidence: SemanticActorCommandPolicyEvidenceSchema,
  actorHost: SemanticHostSchema,
  confirmationIndex: z.union([z.literal(1), z.literal(2)]).nullable(),
  evaluatedAt: z.iso.datetime(),
  forbidden: z.array(StableIdSchema),
  judgeHost: SemanticHostSchema,
  kind: z.enum(['confirmation', 'initial']),
  observed: z.array(StableIdSchema),
  passed: z.boolean(),
  rationale: z.string().trim().min(1),
});

const SemanticAttemptEvidenceReferenceBaseSchema = z.object({
  kind: z.literal('candidate'),
  path: z.literal('evidence.json'),
  sha256: Sha256Schema,
});
const SemanticAttemptEvidenceReferenceSchema = SemanticAttemptEvidenceReferenceBaseSchema.extend({
  evaluationProtocolVersion: z.literal(21),
  schemaVersion: z.literal(6),
});

const SemanticReplayOutputFactSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('focused-runtime-test'),
    path: z.literal('/src/support-agent.test-integration.js'),
    status: z.enum(['failed', 'passed']),
  }),
  z.object({
    cliVersion: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u),
    command: z.enum(['composition', 'inspect', 'validate']),
    errorPresent: z.boolean(),
    kind: z.literal('moldea-cli-envelope'),
    resultPresent: z.boolean(),
    schemaVersion: z.number().int().positive(),
    status: z.enum(['error', 'invalid', 'valid']),
  }),
  z.object({
    kind: z.literal('workspace-paths'),
    paths: z.array(z.string().trim().min(1)).min(1),
  }),
  z.object({
    binaries: z.tuple([z.literal('moldea')]),
    kind: z.literal('yarn-package-info'),
    packageName: z.literal('@moldea.ai/cli'),
    version: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u),
  }),
  z.object({
    binaryName: z.literal('moldea'),
    kind: z.literal('yarn-binary-provider'),
    source: z.literal('conflicting-moldea-provider'),
  }),
]);
const SemanticReplayCommandSchema = z.object({
  eventType: z.literal('item.completed'),
  item: z.object({
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
  actorCommandPolicyEvidence: SemanticActorCommandPolicyEvidenceSchema,
  actorExecutionEvidence: z.array(SemanticReplayCommandSchema).max(128),
  actorHost: SemanticHostSchema,
  actorResponse: z.string(),
  caseDefinitionDigest: Sha256Schema,
  caseId: StableIdSchema,
  evaluatedAt: z.iso.datetime(),
  forbidden: z.array(StableIdSchema),
  id: StableIdSchema,
  judgeHost: SemanticHostSchema,
  observed: z.array(StableIdSchema),
  passed: z.boolean(),
  rationale: z.string().trim().min(1),
  workspaceChanges: SemanticReplayWorkspaceChangesSchema,
};
const SemanticReplayInitialTrialSchema = z
  .object({
    ...SemanticReplayTrialShape,
    scenarioEvidence: SemanticReplayDeveloperDirectionSchema,
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
  .transform(({ scenarioEvidence: developerDirection, ...trial }) => ({
    ...trial,
    developerDirection,
  }));

// public-safe projection selected from one digest-verified protocol-21 evidence artifact
export const SemanticReplayCandidateSchema = z.object({
  confirmations: z.array(SemanticReplayConfirmationTrialSchema),
  evaluationProtocolVersion: z.literal(21),
  results: z.array(SemanticReplayInitialTrialSchema),
  schemaVersion: z.literal(6),
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

export const SemanticAttemptRecordSchema = z.object({
  artifactDigest: Sha256Schema,
  attemptId: z.string().trim().min(1),
  caseSuiteDigest: Sha256Schema,
  cases: z.array(
    z.object({
      confirmationStatus: z.enum(['not-required', 'passed', 'rejected', 'required']),
      id: StableIdSchema,
      status: z.enum(['failed', 'passed', 'recovered']),
      trials: z.array(SemanticAttemptTrialSchema).min(1),
    }),
  ),
  cli: SemanticCliIdentitySchema,
  coverageDigest: Sha256Schema,
  createdAt: z.iso.datetime(),
  evidence: SemanticAttemptEvidenceReferenceSchema,
  failedCaseCount: z.number().int().nonnegative(),
  hostContract: SemanticHostContractSchema,
  passedCaseCount: z.number().int().nonnegative(),
  pendingCaseCount: z.number().int().nonnegative(),
  recordedAt: z.iso.datetime(),
  recoveredCaseCount: z.number().int().nonnegative(),
  schemaVersion: z.literal(4),
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
