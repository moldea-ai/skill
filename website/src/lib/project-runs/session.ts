import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

import { z } from 'zod';

import {
  PROJECT_RUN_MAX_FILE_BYTES,
  PROJECT_RUN_REPOSITORY,
  PROJECT_RUN_TIMEOUT_MS,
} from './constants.ts';
import type { IProjectAttemptRecord, IProjectSessionEntry } from './types.ts';

const TextPartSchema = z.object({ type: z.enum(['input_text', 'output_text']), text: z.string() });
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
      role: z.enum(['developer', 'user', 'assistant']),
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
]);

const joinText = (parts: z.infer<typeof TextPartSchema>[]): string =>
  parts.map(({ text }) => text).join('\n\n');
const extractPatchTargets = (input: string): NonNullable<IProjectSessionEntry['patchTargets']> =>
  [...input.matchAll(/\*\*\* (Add|Update|Delete) File: ([^\\\r\n]+)/gu)].map((match) => ({
    action: match[1] as 'Add' | 'Update' | 'Delete',
    path: match[2]!.trim(),
  }));

/** Converts each recorded event into a readable sequence, joining only adjacent tool pairs. */
export const parseProjectSession = (compressed: Uint8Array): IProjectSessionEntry[] => {
  const text = gunzipSync(compressed, { maxOutputLength: PROJECT_RUN_MAX_FILE_BYTES }).toString(
    'utf8',
  );
  const events = text
    .trimEnd()
    .split('\n')
    .map((line) => EventSchema.parse(JSON.parse(line)));
  const entries: IProjectSessionEntry[] = [];
  let previousOrdinal = -1;
  for (const [index, event] of events.entries()) {
    if (event.ordinal <= previousOrdinal) throw new Error('Session event ordinals must increase.');
    previousOrdinal = event.ordinal;
    if (event.kind === 'tool-result') {
      const prior = events[index - 1];
      const entry = entries.at(-1);
      if (
        prior?.kind !== 'tool-call' ||
        prior.payload.callId !== event.payload.callId ||
        entry?.kind !== 'tool'
      )
        throw new Error('Session tool result has no adjacent matching call.');
      entry.lastOrdinal = event.ordinal;
      entry.output = joinText(event.payload.output);
      entry.isRedacted ||= event.redactionIds.length > 0;
      continue;
    }
    if (event.kind === 'tool-call') {
      entries.push({
        ordinal: event.ordinal,
        lastOrdinal: event.ordinal,
        timestamp: event.timestamp,
        kind: 'tool',
        title: event.payload.name,
        content: event.payload.input,
        status: event.payload.status,
        patchTargets: extractPatchTargets(event.payload.input),
        isRedacted: event.redactionIds.length > 0,
      });
      continue;
    }
    if (event.kind === 'message') {
      entries.push({
        ordinal: event.ordinal,
        lastOrdinal: event.ordinal,
        timestamp: event.timestamp,
        kind: 'message',
        role: event.payload.role,
        title:
          event.payload.role === 'assistant'
            ? 'Coding agent'
            : event.payload.role === 'user'
              ? 'Developer'
              : 'Host context',
        content: joinText(event.payload.content),
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
            : 'Agent turn';
    const content =
      event.kind === 'session'
        ? `Host ${event.payload.hostVersion}`
        : event.kind === 'turn'
          ? `${event.payload.model} · ${event.payload.effort}`
          : '';
    entries.push({
      ordinal: event.ordinal,
      lastOrdinal: event.ordinal,
      timestamp: event.timestamp,
      kind: event.kind,
      title,
      content,
      ...(event.kind === 'session' ? { sessionId: event.payload.sessionId } : {}),
      isRedacted: event.redactionIds.length > 0,
    });
  }
  if (entries.some((entry) => entry.kind === 'tool' && entry.output === undefined))
    throw new Error('Session tool call has no recorded result.');
  return entries;
};

/** Reads a digest-checked published session asset for static generation. */
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
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256)
    throw new Error('Session asset digest differs from its record.');
  const entries = parseProjectSession(bytes);
  if (
    (asset.sessionId != null && entries[0]?.sessionId !== asset.sessionId) ||
    (asset.firstEventOrdinal != null && entries[0]?.ordinal !== asset.firstEventOrdinal) ||
    (asset.lastEventOrdinal != null && entries.at(-1)?.lastOrdinal !== asset.lastEventOrdinal)
  )
    throw new Error('Session asset identity differs from its record.');
  return entries;
};
