// types
export type {
  ISemanticCoverage,
  ISemanticCoverageClaim,
  ISemanticCoverageClaimSource,
  ISemanticCoverageEvidence,
} from './types.ts';

// claims
export { SEMANTIC_COVERAGE_CLAIMS } from './claims.ts';

// derivation
export { createSemanticCoverage, createSemanticCoverageDigest } from './coverage.ts';
