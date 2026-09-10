import type { IEvaluationBatchWorkerCount } from '../../../tooling/evaluation-batch/index.mjs';

import type { IQualificationSelection } from '../contracts/index.ts';
import type { IQualificationDiagnosticSelectorInput } from '../diagnostic-batch/index.ts';
import type { IQualificationProfileBatchSelectorInput } from '../profile-batch/index.ts';

export type IQualificationCommand =
  | {
      kind: 'diagnose';
      selection: IQualificationSelection;
      caseId: string;
      packagesRepository?: string;
      skillRepository?: string;
      hasConfirmedPaidExecution: boolean;
      isJson: boolean;
    }
  | {
      kind: 'diagnose-batch';
      selection: IQualificationSelection;
      selector: IQualificationDiagnosticSelectorInput;
      packagesRepository?: string;
      skillRepository?: string;
      restart: boolean;
      resumeStoppedStage: boolean;
      workerCount: IEvaluationBatchWorkerCount;
      hasConfirmedPaidExecution: boolean;
      isJson: boolean;
    }
  | { kind: 'list'; isJson: boolean }
  | {
      kind: 'record';
      attemptId: string;
      isJson: boolean;
    }
  | {
      kind: 'resume';
      attemptId: string;
      hasConfirmedPaidExecution: boolean;
      resumeStoppedStage: boolean;
      workerCount: IEvaluationBatchWorkerCount;
      isJson: boolean;
    }
  | {
      kind: 'retry';
      attemptId: string;
      hasConfirmedPaidExecution: boolean;
      workerCount: IEvaluationBatchWorkerCount;
      isJson: boolean;
    }
  | {
      kind: 'run';
      selection: IQualificationSelection;
      packagesRepository?: string;
      skillRepository?: string;
      isDryRun: boolean;
      reuseEvidence: boolean;
      workerCount: IEvaluationBatchWorkerCount;
      hasConfirmedPaidExecution: boolean;
      isJson: boolean;
    }
  | {
      kind: 'run-batch';
      selector: IQualificationProfileBatchSelectorInput;
      packagesRepository?: string;
      skillRepository?: string;
      isDryRun: boolean;
      reuseEvidence: boolean;
      restart: boolean;
      resumeStoppedStage: boolean;
      workerCount: IEvaluationBatchWorkerCount;
      hasConfirmedPaidExecution: boolean;
      isJson: boolean;
    }
  | {
      kind: 'status';
      cursor?: string;
      isAll: boolean;
      isJson: boolean;
    }
  | { kind: 'verify'; isJson: boolean };
