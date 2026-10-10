// types
export type { IChangeComparison, ICollectedTest, IQualificationPartition } from './types.ts';

// changes
export { parseChangedPaths, requiresFullConformance, classifyChanges } from './changes.ts';

// coverage
export {
  collectIntegrationTests,
  assertPartitionCoverage,
  checkQualificationCoverage,
} from './coverage.ts';
