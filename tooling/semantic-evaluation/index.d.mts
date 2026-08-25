export interface ISemanticCriterion {
  criterion: string;
  label: string;
}

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
  | { mode: number; path: string; sha256: string; target: string; type: 'symlink' }
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
export const captureRepositoryControlState: (
  repositoryPath: string,
) => Promise<ISemanticRepositoryControlState>;
export const createRepositoryControlEvidence: (
  before: ISemanticRepositoryControlState,
  after: ISemanticRepositoryControlState,
) => ISemanticRepositoryControlEvidence;
export const hasValidRepositoryControlEvidence: (evidence: unknown) => boolean;
export const normalizePortableSkillSemanticEvidence: (
  relativePath: string,
  content: string,
) => string;
export const createPortableSkillDigest: (repositoryRoot?: string) => string;
export const createPortableSkillSemanticDigest: (repositoryRoot?: string) => string;
export const hasValidPortableSkillSemanticCarryForward: (
  carryForward: unknown,
  fromArtifactDigest: string,
  repositoryRoot?: string,
) => boolean;

export type {
  ISemanticAttemptCase,
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
