import type { IEvaluationReplayWorkspaceChangeStatus } from '@moldea.ai/website-ui/evaluation-replay-model';

// recorded changes used by the bounded Evidence previews
export interface IRecordedFileChange {
  path: string;
  status: IEvaluationReplayWorkspaceChangeStatus;
}

// compact rows preserve full paths while combining unbranched folders
export type IRecordedFileTreeRow = {
  depth: number;
  name: string;
  path: string;
} & ({ kind: 'folder' } | { kind: 'file'; status: IEvaluationReplayWorkspaceChangeStatus });
