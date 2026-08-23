import type { ZodType } from 'zod';

import type {
  IActorOutput,
  IJudgeOutput,
  IModelUsage,
  IQualificationCaseScenario,
} from '../contracts/index.ts';

// common execution boundary supplied to a model role
export type ICodexRoleExecutionInput<TResult> = {
  prompt: string;
  schema: ZodType<TResult>;
  signal?: AbortSignal | undefined;
  workspaceDirectory: string;
};

export type ICodexRoleExecutionResult<TResult> = {
  output: TResult;
  usage: IModelUsage | null;
  durationMs: number;
  events: string;
};

export type IActorExecutionInput = ICodexRoleExecutionInput<IActorOutput> & {
  caseId: string;
  // observed changes after applying the transparent dry-run fixture; omitted for real actors
  dryRunChangedFiles?: string[] | undefined;
  scenario: IQualificationCaseScenario;
};

export type IJudgeExecutionInput = ICodexRoleExecutionInput<IJudgeOutput> & {
  caseId: string;
  scenario: IQualificationCaseScenario;
};

// injectable host keeps tests and dry runs free of paid model calls
export type ICodexHost = {
  getVersion(): Promise<string>;
  runActor(input: IActorExecutionInput): Promise<ICodexRoleExecutionResult<IActorOutput>>;
  runJudge(input: IJudgeExecutionInput): Promise<ICodexRoleExecutionResult<IJudgeOutput>>;
};

export type IFakeCodexHostOptions = {
  actor?: (input: IActorExecutionInput) => Promise<ICodexRoleExecutionResult<IActorOutput>>;
  judge?: (input: IJudgeExecutionInput) => Promise<ICodexRoleExecutionResult<IJudgeOutput>>;
};
