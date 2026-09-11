const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const COMMIT_PATTERN = /^[a-f0-9]{40,64}$/u;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Compares one exact trial identity without relying on object property order. */
const hasMatchingTrialIdentity = (candidate, expected) =>
  isPlainRecord(candidate) &&
  isPlainRecord(expected) &&
  Object.keys(candidate).length === 3 &&
  typeof candidate.caseId === 'string' &&
  candidate.caseId.trim().length > 0 &&
  candidate.caseId === expected.caseId &&
  candidate.confirmationIndex === expected.confirmationIndex &&
  [null, 1, 2, 3].includes(candidate.confirmationIndex) &&
  candidate.kind === expected.kind &&
  candidate.kind === (candidate.confirmationIndex === null ? 'initial' : 'confirmation');

/** Creates transparent provenance for one exact reused semantic model stage. */
export const createSemanticStageReuseRecord = ({
  identitySha256,
  sourceAttemptId,
  sourceCommit,
  sourceEvidencePath,
  sourceEvidenceSha256,
  stage,
  trial,
}) => {
  const record = {
    identitySha256,
    origin: 'reused',
    schemaVersion: 1,
    source: {
      attemptId: sourceAttemptId,
      commit: sourceCommit,
      evidencePath: sourceEvidencePath,
      evidenceSha256: sourceEvidenceSha256,
      trial,
    },
    stage,
  };
  if (
    !hasValidSemanticStageReuseRecord(record, {
      identitySha256,
      sourceAttemptId,
      sourceCommit,
      sourceEvidencePath,
      sourceEvidenceSha256,
      stage,
      trial,
    })
  ) {
    throw new Error('Semantic stage reuse provenance is incomplete or invalid.');
  }
  return record;
};

/** Validates exact reusable-stage provenance against the requested identity and trial. */
export const hasValidSemanticStageReuseRecord = (
  record,
  {
    identitySha256,
    sourceAttemptId,
    sourceCommit,
    sourceEvidencePath,
    sourceEvidenceSha256,
    stage,
    trial,
  },
) =>
  isPlainRecord(record) &&
  Object.keys(record).length === 5 &&
  record.schemaVersion === 1 &&
  record.origin === 'reused' &&
  record.identitySha256 === identitySha256 &&
  SHA256_PATTERN.test(record.identitySha256) &&
  record.stage === stage &&
  ['actor', 'judge'].includes(record.stage) &&
  isPlainRecord(record.source) &&
  Object.keys(record.source).length === 5 &&
  typeof record.source.attemptId === 'string' &&
  record.source.attemptId.trim().length > 0 &&
  (sourceAttemptId === undefined || record.source.attemptId === sourceAttemptId) &&
  COMMIT_PATTERN.test(record.source.commit) &&
  (sourceCommit === undefined || record.source.commit === sourceCommit) &&
  typeof record.source.evidencePath === 'string' &&
  record.source.evidencePath.startsWith('fixtures/semantic-evaluation-results/attempts/') &&
  record.source.evidencePath.endsWith('/evidence.json') &&
  (sourceEvidencePath === undefined || record.source.evidencePath === sourceEvidencePath) &&
  SHA256_PATTERN.test(record.source.evidenceSha256) &&
  (sourceEvidenceSha256 === undefined || record.source.evidenceSha256 === sourceEvidenceSha256) &&
  hasMatchingTrialIdentity(record.source.trial, trial);

/** Selects one exact matching reuse candidate and rejects ambiguous sources. */
export const selectSemanticStageReuse = (candidates, expected) => {
  const matches = candidates.filter((candidate) =>
    hasValidSemanticStageReuseRecord(candidate, expected),
  );
  if (matches.length > 1) {
    throw new Error('Semantic stage reuse has multiple exact source candidates.');
  }
  return matches[0] ?? null;
};
