export const RUNTIME_COMPOSITION = {
  approvalPolicy: 'deployment-owned',
  checkpointer: 'deployment-owned',
  interruptSafety: 'workflow-owned',
  replayDeterminism: 'workflow-owned',
  taskIdempotency: 'workflow-owned',
} as const;
