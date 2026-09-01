import { createHash } from 'node:crypto';

const COVERAGE_EVIDENCE_KINDS = new Set([
  'deterministic-suite',
  'qualification-profile',
  'semantic-case',
]);
const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Validates the semantic coverage map against the complete current case suite. */
export const validateSemanticCoverage = (coverage, caseDefinitions) => {
  if (!isPlainRecord(coverage) || coverage.schemaVersion !== 1 || !Array.isArray(coverage.claims)) {
    throw new Error('Semantic coverage requires schema version 1 and a claims collection.');
  }

  const caseIds = new Set(caseDefinitions.map(({ id }) => id));
  const coveredSemanticCaseIds = new Set();
  const claimIds = new Set();

  for (const claim of coverage.claims) {
    if (
      !isPlainRecord(claim) ||
      typeof claim.id !== 'string' ||
      !STABLE_ID_PATTERN.test(claim.id) ||
      claimIds.has(claim.id) ||
      typeof claim.description !== 'string' ||
      claim.description.trim().length === 0 ||
      typeof claim.rationale !== 'string' ||
      claim.rationale.trim().length === 0 ||
      !Array.isArray(claim.sourcePaths) ||
      claim.sourcePaths.length === 0 ||
      !claim.sourcePaths.every(
        (path) => typeof path === 'string' && path.startsWith('moldea/') && path.length > 7,
      ) ||
      !Array.isArray(claim.evidence) ||
      claim.evidence.length === 0
    ) {
      throw new Error('Semantic coverage contains an invalid or duplicate claim.');
    }
    claimIds.add(claim.id);

    for (const evidence of claim.evidence) {
      if (
        !isPlainRecord(evidence) ||
        Object.keys(evidence).length !== 2 ||
        !COVERAGE_EVIDENCE_KINDS.has(evidence.kind) ||
        typeof evidence.id !== 'string' ||
        !STABLE_ID_PATTERN.test(evidence.id)
      ) {
        throw new Error(`Semantic coverage claim ${claim.id} has invalid evidence.`);
      }
      if (evidence.kind === 'semantic-case') {
        if (!caseIds.has(evidence.id)) {
          throw new Error(`Semantic coverage references unknown case ${evidence.id}.`);
        }
        coveredSemanticCaseIds.add(evidence.id);
      }
    }
  }

  const uncoveredCaseIds = [...caseIds].filter((id) => !coveredSemanticCaseIds.has(id));
  if (uncoveredCaseIds.length > 0) {
    throw new Error(`Semantic coverage omits cases: ${uncoveredCaseIds.join(', ')}.`);
  }

  return coverage;
};

/** Hashes the validated semantic coverage contract exactly. */
export const createSemanticCoverageDigest = (coverage, caseDefinitions) => {
  validateSemanticCoverage(coverage, caseDefinitions);
  return createHash('sha256').update(JSON.stringify(coverage)).digest('hex');
};
