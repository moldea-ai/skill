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
export { RuntimeCompatibilityMatrixSchema } from './types.ts';

// matrix and profile loading
export {
  listQualificationImplementations,
  loadRuntimeCompatibilityMatrix,
  loadRuntimeCompatibilitySnapshot,
  resolveQualificationTarget,
} from './loader.ts';
