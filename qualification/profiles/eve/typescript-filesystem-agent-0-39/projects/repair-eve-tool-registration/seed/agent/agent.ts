import { defineAgent } from 'eve';

import { SupportOutputSchema } from './contracts.js';

export default defineAgent({
  description: 'Answers support questions and finds orders when needed.',
  model: 'provider/model',
  outputSchema: SupportOutputSchema,
});
