import type {
  IQualificationCaseScenario,
  IQualificationProfileCase,
  IWorkspaceFileState,
} from '../contracts/index.ts';

// one prepared Git working tree and the trusted fixture evidence needed after actor execution
export type IPreparedQualificationProject = {
  profileCase: IQualificationProfileCase;
  scenario: IQualificationCaseScenario;
  scenarioDirectory: string;
  workspaceDirectory: string;
  taskPath: string;
  baselineCommit: string;
  beforeActorFiles: IWorkspaceFileState[];
  candidateRuntimeDigest: string;
  internalDigest: string;
  skillDigest: string;
};

// exact workspace-local compiler identity used by actors and deterministic verification
export type IProjectTypeScriptInstallation = {
  executablePath: string;
  version: string;
};
