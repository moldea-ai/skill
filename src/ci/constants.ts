// only these website directories have no root or qualification consumers
export const PRESENTATION_DIRECTORIES = [
  'website/src/components/',
  'website/src/layouts/',
  'website/src/pages/',
  'website/src/styles/',
  'website/public/',
] as const;

// scenario partitions preserve serial execution within each isolated runner
export const EXECUTOR_TAGS = [
  'ci-executor-1',
  'ci-executor-2',
  'ci-executor-3',
  'ci-executor-4',
] as const;

export const EXECUTOR_TEST_FILE = 'src/execution/executor.test-integration.ts';
