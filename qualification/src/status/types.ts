import { z } from 'zod';

import { QUALIFICATION_EVIDENCE_PROTOCOL_VERSION } from '../constants/index.ts';
import {
  QualificationAttemptStatusSchema,
  type IQualificationRecordedLatestResult,
} from '../contracts/index.ts';

// stable status-page scope selected by the operator
export const QualificationStatusScopeSchema = z.enum(['actionable', 'all']);

export type IQualificationStatusScope = z.infer<typeof QualificationStatusScopeSchema>;

// opaque continuation payload validated after base64url decoding
export const QualificationStatusCursorPayloadSchema = z.strictObject({
  formatVersion: z.literal(1),
  offset: z.number().int().positive(),
  scope: QualificationStatusScopeSchema,
  snapshot: z.string().regex(/^[a-f0-9]{64}$/u),
});

export type IQualificationStatusCursorPayload = z.infer<
  typeof QualificationStatusCursorPayloadSchema
>;

// content-free projection of one readable local attempt
export const QualificationStatusAttemptSchema = z.strictObject({
  kind: z.literal('attempt'),
  protocolVersion: z.literal(QUALIFICATION_EVIDENCE_PROTOCOL_VERSION),
  attemptId: z.string().trim().min(1).max(255),
  adapterId: z.string().trim().min(1).max(64),
  implementationId: z.string().trim().min(1).max(64),
  status: QualificationAttemptStatusSchema,
  mode: z.enum(['diagnostic', 'dry-run', 'official']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  isRecorded: z.boolean(),
});

export type IQualificationStatusAttempt = z.infer<typeof QualificationStatusAttemptSchema>;

// local sidecar that binds one status projection to its checkpoint file generation
export const QualificationStatusAttemptFileSchema = z.strictObject({
  formatVersion: z.literal(1),
  checkpointByteLength: z.number().int().nonnegative(),
  checkpointModifiedAtMs: z.number().finite().nonnegative(),
  attempt: QualificationStatusAttemptSchema,
});

export type IQualificationStatusAttemptFile = z.infer<typeof QualificationStatusAttemptFileSchema>;

// stable reasons why a local status sidecar cannot be trusted
export type IQualificationStatusUnavailableReason =
  | 'invalid-status-summary'
  | 'missing-status-summary'
  | 'oversized-status-summary'
  | 'unreadable-status-summary';

// content-free projection of one checkpoint that cannot be inspected
export type IQualificationStatusUnavailableAttempt = {
  kind: 'unavailable-attempt';
  attemptId: string;
  reason: IQualificationStatusUnavailableReason;
  protocolVersion: number | null;
};

// content-free projection of one committed latest pointer
export type IQualificationStatusLatestResult = {
  kind: 'latest-result';
  protocolVersion: number;
  adapterId: string;
  implementationId: string;
  latestAttemptId: string;
  latestStatus: IQualificationRecordedLatestResult['latestStatus'];
  lastPassingAttemptId: string | null;
  updatedAt: string;
};

export type IQualificationStatusRecord =
  | IQualificationStatusAttempt
  | IQualificationStatusLatestResult
  | IQualificationStatusUnavailableAttempt;

// exact inputs used to create one deterministic status page
export type ICreateQualificationStatusPageOptions = {
  attempts: readonly IQualificationStatusAttempt[];
  cursor?: string;
  isAll: boolean;
  latestResults: readonly IQualificationRecordedLatestResult[];
  unavailableAttempts: readonly IQualificationStatusUnavailableAttempt[];
};

// optional roots keep filesystem integration verification isolated from operator state
export type ILoadQualificationStatusPageOptions = {
  cursor?: string;
  isAll: boolean;
  attemptsRoot?: string;
  resultsRoot?: string;
};

// bounded machine-readable status contract
export type IQualificationStatusPage = {
  formatVersion: 1;
  scope: IQualificationStatusScope;
  snapshot: string;
  counts: {
    attempts: number;
    unavailableAttempts: number;
    latestResults: number;
    total: number;
  };
  records: IQualificationStatusRecord[];
  nextCursor: string | null;
};
