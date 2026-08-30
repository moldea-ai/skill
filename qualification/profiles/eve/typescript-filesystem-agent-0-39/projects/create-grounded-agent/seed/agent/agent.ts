import { defineAgent } from 'eve';

import { OrderTriageOutputSchema } from './contracts.js';

export default defineAgent({
  description: 'Classifies orders for human review without approving refunds.',
  model: 'provider/model',
  outputSchema: OrderTriageOutputSchema,
});
