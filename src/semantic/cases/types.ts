export type ISemanticCriterion = {
  criterion: string;
  label: string;
};

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
  | { fact: ISemanticGitStateFact; kind: 'git-state' }
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

export type ISemanticRepositoryEvidenceDeclaration = {
  claim: string;
  source: ISemanticRepositoryEvidenceSource;
};

export type IMoldeaResourceBudget = {
  activation: 'abstain' | 'blocked' | 'direct' | 'informational' | 'relationship';
  maximumMoldeaCommands: number;
  maximumMoldeaOutputBytes: number;
  minimumMoldeaCommands: number;
};

export type ISemanticCaseDefinition = {
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
    activationScenarios: Array<{ request: string; shouldActivate: boolean }>;
    artifacts: Array<{
      role: 'authoritative-source' | 'distributed-copy' | 'installed-copy';
      root: string;
    }>;
  };
};

export type ISemanticCaseSetupContext = {
  actorToolDirectory: string;
  repositoryPath: string;
  sandboxHome: string;
};

export type ISemanticCaseSetupResult = {
  afterBaseline?: () => Promise<void>;
  readOnlyToolMounts?: Array<{ source: string; target: string }>;
};

export type ISemanticCaseSetup = (
  context: ISemanticCaseSetupContext,
) => Promise<ISemanticCaseSetupResult | void>;

export type ISemanticCase = ISemanticCaseDefinition & {
  coverageClaimIds: string[];
  setup?: ISemanticCaseSetup;
};
