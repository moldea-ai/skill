import { z } from 'zod';

import { QualificationExecutionEnvironmentSchema } from '../contracts/index.ts';
import {
  QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION,
  QUALIFICATION_PROFILE_BATCH_SUMMARY_MAXIMUM_BYTE_COUNT,
} from './constants.ts';

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const StableIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const BatchIdSchema = z.string().regex(/^b-[a-f0-9]{32}$/u);
const TargetIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/u);

// exact ordered adapter-profile selection used by one batch
export const QualificationProfileBatchSelectorSchema = z.strictObject({
  kind: z.enum(['all', 'targets', 'unresolved-from']),
  value: z.string().trim().min(1).nullable(),
  targetIds: z.array(TargetIdSchema).min(1),
});

export type IQualificationProfileBatchSelector = z.infer<
  typeof QualificationProfileBatchSelectorSchema
>;

// compact terminal summary for one isolated adapter attempt
export const QualificationProfileBatchRecordSchema = z
  .strictObject({
    schemaVersion: z.literal(QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION),
    attemptId: z.string().trim().min(1),
    adapterId: StableIdSchema,
    implementationId: StableIdSchema,
    status: z.enum(['failed', 'passed']),
    summary: z.string().trim().min(1),
    caseCount: z.number().int().nonnegative(),
    failedCaseCount: z.number().int().nonnegative(),
    recoveredCaseCount: z.number().int().nonnegative(),
    modelCallCount: z.number().int().nonnegative(),
    modelTokenCount: z.number().int().nonnegative(),
    candidateTokensConsumed: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
  })
  .superRefine((record, context) => {
    if (
      Buffer.byteLength(record.summary, 'utf8') >
      QUALIFICATION_PROFILE_BATCH_SUMMARY_MAXIMUM_BYTE_COUNT
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Profile-batch summary exceeds its UTF-8 byte limit.',
        path: ['summary'],
      });
    }
    if (record.failedCaseCount + record.recoveredCaseCount > record.caseCount) {
      context.addIssue({
        code: 'custom',
        message: 'Profile-batch case counts contradict the total case count.',
        path: ['caseCount'],
      });
    }
  });

export type IQualificationProfileBatchRecord = z.infer<
  typeof QualificationProfileBatchRecordSchema
>;

// ordered completed-target ledger retained for unresolved selectors
export const QualificationProfileBatchLedgerSchema = z.strictObject({
  schemaVersion: z.literal(QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION),
  batchId: BatchIdSchema,
  identitySha256: Sha256Schema,
  selector: QualificationProfileBatchSelectorSchema,
  isDryRun: z.boolean(),
  records: z.array(QualificationProfileBatchRecordSchema),
  candidateTokensConsumed: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IQualificationProfileBatchLedger = z.infer<
  typeof QualificationProfileBatchLedgerSchema
>;

// private orchestration state mapping every selected target to one isolated attempt
export const QualificationProfileBatchCheckpointSchema = z.strictObject({
  schemaVersion: z.literal(QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION),
  batchId: BatchIdSchema,
  identitySha256: Sha256Schema,
  selector: QualificationProfileBatchSelectorSchema,
  packagesRepository: z.string().trim().min(1),
  skillRepository: z.string().trim().min(1),
  isDryRun: z.boolean(),
  reuseEvidence: z.boolean(),
  profileIndexDigest: Sha256Schema,
  qualificationDigest: Sha256Schema,
  skillDigest: Sha256Schema,
  packagesRepositoryCommit: z.string().trim().min(1),
  packagesRepositoryFingerprint: Sha256Schema,
  executionEnvironment: QualificationExecutionEnvironmentSchema,
  attemptIds: z.record(TargetIdSchema, z.string().trim().min(1)),
  stop: z
    .strictObject({
      kind: z.enum([
        'candidate-token-limit',
        'execution-error',
        'operational-recovery-exhausted',
        'temporary-storage-limit',
      ]),
      targetId: TargetIdSchema,
      attemptId: z.string().trim().min(1),
      stoppedAt: z.string().datetime(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type IQualificationProfileBatchCheckpoint = z.infer<
  typeof QualificationProfileBatchCheckpointSchema
>;

// unexpanded profile selector received from the strict CLI parser
export type IQualificationProfileBatchSelectorInput = {
  kind: 'all' | 'targets' | 'unresolved-from';
  value: string | null;
};

// compact CLI-safe result for one adapter-profile batch
export type IQualificationProfileBatchOutcome = {
  status: 'completed' | 'incomplete';
  batchId: string;
  identitySha256: string;
  selector: IQualificationProfileBatchSelector;
  isDryRun: boolean;
  candidateTokensConsumed: number;
  activeAttemptIds: string[];
  records: IQualificationProfileBatchRecord[];
};
