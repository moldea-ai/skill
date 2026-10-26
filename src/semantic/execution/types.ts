import type {
  IMoldeaCliOperation,
  IRepositoryTestCommandKind,
  IRepairGitCommandEvidence,
  ICodexEvaluationCommandPolicyEvidence,
} from '../../execution/host/index.ts';
import type { ISemanticWorkspaceChanges } from '../workspace/index.ts';
import type { ISemanticHostOutput } from './host-output.ts';

// one runner-authored developer request, with its own unchanged resource allowance
export interface ISemanticCycleEvidence extends ISemanticHostOutput {
  developerRequest: string;
  requestIndex: number;
  isMountIntegrityPassing: boolean;
  isRepositoryControlPassing: boolean;
  workspaceChanges: ISemanticWorkspaceChanges;
}

// one admitted paid invocation; null usage conservatively charges the absolute host maximum
export interface ISemanticPaidInvocation {
  commandPolicyEvidence?: ICodexEvaluationCommandPolicyEvidence;
  // completed cycles survive a later operational restart of the session
  cycle?: ISemanticCycleEvidence;
  stage: 'actor' | 'judge';
  usage: ISemanticHostOutput['usage'];
}

// release identity required to recognize safe moldea CLI envelopes
export interface ISemanticActorExecutionEvidenceOptions {
  cliVersion: string;
  jsonSchemaVersion: number;
}

// evaluator-owned facts derived from recognized command output
export type ISemanticActorExecutionOutputFact =
  | {
      kind: 'repair-git-result';
      mode: 'checkpoint' | 'continue' | 'review' | 'verify';
      status: 'available' | 'unavailable';
      commitAvailable: boolean;
      reasonCode:
        | 'arguments'
        | 'attribute-safety'
        | 'git-read'
        | 'commit-unavailable'
        | 'output-limit'
        | null;
    }
  | {
      kind: 'moldea-cli-envelope';
      // schema 7 records acceptance separately; historical schemas retain their original shape
      acceptedWarningCount?: number | null;
      cliVersion: string;
      command: IMoldeaCliOperation;
      containsContent: boolean;
      errorCount: number | null;
      errorCode: string | null;
      errorPresent: boolean;
      hasNextPage: boolean;
      pageRecordCount: number;
      relevant: boolean | null;
      resultPresent: boolean;
      schemaVersion: number;
      status: 'error' | 'invalid' | 'valid';
      warningCount: number | null;
    }
  | {
      kind: 'relevance-gate-result';
      matched: boolean;
      mode: 'adoption-only' | 'relationship';
    }
  | {
      kind: 'managed-readme-result';
      status: 'created' | 'invalid-marker-pair' | 'unchanged' | 'updated';
    }
  | {
      kind: 'managed-agents-result';
      status: 'created' | 'updated' | 'unchanged';
    }
  | {
      kind: 'managed-agents-print-result';
      blockSha256: string;
    }
  | {
      cancelledCount: 0;
      failedCount: 0;
      kind: 'node-test-summary';
      passedCount: number;
      skippedCount: 0;
      status: 'passed';
      testCount: number;
      testKinds: IRepositoryTestCommandKind[];
      todoCount: 0;
    };

// safe command-output metadata persisted without raw output
export interface ISemanticActorExecutionOutputEvidence {
  byteCount: number;
  disposition: 'empty' | 'projected' | 'too-large' | 'unrecognized';
  facts: ISemanticActorExecutionOutputFact[];
}

// persisted host-command observations and separately captured launcher executions
export interface ISemanticActorExecutionEvidence {
  eventType: 'item.completed';
  item: {
    commandKind: 'managed-agents' | 'moldea' | 'other';
    repairGit: IRepairGitCommandEvidence;
    exitCode: number;
    outputEvidence: ISemanticActorExecutionOutputEvidence;
    status: 'completed' | 'failed';
    type: 'command_execution';
  };
}

// CLI output totals count emitted bytes; command policy records model visibility separately
export interface IMoldeaResourceEvidence {
  commandCount: number;
  maximumInvocationByteCount: number;
  modelVisibleToolOutputByteCount: number;
  operations: Array<IMoldeaCliOperation | 'unrecognized'>;
  stdoutByteCount: number;
}
