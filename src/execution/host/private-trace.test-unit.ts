import { expect, test } from 'vitest';

import { sanitizePrivateTraceEvent } from './private-trace.ts';

test('preserves additive metadata, grouping and every usage number while removing bodies', () => {
  expect(
    sanitizePrivateTraceEvent({
      type: 'item.completed',
      id: 'event-1',
      round_id: 'round-2',
      future: { batch: 4 },
      item: {
        id: 'command-1',
        type: 'command_execution',
        command: 'cat source.js',
        aggregated_output: 'private output',
      },
      usage: { input_tokens: 100, cached_input_tokens: 80, output_tokens: 4, reasoning_tokens: 2 },
      reasoning: { text: 'private thoughts', tokens: 2 },
    }),
  ).toStrictEqual({
    type: 'item.completed',
    id: 'event-1',
    round_id: 'round-2',
    future: { batch: 4 },
    item: {
      id: 'command-1',
      type: 'command_execution',
      command: 'cat source.js',
      moldeaPrivateOutputByteCounts: { aggregated_output: 14 },
    },
    usage: { input_tokens: 100, cached_input_tokens: 80, output_tokens: 4, reasoning_tokens: 2 },
    reasoning: { text: '[omitted]', tokens: 2 },
    moldeaPrivateRedacted: true,
  });
});

test('redacts credentials in commands, messages, errors and sensitive nested fields', () => {
  const source = {
    type: 'error',
    message: 'Bearer abcdefghijklmnop',
    item: { command: 'echo Basic dXNlcjpwYXNzd29yZA==', password: 'never-store-this' },
    error: { text: 'npm_abcdefghijklmnopqrstuvwxyz', access_token: 'another-secret' },
    env: { unrelated: 'environment dump' },
  };
  const text = JSON.stringify(sanitizePrivateTraceEvent(source));
  for (const secret of [
    'abcdefghijklmnop',
    'dXNlcjpwYXNzd29yZA==',
    'never-store-this',
    'npm_abcdefghijklmnopqrstuvwxyz',
    'another-secret',
    'environment dump',
  ]) {
    expect(text).not.toContain(secret);
  }
  expect(source.item.password).toBe('never-store-this');
  expect(text).toContain('redacted');
});

test('reasoning event keeps its discriminator and ID while removing summary text', () => {
  expect(
    sanitizePrivateTraceEvent({
      type: 'reasoning',
      id: 'reason-1',
      summary: ['thoughts'],
      usage: { tokens: 2 },
    }),
  ).toStrictEqual({
    type: 'reasoning',
    id: 'reason-1',
    summary: ['[omitted]'],
    usage: { tokens: 2 },
    moldeaPrivateRedacted: true,
  });
});

test('structured output retains usage metadata without output text', () => {
  expect(
    sanitizePrivateTraceEvent({
      type: 'item.completed',
      output: { text: 'private body', usage: { input_tokens: 12 } },
    }),
  ).toStrictEqual({
    type: 'item.completed',
    output: { text: '[omitted]', usage: { input_tokens: 12 } },
    moldeaPrivateRedacted: true,
  });
});

test('retains numeric usage and reasoning IDs without retaining secret fields', () => {
  expect(
    sanitizePrivateTraceEvent({
      type: 'reasoning',
      id: 'i1',
      round_id: 'r1',
      password: 1234,
      usage: { token: 12, future_count: 8 },
    }),
  ).toStrictEqual({
    type: 'reasoning',
    id: 'i1',
    round_id: 'r1',
    password: '[redacted]',
    usage: { token: 12, future_count: 8 },
    moldeaPrivateRedacted: true,
  });
});

test('retains the UTF-8 byte size of removed command output for private command correspondence', () => {
  expect(
    sanitizePrivateTraceEvent({
      type: 'item.completed',
      item: { id: 'read-1', command: 'cat file', aggregated_output: 'café' },
    }),
  ).toStrictEqual({
    type: 'item.completed',
    item: {
      id: 'read-1',
      command: 'cat file',
      moldeaPrivateOutputByteCounts: { aggregated_output: 5 },
    },
    moldeaPrivateRedacted: true,
  });
});

test.each([
  'sk-abcdefghijklmnop',
  'AKIAABCDEFGHIJKLMNOP',
  'xoxb-abcdefghijklmnop',
  '-----BEGIN PRIVATE KEY-----\nfixture-private-material\n-----END PRIVATE KEY-----',
])('redacts existing credential protection %s', (secret) => {
  expect(
    JSON.stringify(sanitizePrivateTraceEvent({ type: 'error', message: secret })),
  ).not.toContain(secret);
});
