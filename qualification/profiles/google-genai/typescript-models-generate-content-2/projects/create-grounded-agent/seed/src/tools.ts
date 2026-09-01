import { ClassifyOrderInputSchema } from './contracts.js';

export const classifyOrderDeclaration = {
  name: 'classify_order',
  description: 'Classifies an order for human review.',
  parametersJsonSchema: ClassifyOrderInputSchema,
} as const;
