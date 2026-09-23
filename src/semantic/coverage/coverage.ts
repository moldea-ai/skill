import { calculateSha256 } from '../../filesystem/index.ts';
import type { ISemanticCase } from '../cases/index.ts';
import { SEMANTIC_COVERAGE_CLAIMS } from './claims.ts';
import type { ISemanticCoverage, ISemanticCoverageClaim } from './types.ts';

/** Derives semantic coverage evidence from discovered case metadata. */
export const createSemanticCoverage = (cases: readonly ISemanticCase[]): ISemanticCoverage => {
  const claimsById = new Map<string, ISemanticCoverageClaim>(
    SEMANTIC_COVERAGE_CLAIMS.map((claim): [string, ISemanticCoverageClaim] => [
      claim.id,
      {
        description: claim.description,
        evidence: [...claim.fixedEvidence],
        id: claim.id,
        rationale: claim.rationale,
        sourcePaths: [...claim.sourcePaths],
      },
    ]),
  );

  for (const semanticCase of cases) {
    for (const claimId of semanticCase.coverageClaimIds) {
      const claim = claimsById.get(claimId);
      if (claim === undefined) {
        throw new Error(`Semantic case ${semanticCase.id} references unknown claim ${claimId}.`);
      }
      claim.evidence.push({ id: semanticCase.id, kind: 'semantic-case' });
    }
  }

  const claims = [...claimsById.values()].sort((left, right) => left.id.localeCompare(right.id));
  for (const claim of claims) {
    claim.evidence.sort(
      (left, right) => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id),
    );
    if (claim.evidence.length === 0) {
      throw new Error(`Semantic coverage claim ${claim.id} has no evidence.`);
    }
  }
  return { claims, schemaVersion: 1 };
};

/** Calculates the deterministic digest of coverage derived from discovered cases. */
export const createSemanticCoverageDigest = (coverage: ISemanticCoverage): string =>
  calculateSha256(`${JSON.stringify(coverage)}\n`);
