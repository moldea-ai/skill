import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createSupportAgent } from './support-agent.js';

test('support agent sends canonical instruction and registered tools', () => {
  const canonical = readFileSync(
    new URL('../moldea/agents/support-agent/instruction.md', import.meta.url),
    'utf8',
  );
  const agent = createSupportAgent({ createAgent: (configuration) => configuration });
  assert.equal(agent.instruction, canonical);
  assert.deepEqual(
    agent.tools.map(({ name }) => name),
    ['lookup_order'],
  );
});
