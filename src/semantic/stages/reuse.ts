import type {
  ISemanticStageReuseExpectation,
  ISemanticStageReuseRecord,
  ISemanticStageTrialIdentity,
} from './types.ts';

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const isPlainRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Compares one exact trial identity without relying on object property order. */
const hasMatchingTrialIdentity = (
  candidate: unknown,
  expected: ISemanticStageTrialIdentity,
): candidate is ISemanticStageTrialIdentity =>
  isPlainRecord(candidate) &&
  Object.keys(candidate).length === 3 &&
  typeof candidate['caseId'] === 'string' &&
  candidate['caseId'].trim().length > 0 &&
  candidate['caseId'] === expected.caseId &&
  candidate['confirmationIndex'] === expected.confirmationIndex &&
  [null, 1, 2, 3].includes(candidate['confirmationIndex'] as null | number) &&
  candidate['kind'] === expected.kind &&
  candidate['kind'] === (candidate['confirmationIndex'] === null ? 'initial' : 'confirmation');

/** Validates exact local completed-run provenance against one stage identity and trial. */
export const hasValidSemanticStageReuseRecord = (
  record: unknown,
  expectation: ISemanticStageReuseExpectation,
): record is ISemanticStageReuseRecord =>
  isPlainRecord(record) &&
  Object.keys(record).length === 5 &&
  record['schemaVersion'] === 1 &&
  record['origin'] === 'reused' &&
  record['identitySha256'] === expectation.identitySha256 &&
  typeof record['identitySha256'] === 'string' &&
  SHA256_PATTERN.test(record['identitySha256']) &&
  record['stage'] === expectation.stage &&
  isPlainRecord(record['source']) &&
  Object.keys(record['source']).length === 3 &&
  typeof record['source']['attemptId'] === 'string' &&
  record['source']['attemptId'].trim().length > 0 &&
  (expectation.sourceAttemptId === undefined ||
    record['source']['attemptId'] === expectation.sourceAttemptId) &&
  typeof record['source']['evidenceSha256'] === 'string' &&
  SHA256_PATTERN.test(record['source']['evidenceSha256']) &&
  (expectation.sourceEvidenceSha256 === undefined ||
    record['source']['evidenceSha256'] === expectation.sourceEvidenceSha256) &&
  hasMatchingTrialIdentity(record['source']['trial'], expectation.trial);

/** Creates transparent provenance for one exact reused semantic model stage. */
export const createSemanticStageReuseRecord = (options: {
  identitySha256: string;
  sourceAttemptId: string;
  sourceEvidenceSha256: string;
  stage: ISemanticStageReuseRecord['stage'];
  trial: ISemanticStageTrialIdentity;
}): ISemanticStageReuseRecord => {
  const record: ISemanticStageReuseRecord = {
    identitySha256: options.identitySha256,
    origin: 'reused',
    schemaVersion: 1,
    source: {
      attemptId: options.sourceAttemptId,
      evidenceSha256: options.sourceEvidenceSha256,
      trial: options.trial,
    },
    stage: options.stage,
  };

  if (!hasValidSemanticStageReuseRecord(record, options)) {
    throw new Error('Semantic stage reuse provenance is incomplete or invalid.');
  }

  return record;
};

/** Selects one exact matching reuse candidate and rejects ambiguous sources. */
export const selectSemanticStageReuse = (
  candidates: readonly unknown[],
  expected: ISemanticStageReuseExpectation,
): ISemanticStageReuseRecord | null => {
  const matches = candidates.filter((candidate): candidate is ISemanticStageReuseRecord =>
    hasValidSemanticStageReuseRecord(candidate, expected),
  );
  if (matches.length > 1) {
    throw new Error('Semantic stage reuse has multiple exact source candidates.');
  }
  return matches[0] ?? null;
};
