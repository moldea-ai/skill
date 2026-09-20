import type {
  IMoldeaCliOperation,
  IRepositoryTestCommandKind,
} from '../../execution/host/index.ts';

// release identity required to recognize safe moldea CLI envelopes
export interface ISemanticActorExecutionEvidenceOptions {
  cliVersion: string;
  jsonSchemaVersion: number;
}

// evaluator-owned facts derived from recognized command output
export type ISemanticActorExecutionOutputFact =
  | {
      kind: 'moldea-cli-envelope';
      cliVersion: string;
      command: IMoldeaCliOperation;
      containsContent: boolean;
      errorCode: string | null;
      errorPresent: boolean;
      hasNextPage: boolean;
      pageRecordCount: number;
      relevant: boolean | null;
      resultPresent: boolean;
      schemaVersion: number;
      status: 'error' | 'invalid' | 'valid';
    }
  | {
      cancelledCount: 0;
      failedCount: 0;
      kind: 'node-test-summary';
      passedCount: number;
      skippedCount: 0;
      status: 'passed';
      testCount: number;
      testKind: IRepositoryTestCommandKind;
      todoCount: 0;
    };

// safe command-output metadata persisted without raw output
export interface ISemanticActorExecutionOutputEvidence {
  byteCount: number;
  disposition: 'empty' | 'projected' | 'too-large' | 'unrecognized';
  facts: ISemanticActorExecutionOutputFact[];
}

// strict persisted completed-command evidence
export interface ISemanticActorExecutionEvidence {
  eventType: 'item.completed';
  item: {
    commandKind: 'moldea' | 'other';
    exitCode: number;
    outputEvidence: ISemanticActorExecutionOutputEvidence;
    status: 'completed' | 'failed';
    type: 'command_execution';
  };
}

// content-free aggregate of moldea CLI use by one actor
export interface IMoldeaResourceEvidence {
  commandCount: number;
  maximumInvocationByteCount: number;
  modelVisibleToolOutputByteCount: number;
  operations: Array<IMoldeaCliOperation | 'unrecognized'>;
  stdoutByteCount: number;
}
