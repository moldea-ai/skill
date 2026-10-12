import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createTriageAgent } from './triage-agent.js';

test('the triage call carries its instruction and the unchanged ticket', async () => {
  const ticket = { parcelId: 'parcel-001', waitingHours: 25 };
  const result = await createTriageAgent({ respond: async (request) => request }, ticket);
  assert.equal(result.input, ticket);
  assert.match(result.instructions, /pickup code/iu);
  assert.match(result.instructions, /24 hours/iu);
});
