import { z } from 'zod';

import type { ISemanticEvaluationWebsiteModel } from './types.ts';

const StatusSchema = z.enum(['failed', 'passed', 'pending', 'recovered']);
const ReplaySchema = z
  .looseObject({
    trials: z.array(
      z.looseObject({
        confirmationIndex: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]),
        evaluatedAt: z.iso.datetime(),
        id: z.string(),
        kind: z.enum(['confirmation', 'initial']),
        steps: z.array(z.looseObject({ kind: z.string() })),
        title: z.string(),
      }),
    ),
  })
  .nullable();
const HostUsageSchema = z
  .strictObject({
    cachedInputTokens: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
  })
  .nullable();
const TrialSchema = z.looseObject({
  actorUsage: HostUsageSchema,
  confirmationIndex: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]),
  dimensions: z.looseObject({
    commandPolicy: z.boolean(),
    mountIntegrity: z.boolean(),
    operational: z.boolean(),
    repositoryControl: z.boolean(),
    resource: z.boolean(),
    semantic: z.boolean(),
  }),
  evaluatedAt: z.iso.datetime(),
  forbidden: z.array(z.string()),
  kind: z.enum(['confirmation', 'initial']),
  judgeUsage: HostUsageSchema,
  observed: z.array(z.string()),
  passed: z.boolean(),
  rationale: z.string(),
});
const CaseSchema = z.looseObject({
  id: z.string().min(1),
  replay: ReplaySchema,
  status: StatusSchema,
  summary: z.string(),
  title: z.string(),
  trials: z.array(TrialSchema),
});
const ResultSchema = z.looseObject({
  artifactDigest: z.string(),
  attemptId: z.string().min(1),
  createdAt: z.iso.datetime(),
  failedCaseCount: z.number().int().nonnegative(),
  passedCaseCount: z.number().int().nonnegative(),
  pendingCaseCount: z.number().int().nonnegative(),
  recoveredCaseCount: z.number().int().nonnegative(),
  status: z.enum(['failed', 'incomplete', 'passed']),
  totalCaseCount: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
});
const AttemptSchema = z.looseObject({
  cases: z.array(CaseSchema),
  evidenceSource: z.strictObject({ kind: z.literal('recorded') }),
  rawAttemptUrl: z.string(),
  rawEvidenceUrl: z.string(),
  result: ResultSchema,
  route: z.string(),
});
const SemanticWebsiteModelSchema = z
  .looseObject({
    artifactDigest: z.string().nullable(),
    attempts: z.array(AttemptSchema),
    caseCount: z.number().int().nonnegative(),
    caseSuiteDigest: z.string(),
    cli: z
      .looseObject({
        integrity: z.string(),
        jsonSchemaVersion: z.number().int().positive(),
        name: z.literal('@moldea.ai/cli'),
        packageLockSha256: z.string(),
        version: z.string(),
      })
      .nullable(),
    coverageDigest: z.string(),
    coverageUrl: z.string().nullable(),
    currentAssurance: AttemptSchema.nullable(),
    evidenceMatch: z.literal('exact').nullable(),
    evaluatedAt: z.iso.datetime().nullable(),
    evaluationModel: z.string().nullable(),
    failedCaseCount: z.number().int().nonnegative(),
    groups: z.array(
      z.looseObject({
        cases: z.array(CaseSchema),
        description: z.string(),
        id: z.string(),
        title: z.string(),
      }),
    ),
    hasAttempt: z.boolean(),
    lastPassing: AttemptSchema.nullable(),
    latest: AttemptSchema.nullable(),
    latestPointer: z.looseObject({ latestAttemptId: z.string() }).nullable(),
    methodologyUrl: z.string(),
    passedCaseCount: z.number().int().nonnegative(),
    pendingCaseCount: z.number().int().nonnegative(),
    recoveredCaseCount: z.number().int().nonnegative(),
    route: z.string(),
    status: z.enum(['failed', 'incomplete', 'not-recorded', 'passed']),
  })
  .superRefine((model, context) => {
    if (model.hasAttempt) {
      if (
        model.attempts.length === 0 ||
        model.artifactDigest === null ||
        model.cli === null ||
        model.coverageUrl === null ||
        model.evaluationModel === null
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Recorded semantic evidence requires attempt metadata.',
        });
      }
      return;
    }

    if (
      model.status !== 'not-recorded' ||
      model.attempts.length !== 0 ||
      model.artifactDigest !== null ||
      model.cli !== null ||
      model.coverageUrl !== null ||
      model.currentAssurance !== null ||
      model.evidenceMatch !== null ||
      model.evaluatedAt !== null ||
      model.evaluationModel !== null ||
      model.failedCaseCount !== 0 ||
      model.lastPassing !== null ||
      model.latest !== null ||
      model.latestPointer !== null ||
      model.passedCaseCount !== 0 ||
      model.recoveredCaseCount !== 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Unrecorded semantic evidence cannot contain result metadata.',
      });
    }
  });

/** Validates the public semantic presentation model at an evidence boundary. */
export const parseSemanticWebsiteModel = (input: unknown): ISemanticEvaluationWebsiteModel =>
  SemanticWebsiteModelSchema.parse(input) as unknown as ISemanticEvaluationWebsiteModel;
