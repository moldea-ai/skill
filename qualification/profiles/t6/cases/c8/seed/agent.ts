import { defineAgent } from 'eve';

import { SupportOutputSchema } from './contracts.js';

export default defineAgent({
  description: 'Answers support requests from available repository evidence.',
  model: 'provider/model',
  outputSchema: SupportOutputSchema,
});
