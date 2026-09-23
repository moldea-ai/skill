export type ISemanticCoverageEvidence = {
  id: string;
  kind: 'deterministic-suite' | 'qualification-profile' | 'semantic-case';
};

export type ISemanticCoverageClaimSource = {
  description: string;
  fixedEvidence: readonly ISemanticCoverageEvidence[];
  id: string;
  rationale: string;
  sourcePaths: readonly string[];
};

export type ISemanticCoverageClaim = {
  description: string;
  evidence: ISemanticCoverageEvidence[];
  id: string;
  rationale: string;
  sourcePaths: string[];
};

export type ISemanticCoverage = {
  claims: ISemanticCoverageClaim[];
  schemaVersion: 1;
};
