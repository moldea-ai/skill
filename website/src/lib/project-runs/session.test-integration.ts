// @vitest-environment node
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { afterEach, expect, test, vi } from 'vitest';

import { loadProjectSession, parseProjectSession } from './session.ts';

const events = [
  {
    ordinal: 0,
    timestamp: '2026-09-28T02:24:24.703Z',
    kind: 'session',
    payload: { sessionId: 'session-1', hostVersion: '0.157.1' },
    redactionIds: [],
  },
  {
    ordinal: 2,
    timestamp: '2026-09-28T02:24:25.703Z',
    kind: 'message',
    payload: { role: 'user', content: [{ type: 'input_text', text: 'Please check the context.' }] },
    redactionIds: [],
  },
  {
    ordinal: 5,
    timestamp: '2026-09-28T02:24:26.703Z',
    kind: 'tool-call',
    payload: { name: 'exec', callId: 'call-1', input: 'read project.md', status: 'completed' },
    redactionIds: [],
  },
  {
    ordinal: 7,
    timestamp: '2026-09-28T02:24:27.703Z',
    kind: 'tool-result',
    payload: {
      callId: 'call-1',
      output: [
        { type: 'input_text', text: 'Project policy' },
        { type: 'input_text', text: '[redacted]' },
      ],
    },
    redactionIds: ['redaction-1'],
  },
  {
    ordinal: 9,
    timestamp: '2026-09-28T02:24:28.703Z',
    kind: 'message',
    payload: {
      role: 'assistant',
      content: [{ type: 'output_text', text: 'I checked the policy.' }],
    },
    redactionIds: [],
  },
] as const;
const compressed = gzipSync(events.map((event) => JSON.stringify(event)).join('\n') + '\n');
const asset = {
  kind: 'session',
  tag: 'run-20260928-02',
  name: 'session.jsonl.gz',
  sizeBytes: compressed.byteLength,
  sha256: createHash('sha256').update(compressed).digest('hex'),
  mediaType: 'application/jsonl+gzip',
  sessionId: 'session-1',
  firstEventOrdinal: 0,
  lastEventOrdinal: 9,
};

afterEach(() => vi.unstubAllGlobals());

test('preserves messages and joins each adjacent tool call with its complete result', () => {
  const entries = parseProjectSession(compressed);
  expect(entries).toHaveLength(4);
  expect(entries.map(({ kind }) => kind)).toStrictEqual(['session', 'message', 'tool', 'message']);
  expect(entries[2]).toMatchObject({
    ordinal: 5,
    lastOrdinal: 7,
    content: 'read project.md',
    output: 'Project policy\n\n[redacted]',
    isRedacted: true,
  });
});

test('preserves compaction context without claiming the encrypted summary was captured', () => {
  const entries = parseProjectSession(
    gzipSync(
      [
        events[0],
        {
          ordinal: 1,
          timestamp: '2026-09-28T02:24:25.000Z',
          kind: 'compaction',
          payload: {
            message: 'The host compacted its context.',
            replacementHistory: [
              {
                role: 'user',
                content: [
                  { type: 'input_text', text: 'Keep the customer timezone.' },
                  { type: '[redacted]', text: '[redacted]' },
                ],
              },
            ],
            retainedUserMessages: [
              {
                order: 3,
                turnId: 'turn-1',
                messageId: 'message-1',
                text: 'Keep the customer timezone.',
                complete: false,
              },
            ],
            encryptedSummaryOmitted: true,
          },
          redactionIds: [],
        },
      ]
        .map((event) => JSON.stringify(event))
        .join('\n'),
    ),
  );
  expect(entries[1]).toMatchObject({
    kind: 'compaction',
    title: 'Context compacted',
    content: 'Encrypted summary omitted from this recording.',
    compaction: {
      message: 'The host compacted its context.',
      replacementHistory: [{ role: 'user', content: 'Keep the customer timezone.\n\n[redacted]' }],
      retainedUserMessages: [{ order: 3, text: 'Keep the customer timezone.', complete: false }],
      encryptedSummaryOmitted: true,
    },
  });
});

test('keeps empty and literal-marker messages distinct from applied redactions', () => {
  const entries = parseProjectSession(
    gzipSync(
      [
        events[0],
        {
          ordinal: 1,
          timestamp: '2026-09-28T02:24:25.000Z',
          kind: 'message',
          payload: { role: 'user', content: [] },
          redactionIds: [],
        },
        {
          ordinal: 2,
          timestamp: '2026-09-28T02:24:26.000Z',
          kind: 'message',
          payload: { role: 'assistant', content: [{ type: 'output_text', text: '[redacted]' }] },
          redactionIds: [],
        },
      ]
        .map((event) => JSON.stringify(event))
        .join('\n'),
    ),
  );
  expect(entries[1]).toMatchObject({ content: '', isRedacted: false });
  expect(entries[2]).toMatchObject({ content: '[redacted]', isRedacted: false });
});

test('accepts explicitly redacted host message metadata without exposing it as a developer message', () => {
  const entries = parseProjectSession(
    gzipSync(
      [
        events[0],
        {
          ordinal: 1,
          timestamp: '2026-09-28T02:24:25.000Z',
          kind: 'message',
          payload: {
            role: '[redacted]',
            content: [{ type: '[redacted]', text: '[redacted]' }],
          },
          redactionIds: ['host-context'],
        },
      ]
        .map((event) => JSON.stringify(event))
        .join('\n'),
    ),
  );
  expect(entries[1]).toMatchObject({
    kind: 'message',
    title: 'Host context',
    content: '[redacted]',
    isRedacted: true,
  });
  expect(entries[1]?.role).toBeUndefined();
});

test('surfaces attempted patch targets without treating ordinary tool input as a patch', () => {
  const patch = [
    ...events.slice(0, 2),
    {
      ...events[2],
      payload: {
        ...events[2].payload,
        input:
          'const patch = "*** Begin Patch\\n*** Add File: moldea/project.md\\n*** Update File: src/app.ts\\n*** End Patch";',
      },
    },
    events[3],
  ];
  const entries = parseProjectSession(
    gzipSync(patch.map((event) => JSON.stringify(event)).join('\n')),
  );
  expect(entries[2]?.patchTargets).toStrictEqual([
    { action: 'Add', path: 'moldea/project.md' },
    { action: 'Update', path: 'src/app.ts' },
  ]);
  expect(parseProjectSession(compressed)[2]?.patchTargets).toStrictEqual([]);
});

test('rejects out-of-order events and tool results without their call', () => {
  const encode = (records: unknown[]): Buffer =>
    gzipSync(records.map((record) => JSON.stringify(record)).join('\n'));
  expect(() => parseProjectSession(encode([events[1], events[0]]))).toThrow(
    'ordinals must increase',
  );
  expect(() => parseProjectSession(encode([events[3]]))).toThrow('no adjacent matching call');
});

test('loads only the fixed release URL and verifies byte size and digest', async () => {
  const url =
    'https://github.com/jesusgraterol/moldea-mock-project-public/releases/download/run-20260928-02/session.jsonl.gz';
  const fetchMock = vi.fn((input: string, init: RequestInit) => {
    expect(input).toBe(url);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    return Promise.resolve(new Response(compressed));
  });
  vi.stubGlobal('fetch', fetchMock);
  expect(await loadProjectSession([asset])).toHaveLength(4);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  await expect(loadProjectSession([{ ...asset, sha256: '0'.repeat(64) }])).rejects.toThrow(
    'digest differs',
  );
  await expect(
    loadProjectSession([{ ...asset, sizeBytes: compressed.byteLength - 1 }]),
  ).rejects.toThrow('exceeds its recorded size');
  await expect(loadProjectSession([{ ...asset, sessionId: 'another-session' }])).rejects.toThrow(
    'identity differs',
  );
  await expect(loadProjectSession([{ ...asset, lastEventOrdinal: 10 }])).rejects.toThrow(
    'identity differs',
  );
});

test('keeps optional historical sessions without integrity metadata unavailable', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  expect(
    await loadProjectSession([{ kind: 'session', tag: asset.tag, name: asset.name }]),
  ).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
