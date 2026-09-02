import type { IQualificationAttemptResult } from '../../qualification/src/contracts/index.ts';
import type { IQualificationAttemptStorage } from '../../qualification/src/storage/index.ts';

// local authorization contract consumed by ordinary qualification without Git history
export const hasCarryForward401Qualification: (
  attestation: unknown,
  options: {
    repositoryRoot: string;
    result: IQualificationAttemptResult;
    storage: IQualificationAttemptStorage;
  },
) => boolean;

export const hasLocalCarryForward401Qualification: (options: {
  repositoryRoot: string;
  result: IQualificationAttemptResult;
  storage: IQualificationAttemptStorage;
}) => boolean;
