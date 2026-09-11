import type {
  IQualificationCaseResult,
  IQualificationStageCheckpoint,
} from '../contracts/index.ts';
import type { IQualificationAttemptStorage } from '../storage/index.ts';

// one direct passing or recovered case from exact committed current evidence
export type IReusableQualificationCase = {
  caseResult: IQualificationCaseResult;
  readArtifact: (logicalPath: string) => Promise<Buffer>;
  sourceAttemptId: string;
  sourceCommit: string;
  sourceCreatedAt: string;
  sourceStages: IQualificationStageCheckpoint[];
  storage: IQualificationAttemptStorage;
};
