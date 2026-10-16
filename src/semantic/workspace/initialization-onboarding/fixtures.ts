// project evidence is deliberately outside moldea; initialization must link rather than relocate it
export const ONBOARDING_FILES: Record<string, string> = {
  'README.md': `# Operations review service

This service helps Customer Operations classify support requests and review invoice data for accounting staff. Humans authorize refunds and payments; the service only supplies review information.

The Support Triage agent is implemented in [src/support-agent.js](src/support-agent.js). The invoice review model workflow is implemented inline in [src/invoice-workflow.js](src/invoice-workflow.js). Both use the project's injected Responses-style client contract; no provider SDK is selected by this repository.

Current authorities:
- [Architecture](docs/architecture.md)
- [Operations policy](docs/operations-policy.md)
- [Accepted human-approval decision](docs/decisions/001-human-approval.md)
- [Release review Agent Skill](skills/release-review/SKILL.md)

Run the integration checks directly with Node: node --test src/support-agent.test-integration.js src/invoice-workflow.test-integration.js.
`,
  'docs/architecture.md': `# Architecture

Support Triage classifies customer requests through two Responses-style calls. Invoice Review extracts invoice data through one call. The caller supplies the client; each invocation returns its response without moving money. Keep these two responsibilities separate.
`,
  'docs/operations-policy.md': `# Operations policy

Support review must not invent order details or promise a refund. Invoice review extracts supplied data without authorizing a payment. Customer Operations owns the review process; a human retains every financial decision.
`,
  'docs/decisions/001-human-approval.md': `# Human approval

Status: Accepted and active.

Model outputs assist Customer Operations and accounting staff. Refund and payment authorization remains with a human. This decision governs both model responsibilities.
`,
  'skills/release-review/SKILL.md': `---
name: release-review
description: Review a proposed release for supported claims and verified local checks.
---

# Release review

Review the supplied release proposal read-only. Identify unsupported claims and missing verification without publishing a release.
`,
  'src/support-agent.js': `const SUPPORT_INSTRUCTION = 'Classify the support request. Do not invent order details or promise a refund.';

export const runSupportAgent = async (client, message) => {
  const response = await client.responses.create({ input: message, instructions: SUPPORT_INSTRUCTION });
  return client.responses.create({ input: 'Review the classification for human follow-up.', instructions: SUPPORT_INSTRUCTION, previous_response_id: response.id });
};
`,
  'src/invoice-workflow.js': `export const reviewInvoice = (client, invoiceText) =>
  client.responses.create({ input: invoiceText, instructions: 'Extract the supplied invoice data for accounting review. Do not authorize a payment.' });
`,
  'src/support-agent.test-integration.js': `import assert from 'node:assert/strict';
import test from 'node:test';
import { runSupportAgent } from './support-agent.js';

test('support preserves both review calls and human authority', async () => {
  const requests = [];
  const client = { responses: { create: async (request) => {
    requests.push(request);
    return { id: 'response-' + requests.length };
  } } };
  const result = await runSupportAgent(client, 'Where is my order?');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].input, 'Where is my order?');
  assert.equal(requests[1].previous_response_id, 'response-1');
  assert.equal(requests[0].instructions, requests[1].instructions);
  assert.match(requests[0].instructions, /not invent order details/i);
  assert.match(requests[0].instructions, /not.*promise.*refund/i);
  assert.equal(result.id, 'response-2');
});
`,
  'src/invoice-workflow.test-integration.js': `import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewInvoice } from './invoice-workflow.js';

test('invoice review preserves extraction and human payment authority', async () => {
  const requests = [];
  const client = { responses: { create: async (request) => { requests.push(request); return { id: 'invoice-response' }; } } };
  const result = await reviewInvoice(client, 'Invoice total: 25 units.');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].input, 'Invoice total: 25 units.');
  assert.match(requests[0].instructions, /extract.*invoice/i);
  assert.match(requests[0].instructions, /not authorize.*payment/i);
  assert.equal(result.id, 'invoice-response');
});
`,
};

// one completed registration is real and consumable before the continuation starts
export const COMPLETED_SUPPORT_FILES: Record<string, string> = {
  'moldea/agents/support-triage/description.md':
    'Classifies customer support requests for human follow-up.\n',
  'moldea/agents/support-triage/instruction.md':
    'You are the `support-triage` agent. Classify the support request for Customer Operations. Do not invent order details or promise a refund. Humans retain refund authorization.\n',
  'moldea/runtimes/custom.md':
    '# Project Responses client\n\nThe caller supplies a client whose responses.create method accepts input, instructions, and optional previous_response_id and returns a response with an id. Support performs two calls; invoice review performs one. Support reads its canonical instruction from its repository file before both invocations. This is a project-defined contract, not provider certification.\n',
  'src/support-agent.js': `import { readFileSync } from 'node:fs';

export const loadSupportInstruction = () => readFileSync(new URL('../moldea/agents/support-triage/instruction.md', import.meta.url), 'utf8');

export const runSupportAgent = async (client, message) => {
  const instructions = loadSupportInstruction();
  const response = await client.responses.create({ input: message, instructions });
  return client.responses.create({ input: 'Review the classification for human follow-up.', instructions, previous_response_id: response.id });
};
`,
  'src/support-agent.test-integration.js': `import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runSupportAgent } from './support-agent.js';

test('support consumes its canonical instruction in both calls', async () => {
  const requests = [];
  const client = { responses: { create: async (request) => { requests.push(request); return { id: 'response-' + requests.length }; } } };
  const result = await runSupportAgent(client, 'Where is my order?');
  const canonical = readFileSync(new URL('../moldea/agents/support-triage/instruction.md', import.meta.url), 'utf8');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].input, 'Where is my order?');
  assert.equal(requests[1].previous_response_id, 'response-1');
  assert.equal(requests[0].instructions, canonical);
  assert.equal(requests[1].instructions, canonical);
  assert.match(requests[0].instructions, /not invent order details/i);
  assert.match(requests[0].instructions, /not.*promise.*refund/i);
  assert.equal(result.id, 'response-2');
});
`,
};
