import { defineAgent } from 'eve';

import { SupportOutputSchema } from './contracts.js';

export default defineAgent({
  description: 'Answers support questions from available evidence.',
  model: 'provider/model',
  outputSchema: SupportOutputSchema,
});
