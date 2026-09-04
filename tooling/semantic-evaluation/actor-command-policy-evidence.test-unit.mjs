import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  classifyActorCommandPolicyEvent,
  createActorCommandPolicyEvidence,
  hasValidActorCommandPolicyEvidence,
} from './actor-command-policy-evidence.mjs';

test('counts only completed top-level commands without retaining their text', () => {
  const classification = classifyActorCommandPolicyEvent({
    type: 'item.completed',
    item: { type: 'command_execution', command: 'secret command' },
  });
  assert.equal(classification, 'completed');
  assert.deepEqual(createActorCommandPolicyEvidence([classification]), {
    completedCommandCount: 1,
  });
});

test('ignores non-command events', () => {
  assert.equal(
    classifyActorCommandPolicyEvent({ type: 'item.completed', item: { type: 'agent_message' } }),
    null,
  );
});

test('rejects extra aggregate fields and excessive counts', () => {
  assert.equal(hasValidActorCommandPolicyEvidence({ completedCommandCount: 128 }), true);
  assert.equal(hasValidActorCommandPolicyEvidence({ completedCommandCount: 129 }), false);
  assert.equal(
    hasValidActorCommandPolicyEvidence({ completedCommandCount: 1, command: 'retained' }),
    false,
  );
});
