import type { IQualificationPaidExecutionRequest } from './types.ts';

/** Shares one paid-execution decision across concurrent workers in the same explicit batch. */
export const coalesceQualificationPaidExecutionApproval = (
  requestApproval: ((request: IQualificationPaidExecutionRequest) => Promise<boolean>) | undefined,
  aggregateRequest?: IQualificationPaidExecutionRequest,
): ((request: IQualificationPaidExecutionRequest) => Promise<boolean>) | undefined => {
  if (requestApproval === undefined) return undefined;
  let decision: Promise<boolean> | null = null;
  return (request) => {
    decision ??= requestApproval(aggregateRequest ?? request);
    return decision;
  };
};
