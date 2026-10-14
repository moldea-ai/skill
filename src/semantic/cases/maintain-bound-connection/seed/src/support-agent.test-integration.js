import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createSupportAgent } from './support-agent.js';

test('support agent consumes canonical instruction', () => {
  const canonical = readFileSync(
    new URL('../moldea/agents/support-agent/instruction.md', import.meta.url),
    'utf8',
  );
  assert.equal(
    createSupportAgent({ createAgent: (configuration) => configuration }).instruction,
    canonical,
  );
});
