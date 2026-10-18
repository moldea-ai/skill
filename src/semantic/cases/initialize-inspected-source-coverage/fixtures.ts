// peripheral modules are known but outside the supplied registration inspection scope
export const COVERAGE_FILES: Record<string, string> = {
  'README.md': `# Support review service

Support Triage classifies supplied customer requests for human review. It cannot authorize refunds or payments. The caller supplies a Responses-style client with responses.create({ input, instructions }).

The existing agent is src/triage-agent.js, tested by src/triage-agent.test-integration.js. The support pipeline in src/support-pipeline.js connects that agent to separate input, context-selection and output modules at src/input.js, src/context-selection.js and src/output.js. The pipeline and those modules are outside this registration's inspection scope.

Run the connection test with node --test src/triage-agent.test-integration.js.
`,
  'src/triage-agent.js': `export const runTriage = (client, message) => client.responses.create({ input: message, instructions: 'Classify the supplied support request for human review. Do not authorize refunds or payments.' });
`,
  'src/triage-agent.test-integration.js': `import assert from 'node:assert/strict';
import test from 'node:test';
import { runTriage } from './triage-agent.js';

test('triage preserves supplied input and human authority', async () => {
  const calls = [];
  const client = { responses: { create: async (request) => { calls.push(request); return { id: 'triage-result' }; } } };
  assert.deepEqual(await runTriage(client, 'Track my order'), { id: 'triage-result' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, 'Track my order');
  assert.match(calls[0].instructions, /not authorize refunds or payments/i);
});
`,
  'src/input.js': 'export const normalizeInput = (text) => text.trim();\n',
  'src/context-selection.js':
    'export const selectContext = (records) => records.filter((record) => record.isCurrent);\n',
  'src/output.js':
    'export const formatOutput = (response) => ({ summary: response.output_text });\n',
  'src/support-pipeline.js': `import { normalizeInput } from './input.js';
import { selectContext } from './context-selection.js';
import { formatOutput } from './output.js';
import { runTriage } from './triage-agent.js';

export const runSupportPipeline = async (client, message, records) => formatOutput(await runTriage(client, { message: normalizeInput(message), context: selectContext(records) }));
`,
};
