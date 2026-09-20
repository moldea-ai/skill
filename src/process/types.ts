// one bounded child-process invocation with explicit accepted exit codes
export type IProcessExecutionOptions = {
  command: string;
  args: readonly string[];
  cwd: string;
  environment?: NodeJS.ProcessEnv;
  expectedExitCodes?: readonly number[];
  input?: string;
  signal?: AbortSignal | undefined;
};

export type IProcessExecutionResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};
