import type { IEvaluationBatchWorkerCount } from '../../execution/batch/index.ts';

export type ISemanticDiagnosticSelector =
  { kind: 'all'; value: null } | { kind: 'cases' | 'claims' | 'unresolved-from'; value: string };

export interface ISemanticEvaluationArguments {
  diagnosticBatchSelector: ISemanticDiagnosticSelector | null;
  isDiagnoseBatchRequested: boolean;
  isPreflightRequested: boolean;
  isRecordCheckpointRequested: boolean;
  isRecordRequested: boolean;
  isRestartRequested: boolean;
  isResumeStoppedStageRequested: boolean;
  isVerifyAttemptsRequested: boolean;
  requestedCaseId: string | undefined;
  workerCount: IEvaluationBatchWorkerCount | null;
}
