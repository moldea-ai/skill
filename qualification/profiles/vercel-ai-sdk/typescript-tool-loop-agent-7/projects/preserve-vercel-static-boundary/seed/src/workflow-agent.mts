import { WorkflowAgent } from '@ai-sdk/workflow';

// real negative control that remains outside the ToolLoopAgent target
export const workflowSupportAgent = new WorkflowAgent({
  model: 'openai/gpt-5',
  instructions: 'Handle durable support work inside the workflow runtime.',
});
