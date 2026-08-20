// exhaustive profile-claim coverage result persisted with each attempt
export type IQualificationCoverageResult = {
  passed: boolean;
  requiredClaims: string[];
  declaredClaims: string[];
  missingClaims: string[];
  unknownClaims: string[];
  uncoveredCaseIds: string[];
};
