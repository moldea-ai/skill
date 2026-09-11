// CLI closure contracts
export interface ICliClosureEdge {
  field: 'dependencies' | 'optionalDependencies' | 'peerDependencies';
  name: string;
  requested: string;
  resolvedPackageKey: string | null;
}

export interface ICliClosurePackage {
  edges: ICliClosureEdge[];
  integrity: string;
  packageKey: string;
  version: string;
}

export interface ICliClosureIdentity {
  cliDeclaration: string;
  cliJsonSchemaVersion: number;
  packages: ICliClosurePackage[];
  schemaVersion: 1;
}

// semantic source and attempt contracts
export interface ISemanticSourceEntry {
  mode: '100644' | '100755' | '120000';
  path: string;
  sha256: string;
}

export interface ISemanticSourceIdentity {
  sourceCommit: string;
  sourceDigest: string;
  sourceEntries: ISemanticSourceEntry[];
}

export interface ISemanticAttemptInventoryEntry {
  attemptId: string;
  attemptSha256: string;
  evidenceSha256: string;
  identitySha256: string | null;
}

export interface ISemanticIdentityReceipt extends ISemanticSourceIdentity {
  argumentDigest: string;
  attemptInventory: ISemanticAttemptInventoryEntry[];
  cliClosureDigest: string;
  evaluatorProcessId: number | null;
  invocationId: string;
  ownerProcessId: number;
  portableSkillBehaviorDigest: string;
  recordingKind: 'record' | 'record-checkpoint';
  schemaVersion: 1;
  semanticInputDigest: string;
}

export interface ISemanticAttemptIdentity {
  argumentDigest: string;
  attemptId: string;
  attemptSha256: string;
  cliClosureDigest: string;
  evidenceSha256: string;
  invocationId: string;
  portableSkillBehaviorDigest: string;
  schemaVersion: 1;
  semanticInputDigest: string;
  sourceCommit: string;
  sourceDigest: string;
}

export interface ISemanticIdentityRecoveryResult {
  attemptId: string | null;
  status: 'already-identified' | 'finalized' | 'no-receipt' | 'retired';
}

export interface ISemanticEvaluationOutcome {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}

// semantic identity contract and repository paths
export const SEMANTIC_IDENTITY_SCHEMA_VERSION: 1;
export const SEMANTIC_IDENTITY_RECEIPT_PATH: string;
export const SEMANTIC_RESULTS_PATH: string;

export const createCliClosureIdentity: (repositoryRoot: string) => ICliClosureIdentity;
export const createCliClosureDigest: (repositoryRoot: string) => string;
export const createPortableSkillArtifactDigest: (repositoryRoot: string) => string;
export const createPortableSkillBehaviorDigest: (repositoryRoot: string) => string;
export const createSemanticInputDigest: (repositoryRoot: string) => string;
export const captureSemanticSourceIdentity: (repositoryRoot: string) => ISemanticSourceIdentity;
export const captureSemanticAttemptInventory: (
  repositoryRoot: string,
) => ISemanticAttemptInventoryEntry[];
export const createSemanticIdentityReceipt: (
  repositoryRoot: string,
  arguments_: string[],
) => ISemanticIdentityReceipt;
export const readSemanticAttemptIdentity: (
  repositoryRoot: string,
  attemptId: string,
) => ISemanticAttemptIdentity | null;
export const writeSemanticIdentityReceipt: (
  repositoryRoot: string,
  receipt: ISemanticIdentityReceipt,
) => Promise<void>;
export const recoverSemanticIdentity: (
  repositoryRoot: string,
  options?: {
    allowExistingAttempt?: boolean;
    expectedInvocationId?: string | null;
  },
) => Promise<ISemanticIdentityRecoveryResult>;
export const runSemanticEvaluation: (options?: {
  arguments_?: string[];
  environment?: NodeJS.ProcessEnv;
  repositoryRoot?: string;
  runnerPath?: string;
}) => Promise<ISemanticEvaluationOutcome>;
export const applySemanticEvaluationOutcome: (outcome: ISemanticEvaluationOutcome) => void;
