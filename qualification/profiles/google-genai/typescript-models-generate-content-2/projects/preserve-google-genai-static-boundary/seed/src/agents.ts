import { readFile } from 'node:fs/promises';

import { GoogleGenAI } from '@google/genai';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

const client = new GoogleGenAI({});

const providerGoogleSearchTool = {
  googleSearch: {},
} as const;

export const supportAgent = async (prompt: string) =>
  client.models.generateContent({
    contents: prompt,
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: await loadSupportInstruction(),
      tools: [providerGoogleSearchTool],
    },
  });

export const dynamicSupportAgent = (prompt: string) => {
  const request = {
    contents: prompt,
    model: 'gemini-2.5-flash',
  };

  return client.models.generateContent(request);
};
