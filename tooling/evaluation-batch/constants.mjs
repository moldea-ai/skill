// worker counts supported by paid evaluation coordinators
export const EVALUATION_BATCH_WORKER_COUNTS = [1, 2, 4];
export const EVALUATION_BATCH_DEFAULT_WORKER_COUNT = 4;

// evaluator-owned temporary storage reservations
export const EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT = 1_073_741_824;
export const EVALUATION_BATCH_MAXIMUM_TEMPORARY_BYTE_COUNT = 4_294_967_296;
export const EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT = 2_147_483_648;
