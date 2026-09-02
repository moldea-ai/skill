import { defineAgent } from 'eve';

import { SupportOutputSchema } from './contracts.js';

const MODEL = 'provider/model';

export default defineAgent({
  description: 'Answers support questions from available evidence.',
  model: MODEL,
  outputSchema: SupportOutputSchema,
});
