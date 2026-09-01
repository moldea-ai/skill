import { defineAgent } from 'eve';

import { SupportOutputSchema } from './contracts.js';

export default defineAgent({
  description: 'Answers support requests.',
  model: 'provider/model',
  outputSchema: SupportOutputSchema,
});
