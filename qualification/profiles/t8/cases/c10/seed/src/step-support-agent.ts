import { createAgent } from 'langchain';

import {
  EscalationOutputSchema,
  SupportContextSchema,
  SupportOutputSchema,
  SupportStateSchema,
} from './contracts.js';
import { loadStepSupportInstruction } from './instructions.js';
import { stepSupportStatusTool } from './status-tools.js';

// unsupported schemas and collections remain valid runtime configuration without canonical bindings
export const stepSupportAgent = createAgent({
  model: 'openai:gpt-4o',
  name: 'step-support-runtime',
  systemPrompt: await loadStepSupportInstruction(),
  responseFormat: [SupportOutputSchema, EscalationOutputSchema],
  stateSchema: SupportStateSchema,
  contextSchema: SupportContextSchema,
  tools: [stepSupportStatusTool],
});
