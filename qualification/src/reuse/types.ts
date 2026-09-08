import type { IQualificationAttemptResult, IQualificationCaseResult } from '../contracts/index.ts';
import type { IQualificationAttemptStorage } from '../storage/index.ts';

// one direct passing or recovered case from exact committed current evidence
export type IReusableQualificationCase = {
  attemptDirectory: string;
  caseResult: IQualificationCaseResult;
  result: IQualificationAttemptResult;
  sourceCommit: string;
  storage: IQualificationAttemptStorage;
};
