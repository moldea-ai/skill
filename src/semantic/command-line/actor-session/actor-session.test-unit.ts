// @vitest-environment node
import { expect, test } from 'vitest';
import { readSemanticActorSessionId } from './actor-session.ts';

test('accepts only one exact host session UUID', () => {
  const event = JSON.stringify({
    type: 'thread.started',
    thread_id: '12345678-abcd-1234-abcd-123456789012',
  });
  expect(readSemanticActorSessionId(event)).toBe('12345678-abcd-1234-abcd-123456789012');
  for (const output of [
    event + '\n' + event,
    '{}',
    JSON.stringify({ type: 'thread.started', thread_id: '--last' }),
    JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: event } }),
  ]) {
    expect(() => readSemanticActorSessionId(output)).toThrow();
  }
});
