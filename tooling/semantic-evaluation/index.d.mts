export interface ISemanticCriterion {
  criterion: string;
  label: string;
}

// release identity required to recognize safe moldea CLI envelopes
export interface ISemanticActorExecutionEvidenceOptions {
  cliVersion: string;
  jsonSchemaVersion: number;
}

// evaluator-owned facts that may be derived from complete recognized command output
export type ISemanticActorExecutionOutputFact = {
  kind: 'moldea-cli-envelope';
  cliVersion: string;
  command: 'composition' | 'content' | 'inspect' | 'scope' | 'validate';
  containsContent: boolean;
  errorPresent: boolean;
  hasNextPage: boolean;
  pageRecordCount: number;
  relevant: boolean | null;
  resultPresent: boolean;
  schemaVersion: number;
  status: 'error' | 'invalid' | 'valid';
};

// safe command-output metadata persisted without raw command output
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

export const projectActorExecutionEvidenceEvent: (
  event: unknown,
  options: ISemanticActorExecutionEvidenceOptions,
) => ISemanticActorExecutionEvidence | null;

export const hasValidActorExecutionEvidence: (
  executionEvidence: unknown,
  options: ISemanticActorExecutionEvidenceOptions,
) => boolean;

export interface IMoldeaResourceEvidence {
  commandCount: number;
  maximumInvocationByteCount: number;
  modelVisibleToolOutputByteCount: number;
  operations: Array<'composition' | 'content' | 'inspect' | 'scope' | 'unrecognized' | 'validate'>;
  stdoutByteCount: number;
}

export interface IMoldeaResourceBudget {
  activation: 'abstain' | 'direct' | 'informational' | 'relationship';
  maximumMoldeaCommands: number;
  maximumMoldeaOutputBytes: number;
  minimumMoldeaCommands: number;
}

export const createMoldeaResourceEvidence: (
  executionEvidence: ISemanticActorExecutionEvidence[],
  options: ISemanticActorExecutionEvidenceOptions,
) => IMoldeaResourceEvidence;

export const hasValidMoldeaResourceEvidence: (evidence: unknown) => boolean;

export const hasPassingMoldeaResourceBudget: (
  evidence: unknown,
  budget: IMoldeaResourceBudget,
) => boolean;

export type ISemanticActorCommandClassification = 'completed';

// strict aggregate retained after raw actor command text is discarded
export interface ISemanticActorCommandPolicyEvidence {
  completedCommandCount: number;
}

export const classifyActorCommandPolicyEvent: (
  event: unknown,
) => ISemanticActorCommandClassification | null;

export const createActorCommandPolicyEvidence: (
  classifications: ISemanticActorCommandClassification[],
) => ISemanticActorCommandPolicyEvidence;

export const hasValidActorCommandPolicyEvidence: (evidence: unknown) => boolean;

export type ISemanticGitStateFact =
  | 'has-deleted-paths'
  | 'has-renamed-paths'
  | 'has-staged-changes'
  | 'has-unstaged-changes'
  | 'has-untracked-paths'
  | 'head-exists'
  | 'head-missing'
  | 'working-tree-clean'
  | 'working-tree-dirty';

export type ISemanticRepositoryEvidenceSource =
  | { kind: 'developer-direction' }
  | {
      fact: ISemanticGitStateFact;
      kind: 'git-state';
    }
  | {
      expectedType: 'directory' | 'file' | 'missing' | 'symlink';
      kind: 'workspace-path';
      path: string;
    };

export interface ISemanticRepositoryEvidenceDeclaration {
  claim: string;
  source: ISemanticRepositoryEvidenceSource;
}

export interface ISemanticCaseDefinition {
  expected: ISemanticCriterion[];
  forbidden: ISemanticCriterion[];
  id: string;
  input: {
    developerDirection: string;
    repositoryEvidence: ISemanticRepositoryEvidenceDeclaration[];
  };
  operation: string;
  resourceBudget: IMoldeaResourceBudget;
  scenario: string;
}

export interface ISemanticCoverage {
  claims: Array<{
    description: string;
    evidence: Array<{
      id: string;
      kind: 'deterministic-suite' | 'qualification-profile' | 'semantic-case';
    }>;
    id: string;
    rationale: string;
    sourcePaths: string[];
  }>;
  schemaVersion: 1;
}

export type ISemanticScenarioObservation =
  | { content: string; type: 'developer-direction' }
  | { fact: ISemanticGitStateFact; observed: true; type: 'git-state' }
  | { path: string; type: 'missing' }
  | { mode: number; path: string; type: 'directory' }
  | {
      mode: number;
      path: string;
      sha256: string;
      target: string;
      type: 'symlink';
    }
  | {
      content: string | null;
      mode: number;
      omission: 'file-too-large' | 'non-utf8' | null;
      path: string;
      sha256: string;
      type: 'file';
    };

export interface ISemanticScenarioEvidence {
  claim: string;
  observation: ISemanticScenarioObservation;
  source: ISemanticRepositoryEvidenceSource;
}

export type ISemanticRepositoryControlViolation =
  | 'git-config-changed'
  | 'git-metadata-changed'
  | 'git-refs-changed'
  | 'head-changed'
  | 'installed-skill-changed'
  | 'staged-state-changed';

export interface ISemanticRepositoryControlState {
  gitDigest: string;
  head: {
    commit: string | null;
    symbolicRef: string | null;
  };
  indexDigest: string;
  installedSkillDigest: string;
  localConfigDigest: string;
  refs: Array<{
    name: string;
    oid: string;
  }>;
}

export interface ISemanticRepositoryControlEvidence {
  after: ISemanticRepositoryControlState;
  before: ISemanticRepositoryControlState;
  violations: ISemanticRepositoryControlViolation[];
}

export const getSemanticCriterionLabels: (criteria: ISemanticCriterion[]) => string[];
export const validateSemanticCaseDefinition: <T extends ISemanticCaseDefinition>(
  caseDefinition: T,
) => T;
export const createSemanticCaseDefinitionDigest: (
  caseDefinition: ISemanticCaseDefinition,
) => string;
export const createSemanticCaseSuiteDigest: (caseDefinitions: ISemanticCaseDefinition[]) => string;
export const validateSemanticCoverage: <T extends ISemanticCoverage>(
  coverage: T,
  caseDefinitions: ISemanticCaseDefinition[],
) => T;
export const createSemanticCoverageDigest: (
  coverage: unknown,
  caseDefinitions: ISemanticCaseDefinition[],
) => string;
export const collectScenarioEvidence: (options: {
  caseDefinition: ISemanticCaseDefinition;
  repositoryPath: string;
}) => Promise<ISemanticScenarioEvidence[]>;
export const hasValidScenarioEvidence: (
  evidence: unknown,
  caseDefinition: ISemanticCaseDefinition,
) => boolean;
export const createEvaluationTreeDigest: (root: string) => Promise<string>;
export const captureRepositoryControlState: (
  repositoryPath: string,
) => Promise<ISemanticRepositoryControlState>;
export const createRepositoryControlEvidence: (
  before: ISemanticRepositoryControlState,
  after: ISemanticRepositoryControlState,
) => ISemanticRepositoryControlEvidence;
export const hasValidRepositoryControlEvidence: (evidence: unknown) => boolean;
export const createPortableSkillDigest: (repositoryRoot?: string) => string;

export type {
  ISemanticAttemptCommandPolicyEvidence,
  ISemanticAttemptCase,
  ISemanticAttemptCliIdentity,
  ISemanticAttemptRecord,
  ISemanticAttemptStatus,
  ISemanticAttemptTrial,
  ISemanticLatestResult,
} from './attempt-history.d.mts';
export {
  createSemanticAttemptRecord,
  loadSemanticEvaluationAttempts,
  loadVerifiedSemanticEvaluationAttempts,
  recordSemanticEvaluationAttempt,
  verifySemanticEvaluationAttempts,
} from './attempt-history.mjs';
