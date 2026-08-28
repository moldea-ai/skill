export interface ISemanticCriterion {
  criterion: string;
  label: string;
}

// release identity required to recognize safe Moldea CLI envelopes
export interface ISemanticActorExecutionEvidenceOptions {
  cliVersion: string;
  jsonSchemaVersion: number;
}

// evaluator-owned facts that may be derived from complete recognized command output
export type ISemanticActorExecutionOutputFact =
  | {
      kind: 'focused-runtime-test';
      path: '/src/support-agent.test-integration.js';
      status: 'failed' | 'passed';
    }
  | {
      kind: 'moldea-cli-envelope';
      cliVersion: string;
      command: 'composition' | 'inspect' | 'validate';
      errorPresent: boolean;
      resultPresent: boolean;
      schemaVersion: number;
      status: 'error' | 'invalid' | 'valid';
    }
  | {
      kind: 'workspace-paths';
      paths: string[];
    }
  | {
      binaries: ['moldea'];
      kind: 'yarn-package-info';
      packageName: '@moldea.ai/cli';
      version: string;
    }
  | {
      binaryName: 'moldea';
      kind: 'yarn-binary-provider';
      source: 'conflicting-moldea-provider';
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

export type ISemanticActorCommandClassification = 'indeterminate' | 'not-observed' | 'observed';

export interface ISemanticActorCommandPolicyOptions {
  hasGitCommandPolicyBoundary?: boolean;
}

// strict aggregate retained after raw actor command text is discarded
export interface ISemanticActorCommandPolicyEvidence {
  completedCommandCount: number;
  indeterminateCommandCount: number;
  packageManagerExecution: ISemanticActorCommandClassification;
  packageManagerInvocationCount: number;
}

export const classifyActorCommandPolicyEvent: (
  event: unknown,
  options?: ISemanticActorCommandPolicyOptions,
) => ISemanticActorCommandClassification | null;

export const createActorCommandPolicyEvidence: (
  classifications: ISemanticActorCommandClassification[],
) => ISemanticActorCommandPolicyEvidence;

export const hasValidActorCommandPolicyEvidence: (evidence: unknown) => boolean;

export const hasPassingPackageManagerNonExecutionPolicy: (evidence: unknown) => boolean;

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
  | { kind: 'host-instructions' }
  | {
      fact: ISemanticGitStateFact;
      kind: 'git-state';
    }
  | {
      expectedType: 'directory' | 'file' | 'missing' | 'symlink';
      kind: 'workspace-path';
      path: string;
    }
  | {
      expectedType: 'directory' | 'file' | 'missing' | 'symlink';
      kind: 'related-path';
      mount: string;
      path: string;
    };

export interface ISemanticRepositoryEvidenceDeclaration {
  claim: string;
  source: ISemanticRepositoryEvidenceSource;
}

export interface ISemanticCaseDefinition {
  expected: ISemanticCriterion[];
  forbidden: ISemanticCriterion[];
  hostInstructions?: string;
  id: string;
  input: {
    developerDirection: string;
    repositoryEvidence: ISemanticRepositoryEvidenceDeclaration[];
  };
  operation: string;
  scenario: string;
  skillEvidence?: {
    activationScenarios: Array<{
      request: string;
      shouldActivate: boolean;
    }>;
    artifacts: Array<{
      role: 'authoritative-source' | 'distributed-copy' | 'installed-copy';
      root: string;
    }>;
  };
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
  | { content: string; type: 'host-instructions' }
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

// full-tree state for one evaluator-owned related read-only mount
export interface ISemanticReadOnlyMountControlState {
  mount: string;
  treeDigest: string;
}

// independently captured before-and-after state for one related read-only mount
export interface ISemanticReadOnlyMountControlEvidence {
  after: ISemanticReadOnlyMountControlState;
  before: ISemanticReadOnlyMountControlState;
  violations: Array<'mount-changed' | 'tree-changed'>;
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
  readOnlyMounts: Array<{
    source: string;
    target: string;
  }>;
  repositoryPath: string;
}) => Promise<ISemanticScenarioEvidence[]>;
export const hasValidScenarioEvidence: (
  evidence: unknown,
  caseDefinition: ISemanticCaseDefinition,
) => boolean;
export const createEvaluationTreeDigest: (root: string) => Promise<string>;
export const captureReadOnlyMountControlState: (mount: {
  source: string;
  target: string;
}) => Promise<ISemanticReadOnlyMountControlState>;
export const createReadOnlyMountControlEvidence: (
  before: ISemanticReadOnlyMountControlState,
  after: ISemanticReadOnlyMountControlState,
) => ISemanticReadOnlyMountControlEvidence;
export const hasValidReadOnlyMountControlEvidence: (evidence: unknown) => boolean;
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
