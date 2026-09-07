export interface ISemanticCriterion {
  criterion: string;
  label: string;
}

// deterministic public model-prose contract
export interface ISemanticProductNameAssessment {
  forbidden: string[];
  isPassed: boolean;
  observed: string[];
  rationale: string;
}

export const INCORRECT_MOLDEA_PRODUCT_NAME_CASING_LABEL: string;

export const hasValidMoldeaProductNameCasing: (text: unknown) => boolean;

export const enforceMoldeaProductNameCasing: (
  assessment: ISemanticProductNameAssessment,
  actorResponse: unknown,
) => ISemanticProductNameAssessment;

// release identity required to recognize safe moldea CLI envelopes
export interface ISemanticActorExecutionEvidenceOptions {
  cliVersion: string;
  jsonSchemaVersion: number;
}

// evaluator-owned facts that may be derived from complete recognized command output
export type ISemanticActorExecutionOutputFact =
  | {
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
    }
  | {
      cancelledCount: 0;
      failedCount: 0;
      kind: 'node-test-summary';
      passedCount: number;
      skippedCount: 0;
      status: 'passed';
      testCount: number;
      testKind: 'correctness' | 'e2e' | 'integration' | 'unit';
      todoCount: 0;
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
  activation: 'abstain' | 'blocked' | 'direct' | 'informational' | 'relationship';
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
    }
  | { kind: 'host-instructions' }
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
  resourceBudget: IMoldeaResourceBudget;
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

export type ISemanticDispositionValue =
  | 'restored-bounded-blocker'
  | 'restored-explicit'
  | 'restored-relationship'
  | 'retained-current'
  | 'rewritten-abstention';

export interface ISemanticDispositions {
  activeSemanticCaseCount: 74;
  cases: Array<{
    activeId: string;
    disposition: ISemanticDispositionValue;
    formerId: string;
    rationale: string;
  }>;
  schemaVersion: 1;
  source: {
    ref: 'v4.0.2';
    semanticCaseCount: 57;
  };
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
    }
  | {
      content: string | null;
      mode: number;
      mount: string;
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

export interface ISemanticReadOnlyMountControlState {
  mount: string;
  treeDigest: string;
}

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
export const validateSemanticDispositions: <T extends ISemanticDispositions>(
  dispositions: T,
  activeCaseDefinitions: ISemanticCaseDefinition[],
) => T;
export const collectScenarioEvidence: (options: {
  caseDefinition: ISemanticCaseDefinition;
  readOnlyMounts?: Array<{ source: string; target: string }>;
  repositoryPath: string;
}) => Promise<ISemanticScenarioEvidence[]>;
export const hasValidScenarioEvidence: (
  evidence: unknown,
  caseDefinition: ISemanticCaseDefinition,
) => boolean;
export interface ISemanticSkillArtifactEvidence {
  directories: string[];
  excludedDirectoryCount: number;
  files: Array<{
    content: string | null;
    mode: number;
    omission: 'file-too-large' | 'non-utf8' | 'symlink' | null;
    path: string;
    sha256: string | null;
  }>;
  isTraversalTruncated: boolean;
  resourceReferences: Array<{
    isSafe: boolean;
    reference: string;
    resolvedPath: string;
    type: 'directory' | 'file' | 'missing' | 'symlink' | 'unsafe';
  }>;
  role: 'authoritative-source' | 'distributed-copy' | 'installed-copy';
  root: string;
  rootType: 'directory' | 'file' | 'missing' | 'symlink';
  truncatedDirectoryCount: number;
  truncatedFileCount: number;
  truncatedResourceReferenceCount: number;
  validation: {
    description: string | null;
    errors: string[];
    name: string | null;
    valid: boolean;
  };
}
export const validateSkillEvidenceConfiguration: (
  caseDefinition: ISemanticCaseDefinition,
) => NonNullable<ISemanticCaseDefinition['skillEvidence']>;
export const validateSkillDocument: (
  content: string,
  directoryName: string,
) => ISemanticSkillArtifactEvidence['validation'];
export const collectSkillArtifactEvidence: (
  repositoryPath: string,
  caseDefinition: ISemanticCaseDefinition,
) => Promise<ISemanticSkillArtifactEvidence[]>;
export const hasValidSkillArtifactEvidence: (
  evidence: unknown,
  caseDefinition: ISemanticCaseDefinition,
) => boolean;
export interface ISemanticStageIdentity {
  contract: Record<string, unknown>;
  sha256: string;
}
export interface ISemanticStageTrialIdentity {
  caseId: string;
  confirmationIndex: 1 | 2 | null;
  kind: 'confirmation' | 'initial';
}
export interface ISemanticStageReuseRecord {
  identitySha256: string;
  origin: 'reused';
  schemaVersion: 1;
  source: {
    attemptId: string;
    commit: string;
    evidencePath: string;
    evidenceSha256: string;
    trial: ISemanticStageTrialIdentity;
  };
  stage: 'actor' | 'judge';
}
export const createSemanticStageValueDigest: (value: unknown) => string;
export const createSemanticActorStageIdentity: (options: {
  actorHost: Record<string, unknown>;
  actorPrompt: string;
  artifactDigest: string;
  caseDefinitionDigest: string;
  cli: Record<string, unknown>;
  evaluationProtocolVersion: number;
  readOnlyMountControlEvidence: ISemanticReadOnlyMountControlEvidence[];
  repositoryControlBefore: Record<string, unknown>;
  resourceProfileDigest: string;
  scenarioEvidence: unknown[];
}) => ISemanticStageIdentity;
export const createSemanticJudgeStageIdentity: (options: {
  actorEvidence: Record<string, unknown>;
  actorIdentitySha256: string;
  caseDefinitionDigest: string;
  evaluationProtocolVersion: number;
  judgeHost: Record<string, unknown>;
  judgePrompt: string;
}) => ISemanticStageIdentity;
export const createSemanticStageReuseRecord: (options: {
  identitySha256: string;
  sourceAttemptId: string;
  sourceCommit: string;
  sourceEvidencePath: string;
  sourceEvidenceSha256: string;
  stage: 'actor' | 'judge';
  trial: ISemanticStageTrialIdentity;
}) => ISemanticStageReuseRecord;
export const hasValidSemanticStageReuseRecord: (
  record: unknown,
  expected: {
    identitySha256: string;
    sourceAttemptId?: string;
    sourceCommit?: string;
    sourceEvidencePath?: string;
    sourceEvidenceSha256?: string;
    stage: 'actor' | 'judge';
    trial: ISemanticStageTrialIdentity;
  },
) => boolean;
export const selectSemanticStageReuse: (
  candidates: ISemanticStageReuseRecord[],
  expected: {
    identitySha256: string;
    sourceAttemptId?: string;
    sourceCommit?: string;
    sourceEvidencePath?: string;
    sourceEvidenceSha256?: string;
    stage: 'actor' | 'judge';
    trial: ISemanticStageTrialIdentity;
  },
) => ISemanticStageReuseRecord | null;
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
