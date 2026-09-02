import { readFile } from 'node:fs/promises';

import { generateText, Output } from 'ai';
import { z } from 'zod';

export const SupportOutputSchema = z.object({ answer: z.string() });
export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

export const supportAssistant = async (prompt: string) =>
  generateText({
    model: 'openai/gpt-5',
    prompt,
    instructions: await loadSupportInstruction(),
    output: Output.object({ schema: SupportOutputSchema }),
  });
