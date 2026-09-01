import OpenAI from 'openai';

import { loadSummaryInstruction, loadSupportInstruction } from './instructions.js';
import { findOrderTool } from './tools.js';

const client = new OpenAI();

export const supportAgent = async (prompt: string) =>
  client.responses.create({
    input: prompt,
    model: 'gpt-5',
    instructions: await loadSupportInstruction(),
    tools: [findOrderTool],
  });

export const summaryAgent = async (prompt: string) =>
  client.responses.create({
    input: prompt,
    model: 'gpt-5',
    instructions: await loadSummaryInstruction(),
  });
