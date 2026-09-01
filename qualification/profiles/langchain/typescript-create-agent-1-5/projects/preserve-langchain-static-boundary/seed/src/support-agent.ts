import { createAgent, createMiddleware, providerStrategy } from 'langchain';

import { SupportOutputSchema } from './contracts.js';
import { loadSupportInstruction } from './instructions.js';
import { supportStatusTool } from './status-tools.js';

const AUDIT_MIDDLEWARE = [createMiddleware({ name: 'audit-middleware' })];

// non-empty middleware leaves prompt, output, and tool relationships unresolved
export const supportAgent = createAgent({
  model: 'openai:gpt-4o',
  name: 'support-runtime',
  systemPrompt: await loadSupportInstruction(),
  responseFormat: providerStrategy(SupportOutputSchema),
  tools: [supportStatusTool],
  middleware: AUDIT_MIDDLEWARE,
});
