import { gunzipSync } from 'node:zlib';

import { hashValue } from 'jg-crypto';
import { z } from 'zod';

import {
  PROJECT_RUN_MAX_FILE_BYTES,
  PROJECT_RUN_REPOSITORY,
  PROJECT_RUN_TIMEOUT_MS,
} from './constants.ts';
import type { IProjectAttemptRecord, IProjectSessionEntry } from './types.ts';

const TextPartSchema = z.object({
  type: z.enum(['input_text', 'output_text', '[redacted]']),
  text: z.string(),
});
const EventSchema = z.discriminatedUnion('kind', [
  z.object({
    ordinal: z.int().nonnegative(),
    timestamp: z.iso.datetime(),
    kind: z.literal('session'),
    payload: z.object({ sessionId: z.string(), hostVersion: z.string() }),
    redactionIds: z.array(z.string()).default([]),
  }),
  z.object({
    ordinal: z.int().nonnegative(),
    timestamp: z.iso.datetime(),
    kind: z.literal('task_started'),
    payload: z.object({ turnId: z.string() }),
    redactionIds: z.array(z.string()).default([]),
  }),
  z.object({
    ordinal: z.int().nonnegative(),
    timestamp: z.iso.datetime(),
    kind: z.literal('turn'),
    payload: z.object({ rootTurnId: z.string(), model: z.string(), effort: z.string() }),
    redactionIds: z.array(z.string()).default([]),
  }),
  z.object({
    ordinal: z.int().nonnegative(),
    timestamp: z.iso.datetime(),
    kind: z.literal('message'),
    payload: z.object({
      role: z.enum(['developer', 'user', 'assistant', '[redacted]']),
      content: z.array(TextPartSchema),
    }),
    redactionIds: z.array(z.string()).default([]),
  }),
  z.object({
    ordinal: z.int().nonnegative(),
    timestamp: z.iso.datetime(),
    kind: z.literal('tool-call'),
    payload: z.object({
      name: z.string(),
      callId: z.string(),
      input: z.string(),
      status: z.string(),
      output: z.array(TextPartSchema).optional(),
    }),
    redactionIds: z.array(z.string()).default([]),
  }),
  z.object({
    ordinal: z.int().nonnegative(),
    timestamp: z.iso.datetime(),
    kind: z.literal('tool-result'),
    payload: z.object({ callId: z.string(), output: z.array(TextPartSchema) }),
    redactionIds: z.array(z.string()).default([]),
  }),
  z.object({
    ordinal: z.int().nonnegative(),
    timestamp: z.iso.datetime(),
    kind: z.literal('task_complete'),
    payload: z.object({ turnId: z.string() }),
    redactionIds: z.array(z.string()).default([]),
  }),
  z.object({
    ordinal: z.int().nonnegative(),
    timestamp: z.iso.datetime(),
    kind: z.literal('compaction'),
    payload: z.object({
      message: z.string(),
      replacementHistory: z.array(z.object({ role: z.string(), content: z.array(TextPartSchema) })),
      retainedUserMessages: z.array(
        z.object({
          order: z.int().nonnegative(),
          turnId: z.string(),
          messageId: z.string(),
          text: z.string(),
          complete: z.boolean(),
        }),
      ),
      encryptedSummaryOmitted: z.boolean(),
    }),
    redactionIds: z.array(z.string()).default([]),
  }),
]);

const joinText = (parts: z.infer<typeof TextPartSchema>[]): string =>
  parts.map(({ text }) => text).join('\n\n');
const extractPatchTargets = (input: string): NonNullable<IProjectSessionEntry['patchTargets']> =>
  [...input.matchAll(/\*\*\* (Add|Update|Delete) File: ([^\\\r\n]+)/gu)].map((match) => ({
    action: match[1] as 'Add' | 'Update' | 'Delete',
    path: match[2]!.trim(),
  }));

/**
 * Converts recorded events into a readable sequence, pairing tools by their call identity.
 * @throws
 * - Session event ordinals must increase.
 * - Session tool result has no matching call.
 * - Session tool call ID is already awaiting a result.
 * - Session tool call has no recorded result.
 */
export const parseProjectSession = (compressed: Uint8Array): IProjectSessionEntry[] => {
  const text = gunzipSync(compressed, { maxOutputLength: PROJECT_RUN_MAX_FILE_BYTES }).toString(
    'utf8',
  );
  const events = text
    .trimEnd()
    .split('\n')
    .map((line) => EventSchema.parse(JSON.parse(line)));
  const entries: IProjectSessionEntry[] = [];
  const pendingCalls = new Map<string, IProjectSessionEntry>();
  let previousOrdinal = -1;
  for (const event of events) {
    if (event.ordinal <= previousOrdinal) throw new Error('Session event ordinals must increase.');
    previousOrdinal = event.ordinal;
    if (event.kind === 'tool-result') {
      const entry = pendingCalls.get(event.payload.callId);
      if (!entry) throw new Error('Session tool result has no matching call.');
      pendingCalls.delete(event.payload.callId);
      entry.lastOrdinal = event.ordinal;
      entry.output = joinText(event.payload.output);
      entry.isRedacted ||= event.redactionIds.length > 0;
      continue;
    }
    if (event.kind === 'tool-call') {
      if (pendingCalls.has(event.payload.callId))
        throw new Error('Session tool call ID is already awaiting a result.');
      const entry: IProjectSessionEntry = {
        ordinal: event.ordinal,
        lastOrdinal: event.ordinal,
        timestamp: event.timestamp,
        kind: 'tool',
        title: event.payload.name,
        content: event.payload.input,
        status: event.payload.status,
        ...(event.payload.output === undefined ? {} : { output: joinText(event.payload.output) }),
        patchTargets: extractPatchTargets(event.payload.input),
        isRedacted: event.redactionIds.length > 0,
      };
      entries.push(entry);
      if (event.payload.output === undefined) pendingCalls.set(event.payload.callId, entry);
      continue;
    }
    if (event.kind === 'message') {
      const isFullyRedacted =
        event.redactionIds.length > 0 &&
        event.payload.content.length > 0 &&
        event.payload.content.every(({ text }) => text === '[redacted]');
      entries.push({
        ordinal: event.ordinal,
        lastOrdinal: event.ordinal,
        timestamp: event.timestamp,
        kind: 'message',
        ...(event.payload.role === '[redacted]' ? {} : { role: event.payload.role }),
        title:
          event.payload.role === 'assistant'
            ? 'Coding agent'
            : event.payload.role === 'user'
              ? 'Developer'
              : 'Host context',
        content: isFullyRedacted ? '[redacted]' : joinText(event.payload.content),
        isRedacted: event.redactionIds.length > 0,
      });
      continue;
    }
    const title =
      event.kind === 'session'
        ? 'Session started'
        : event.kind === 'task_started'
          ? 'Task started'
          : event.kind === 'task_complete'
            ? 'Task complete'
            : event.kind === 'compaction'
              ? 'Context compacted'
              : 'Agent turn';
    const content =
      event.kind === 'session'
        ? `Host ${event.payload.hostVersion}`
        : event.kind === 'turn'
          ? `${event.payload.model} · ${event.payload.effort}`
          : event.kind === 'compaction' && event.payload.encryptedSummaryOmitted
            ? 'Encrypted summary omitted from this recording.'
            : '';
    entries.push({
      ordinal: event.ordinal,
      lastOrdinal: event.ordinal,
      timestamp: event.timestamp,
      kind: event.kind,
      title,
      content,
      ...(event.kind === 'session' ? { sessionId: event.payload.sessionId } : {}),
      ...(event.kind === 'compaction'
        ? {
            compaction: {
              message: event.payload.message,
              encryptedSummaryOmitted: event.payload.encryptedSummaryOmitted,
              replacementHistory: event.payload.replacementHistory.map(({ role, content }) => ({
                role,
                content: joinText(content),
              })),
              retainedUserMessages: event.payload.retainedUserMessages.map(
                ({ order, text, complete }) => ({ order, text, complete }),
              ),
            },
          }
        : {}),
      isRedacted: event.redactionIds.length > 0,
    });
  }
  if (entries.some((entry) => entry.kind === 'tool' && entry.output === undefined))
    throw new Error('Session tool call has no recorded result.');
  return entries;
};

/**
 * Reads a digest-checked published session asset for static generation.
 * @throws
 * - Expected one session asset per project attempt.
 * - Session asset has an unsupported media type.
 * - Session asset exceeds the project-run size limit.
 * - Session asset returned HTTP ${response.status}.
 * - Session asset exceeds its recorded size.
 * - Session asset size differs from its record.
 * - Session asset digest differs from its record.
 * - Session asset identity differs from its record.
 * - Session event ordinals must increase.
 * - Session tool result has no matching call.
 * - Session tool call ID is already awaiting a result.
 * - Session tool call has no recorded result.
 */
export const loadProjectSession = async (
  assets: IProjectAttemptRecord['assets'],
): Promise<IProjectSessionEntry[] | null> => {
  if (!Array.isArray(assets)) return null;
  const sessions = assets.filter(({ kind }) => kind === 'session');
  if (sessions.length === 0) return null;
  if (sessions.length !== 1) throw new Error('Expected one session asset per project attempt.');
  const asset = sessions[0]!;
  if (asset.sha256 === undefined || asset.sizeBytes === undefined) return null;
  if (asset.mediaType !== 'application/jsonl+gzip')
    throw new Error('Session asset has an unsupported media type.');
  if (asset.sizeBytes > PROJECT_RUN_MAX_FILE_BYTES)
    throw new Error('Session asset exceeds the project-run size limit.');
  const url = `https://github.com/${PROJECT_RUN_REPOSITORY}/releases/download/${encodeURIComponent(asset.tag)}/${encodeURIComponent(asset.name)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(PROJECT_RUN_TIMEOUT_MS) });
  if (!response.ok || response.body === null)
    throw new Error(`Session asset returned HTTP ${response.status}.`);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > asset.sizeBytes) throw new Error('Session asset exceeds its recorded size.');
    chunks.push(chunk);
  }
  if (size !== asset.sizeBytes) throw new Error('Session asset size differs from its record.');
  const bytes = Buffer.concat(chunks);
  if (hashValue(bytes) !== asset.sha256)
    throw new Error('Session asset digest differs from its record.');
  const entries = parseProjectSession(bytes);
  if (
    (asset.sessionId != null && entries[0]?.sessionId !== asset.sessionId) ||
    (asset.firstEventOrdinal != null && entries[0]?.ordinal !== asset.firstEventOrdinal) ||
    (asset.lastEventOrdinal != null &&
      entries.reduce((last, entry) => Math.max(last, entry.lastOrdinal), -1) !==
        asset.lastEventOrdinal)
  )
    throw new Error('Session asset identity differs from its record.');
  return entries;
};
