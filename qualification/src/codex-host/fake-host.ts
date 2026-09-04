import type { IActorOutput, IJudgeOutput } from '../contracts/index.ts';
import type {
  IActorExecutionInput,
  ICodexHost,
  ICodexRoleExecutionResult,
  IFakeCodexHostOptions,
  IJudgeExecutionInput,
} from './types.ts';

/** Deterministic host used by unit tests, integration tests, and the model-free dry run. */
export class FakeCodexHost implements ICodexHost {
  private readonly __options: IFakeCodexHostOptions;

  public constructor(options: IFakeCodexHostOptions = {}) {
    this.__options = options;
  }

  public async getVersion(): Promise<string> {
    return Promise.resolve('codex-cli fake');
  }

  public async runActor(
    input: IActorExecutionInput,
  ): Promise<ICodexRoleExecutionResult<IActorOutput>> {
    if (this.__options.actor !== undefined) {
      return this.__options.actor(input);
    }

    return Promise.resolve({
      output: {
        outcome: input.scenario.expectedActorOutcome,
        summary: `Applied the transparent expected dry-run state for ${input.caseId}.`,
        changedFiles: input.dryRunChangedFiles ?? input.scenario.workspace.allowedChangePaths,
        observations: ['No paid model execution occurred.'],
        unresolved: [],
      },
      usage: null,
      durationMs: 0,
      events: '',
      commandPolicy: {
        completedCommandCount: 0,
        credentialExposure: { status: 'not-observed', observedCount: 0 },
        modelVisibleToolOutputByteCount: 0,
        moldeaCommandCount: 0,
        moldeaOutputByteCount: 0,
        networkAccess: { status: 'not-observed', observedCount: 0, indeterminateCount: 0 },
        sensitiveAccess: { status: 'not-observed', observedCount: 0, indeterminateCount: 0 },
      },
    });
  }

  public async runJudge(
    input: IJudgeExecutionInput,
  ): Promise<ICodexRoleExecutionResult<IJudgeOutput>> {
    if (this.__options.judge !== undefined) {
      return this.__options.judge(input);
    }

    throw new Error('The model-free qualification host cannot perform semantic judgment.');
  }
}
