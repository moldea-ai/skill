import type { IQualificationSelection } from '../contracts/index.ts';

export type IQualificationCommand =
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
      isJson: boolean;
    }
  | {
      kind: 'retry';
      attemptId: string;
      hasConfirmedPaidExecution: boolean;
      isJson: boolean;
    }
  | {
      kind: 'run';
      selection: IQualificationSelection;
      skillRepository?: string;
      isDryRun: boolean;
      useCache: boolean;
      hasConfirmedPaidExecution: boolean;
      isJson: boolean;
    }
  | {
      kind: 'status';
      isAll: boolean;
      isJson: boolean;
    }
  | { kind: 'verify'; isJson: boolean };
