import { z } from 'zod';

import { QUALIFICATION_CANDIDATE_TOKEN_LIMIT } from '../constants/index.ts';
import {
  QualificationExecutionEnvironmentSchema,
  QualificationSelectionSchema,
} from '../contracts/index.ts';
import {
  QUALIFICATION_DIAGNOSTIC_EXPLANATION_MAXIMUM_BYTE_COUNT,
  QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION,
} from './constants.ts';

const StableIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

// exact ordered case selection used by one diagnostic batch
export const QualificationDiagnosticSelectorSchema = z.strictObject({
  kind: z.enum(['all', 'cases', 'claims', 'unresolved-from']),
  value: z.string().trim().min(1).nullable(),
  caseIds: z.array(StableIdSchema).min(1),
});

export type IQualificationDiagnosticSelector = z.infer<
  typeof QualificationDiagnosticSelectorSchema
>;

// content-free terminal summary for one diagnostic case
export const QualificationDiagnosticRecordSchema = z
  .strictObject({
    schemaVersion: z.literal(QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION),
    attemptId: z.string().trim().min(1),
    caseId: StableIdSchema,
    verdict: z.enum(['failed', 'passed']),
    explanation: z.string().trim().min(1),
    failedRequirementIds: z.array(StableIdSchema),
    unevaluatedRequirementIds: z.array(StableIdSchema),
    durationMs: z.number().int().nonnegative(),
    modelCallCount: z.number().int().nonnegative(),
    modelTokenCount: z.number().int().nonnegative(),
    operationalFailureCount: z.number().int().nonnegative(),
    candidateTokensConsumed: z.number().int().min(0).max(QUALIFICATION_CANDIDATE_TOKEN_LIMIT),
  })
  .superRefine((record, context) => {
    if (
      Buffer.byteLength(record.explanation, 'utf8') >
      QUALIFICATION_DIAGNOSTIC_EXPLANATION_MAXIMUM_BYTE_COUNT
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Diagnostic explanation exceeds its UTF-8 byte limit.',
        path: ['explanation'],
      });
    }
  });

export type IQualificationDiagnosticRecord = z.infer<typeof QualificationDiagnosticRecordSchema>;

// separate content-free completed-case ledger
export const QualificationDiagnosticLedgerSchema = z.strictObject({
  schemaVersion: z.literal(QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION),
  identitySha256: Sha256Schema,
  selection: QualificationSelectionSchema,
  selector: QualificationDiagnosticSelectorSchema,
  candidateTokensConsumed: z.number().int().min(0).max(QUALIFICATION_CANDIDATE_TOKEN_LIMIT),
  records: z.array(QualificationDiagnosticRecordSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IQualificationDiagnosticLedger = z.infer<typeof QualificationDiagnosticLedgerSchema>;

// private content-free orchestration state that points to at most one active attempt
export const QualificationDiagnosticCheckpointSchema = z.strictObject({
  schemaVersion: z.literal(QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION),
  identitySha256: Sha256Schema,
  selection: QualificationSelectionSchema,
  selector: QualificationDiagnosticSelectorSchema,
  packagesRepository: z.string().trim().min(1),
  skillRepository: z.string().trim().min(1),
  profileDigest: Sha256Schema,
  qualificationDigest: Sha256Schema,
  skillDigest: Sha256Schema,
  packagesRepositoryCommit: z.string().trim().min(1),
  packagesRepositoryFingerprint: Sha256Schema,
  targetDigest: Sha256Schema,
  executionEnvironment: QualificationExecutionEnvironmentSchema,
  nextCaseIndex: z.number().int().nonnegative(),
  activeAttemptId: z.string().trim().min(1).nullable(),
  candidateTokensConsumed: z.number().int().min(0).max(QUALIFICATION_CANDIDATE_TOKEN_LIMIT),
  stop: z
    .strictObject({
      kind: z.enum(['candidate-token-limit', 'execution-error', 'operational-recovery-exhausted']),
      caseId: StableIdSchema,
      attemptId: z.string().trim().min(1),
      stoppedAt: z.string().datetime(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IQualificationDiagnosticCheckpoint = z.infer<
  typeof QualificationDiagnosticCheckpointSchema
>;

// unexpanded selector received from the strict CLI parser
export type IQualificationDiagnosticSelectorInput = {
  kind: 'all' | 'cases' | 'claims' | 'unresolved-from';
  value: string | null;
};

// compact CLI-safe result for one current diagnostic batch
export type IQualificationDiagnosticBatchOutcome = {
  status: 'completed' | 'incomplete';
  identitySha256: string;
  selection: z.infer<typeof QualificationSelectionSchema>;
  selector: IQualificationDiagnosticSelector;
  candidateTokenLimit: number;
  candidateTokensConsumed: number;
  activeAttemptId: string | null;
  records: IQualificationDiagnosticRecord[];
};
