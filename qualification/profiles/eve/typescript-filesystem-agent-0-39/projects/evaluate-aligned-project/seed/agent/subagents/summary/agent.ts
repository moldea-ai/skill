import { defineAgent } from 'eve';

import { SummaryOutputSchema } from '../../contracts.js';

export default defineAgent({
  description: 'Summarizes one support request.',
  model: 'provider/model',
  outputSchema: SummaryOutputSchema,
});
