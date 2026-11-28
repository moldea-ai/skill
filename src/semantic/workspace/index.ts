// types
export type { ISemanticWorkspaceChanges, ISemanticWorkspaceSnapshot } from './setup.ts';

// fixture setup and workspace evidence
export {
  createActorRepository,
  createSemanticCaseSetup,
  diffSemanticWorkspaceSnapshots,
  prepareSemanticEvaluationHome,
  snapshotSemanticWorkspace,
} from './setup.ts';

// deterministic case checks
export {
  checkCaseScope,
  hasCaseLink,
  listCaseChanges,
  readCaseFile,
  readCaseImpactPaths,
  writeCaseFixture,
} from './case-fixtures.ts';
