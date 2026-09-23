// types
export type {
  IQualificationImplementation,
  IResolvedQualificationTarget,
  IRuntimeAdapterEntry,
  IRuntimeCompatibilityMatrix,
  IRuntimeCompatibilitySnapshot,
  IRuntimeTarget,
} from './types.ts';

// schemas
export {
  RUNTIME_COMPATIBILITY_SOURCE_URL,
  RuntimeCompatibilityMatrixSchema,
  RuntimeCompatibilitySnapshotSchema,
} from './types.ts';

// snapshot
export {
  ATTEMPT_COMPATIBILITY_SNAPSHOT_NAME,
  captureAttemptCompatibilitySnapshot,
  createRuntimeCompatibilitySnapshot,
  getRuntimeCompatibilityMatrix,
  readAttemptCompatibilitySnapshot,
  readRuntimeCompatibilitySnapshot,
  RUNTIME_COMPATIBILITY_SNAPSHOT_PATH,
  validateRuntimeCompatibilitySnapshot,
} from './snapshot.ts';

// refresh and validation
export { checkRuntimeCompatibilitySnapshot, updateRuntimeCompatibilitySnapshot } from './update.ts';

// matrix and profile loading
export {
  listQualificationImplementations,
  loadRuntimeCompatibilityMatrix,
  loadRuntimeCompatibilitySnapshot,
  resolveQualificationTarget,
} from './loader.ts';
