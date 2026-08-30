import { createAgent, providerStrategy } from 'langchain';

import { SupportOutputSchema } from './contracts.js';
import { delegateSupportTool } from './delegation-tool.js';
import { loadDelegatingSupportInstruction } from './instructions.js';

// normal function-tool delegation does not establish a supervisor handoff
export const delegatingSupportAgent = createAgent({
  model: 'openai:gpt-4o',
  name: 'delegating-support-runtime',
  systemPrompt: await loadDelegatingSupportInstruction(),
  responseFormat: providerStrategy(SupportOutputSchema),
  tools: [delegateSupportTool],
});
