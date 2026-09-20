// types
export type {
  IEvaluationBatchFailure,
  IEvaluationBatchItem,
  IEvaluationBatchOptions,
  IEvaluationBatchWorkerCount,
  IEvaluationTemporaryStorageGuardOptions,
} from './types.ts';

// constants
export {
  EVALUATION_BATCH_DEFAULT_WORKER_COUNT,
  EVALUATION_BATCH_MAXIMUM_TEMPORARY_BYTE_COUNT,
  EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT,
  EVALUATION_BATCH_WORKER_COUNTS,
  EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT,
} from './constants.ts';

// coordination
export { runOrderedEvaluationBatch } from './coordinator.ts';

// resources
export {
  assertEvaluationWorkerTemporaryStorage,
  createEvaluationBatchDiskReservation,
  getEvaluationTemporaryByteCount,
  runWithEvaluationTemporaryStorageGuard,
} from './resources.ts';
