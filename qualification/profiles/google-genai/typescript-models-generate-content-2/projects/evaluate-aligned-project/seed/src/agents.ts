import { GoogleGenAI } from '@google/genai';

import { loadSummaryInstruction, loadSupportInstruction } from './instructions.js';
import { findOrderDeclaration } from './tools.js';

const client = new GoogleGenAI({});

export const supportAgent = async (prompt: string) =>
  client.models.generateContent({
    contents: prompt,
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: await loadSupportInstruction(),
      tools: [{ functionDeclarations: [findOrderDeclaration] }],
    },
  });

export const summaryAgent = async (prompt: string) =>
  client.models.generateContent({
    contents: prompt,
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: await loadSummaryInstruction(),
    },
  });
