import type { EVALUATION_BATCH_WORKER_COUNTS } from './constants.ts';

/** Supported bounded concurrency levels for evaluation workers. */
export type IEvaluationBatchWorkerCount = (typeof EVALUATION_BATCH_WORKER_COUNTS)[number];

/** One completed evaluation item ready for ordered persistence. */
export type IEvaluationBatchItem<TItem, TValue> = {
  index: number;
  item: TItem;
  value: TValue;
};

/** The first execution or persistence failure that stops an evaluation batch. */
export type IEvaluationBatchFailure<TItem> = {
  error: unknown;
  index: number;
  item: TItem;
};

/** Callbacks and inputs required by the ordered evaluation coordinator. */
export type IEvaluationBatchOptions<TItem, TValue> = {
  commitItem: (completed: IEvaluationBatchItem<TItem, TValue>) => Promise<void> | void;
  executeItem: (item: { index: number; item: TItem }) => Promise<TValue>;
  items: TItem[];
  onItemError?: (failure: IEvaluationBatchFailure<TItem>) => Promise<void> | void;
  workerCount: IEvaluationBatchWorkerCount;
};

/** Options controlling temporary-storage checks around a model boundary. */
export type IEvaluationTemporaryStorageGuardOptions = {
  inspectAvailableByteCount?: (root: string) => Promise<bigint>;
  maximumByteCount?: number;
  minimumFreeByteCount?: number;
  pollIntervalMs?: number;
};
