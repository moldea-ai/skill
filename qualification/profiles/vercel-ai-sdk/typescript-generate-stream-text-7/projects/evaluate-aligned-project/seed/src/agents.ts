import { generateText, Output, streamText } from 'ai';

import { SummaryOutputSchema, SupportOutputSchema } from './contracts.js';
import { loadSummaryInstruction, loadSupportInstruction } from './instructions.js';
import { findOrderTool } from './tools.js';

export const supportAgent = async (prompt: string) =>
  generateText({
    model: 'openai/gpt-5',
    prompt,
    instructions: await loadSupportInstruction(),
    output: Output.object({ schema: SupportOutputSchema }),
    tools: { find_order: findOrderTool },
  });

export const summaryAgent = async (prompt: string) =>
  streamText({
    model: 'openai/gpt-5',
    prompt,
    system: await loadSummaryInstruction(),
    output: Output.object({ schema: SummaryOutputSchema }),
  });
