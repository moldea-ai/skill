import Anthropic from '@anthropic-ai/sdk';

import { loadSummaryInstruction, loadSupportInstruction } from './instructions.js';
import { findOrderTool } from './tools.js';

const client = new Anthropic();

export const supportAgent = async (prompt: string) =>
  client.messages.create({
    max_tokens: 256,
    messages: [{ content: prompt, role: 'user' }],
    model: 'claude-sonnet-4-20250514',
    system: await loadSupportInstruction(),
    tools: [findOrderTool],
  });

export const summaryAgent = async (prompt: string) =>
  client.messages.create({
    max_tokens: 128,
    messages: [{ content: prompt, role: 'user' }],
    model: 'claude-sonnet-4-20250514',
    system: await loadSummaryInstruction(),
  });
