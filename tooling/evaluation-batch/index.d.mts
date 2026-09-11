export const EVALUATION_BATCH_WORKER_COUNTS: readonly [1, 2, 4];
export const EVALUATION_BATCH_DEFAULT_WORKER_COUNT: 4;
export const EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT: 2147483648;
export const EVALUATION_BATCH_MAXIMUM_TEMPORARY_BYTE_COUNT: 8589934592;
export const EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT: 2147483648;

export type IEvaluationBatchWorkerCount = (typeof EVALUATION_BATCH_WORKER_COUNTS)[number];

export type IEvaluationBatchItem<TItem, TValue> = {
  index: number;
  item: TItem;
  value: TValue;
};

export type IEvaluationBatchFailure<TItem> = {
  error: unknown;
  index: number;
  item: TItem;
};

export const runOrderedEvaluationBatch: <TItem, TValue>(options: {
  commitItem: (completed: IEvaluationBatchItem<TItem, TValue>) => Promise<void> | void;
  executeItem: (item: { index: number; item: TItem }) => Promise<TValue>;
  items: TItem[];
  onItemError?: (failure: IEvaluationBatchFailure<TItem>) => Promise<void> | void;
  workerCount: IEvaluationBatchWorkerCount;
}) => Promise<TValue[]>;

export const getEvaluationTemporaryByteCount: (root: string) => Promise<bigint>;
export const assertEvaluationWorkerTemporaryStorage: (
  root: string | readonly string[],
  maximumByteCount?: number,
) => Promise<bigint>;
export const runWithEvaluationTemporaryStorageGuard: <TResult>(
  root: string | readonly string[],
  operation: (signal: AbortSignal) => Promise<TResult>,
  options?: {
    inspectAvailableByteCount?: (root: string) => Promise<bigint>;
    maximumByteCount?: number;
    minimumFreeByteCount?: number;
    pollIntervalMs?: number;
  },
) => Promise<TResult>;
export const createEvaluationBatchDiskReservation: (
  workerCount: IEvaluationBatchWorkerCount,
  availableByteCount: bigint | number,
) => {
  availableByteCount: bigint;
  minimumFreeByteCount: number;
  remainingByteCount: bigint;
  reservedByteCount: number;
  workerCount: IEvaluationBatchWorkerCount;
};
