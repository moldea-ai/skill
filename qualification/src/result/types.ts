import type { IQualificationAttemptResult } from '../contracts/index.ts';

// result verification issue with a public repository-relative evidence path
export type IQualificationResultVerificationIssue = {
  path: string;
  message: string;
};

export type IQualificationResultVerification = {
  passed: boolean;
  attempts: number;
  issues: IQualificationResultVerificationIssue[];
};

export type IRecordQualificationResultOptions = {
  artifactDirectory: string;
  result: IQualificationAttemptResult;
};
