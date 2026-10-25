import { randomUUID } from 'node:crypto';
import { open, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import type { Socket } from 'node:net';
import { join } from 'node:path';

import { hashValue } from 'jg-crypto';
import { redactFields } from 'jg-exception';
import { assertNoLinksBelow, assertPrivateFile, createPrivateDirectory } from 'jg-fs';
import { isPortablePathValid } from 'jg-utilities';
import { z } from 'zod';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';

import { redactCodexDiagnosticText } from './execution-evidence.ts';
import type { ICodexEvaluationPrivateTraceOptions } from './types.ts';

const MAX_TRACE_BYTES = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostOutputBytes;
const FOOTER_RESERVE_BYTES = 2048;
const OMITTED_FIELDS = new Set([
  'aggregated_output',
  'stdout',
  'stderr',
  'output',
  'output_text',
  'env',
  'environment',
  'environment_variables',
  'auth',
  'auth_json',
]);
const SECRET_FIELDS = [
  'password',
  'secret',
  'token',
  'access_token',
  'refresh_token',
  'id_token',
  'api_key',
  'apiKey',
  'authorization',
  'cookie',
  'set-cookie',
  'private_key',
];
const GitDiagnosticSchema = z.object({
  arguments: z.array(z.string()),
  status: z.number().int().nullable(),
  calls: z.array(
    z.object({
      kind: z.enum(['subprocess', 'wrapper']),
      arguments: z.array(z.string()),
      status: z.number().int().nullable(),
      signal: z.string().nullable(),
      stderr: z.string(),
      incomplete: z.boolean(),
    }),
  ),
});

/** Removes output/reasoning bodies while preserving additive metadata and all numeric usage. */
export const sanitizePrivateTraceEvent = (event: unknown): unknown => {
  let hasRedaction = false;
  const visit = (value: unknown, isReasoning = false, isUsage = false): unknown => {
    if (typeof value === 'string') {
      if (isReasoning) {
        hasRedaction = true;
        return '[omitted]';
      }
      const redacted = redactCodexDiagnosticText(value);
      if (redacted !== value) hasRedaction = true;
      return redacted;
    }
    if (Array.isArray(value)) return value.map((entry) => visit(entry, isReasoning, isUsage));
    if (typeof value !== 'object' || value === null) return value;
    const record = value as Record<string, unknown>;
    const reasoning =
      isReasoning || record['type'] === 'reasoning' || record['type'] === 'reasoning_summary';
    const usage =
      isUsage || (typeof record['type'] === 'string' && record['type'].includes('usage'));
    const result: Array<[string, unknown]> = [];
    const omittedOutputByteCounts: Record<string, number> = {};
    for (const [key, entry] of Object.entries(record)) {
      if (
        OMITTED_FIELDS.has(key.toLowerCase()) &&
        typeof entry !== 'number' &&
        (typeof entry !== 'object' ||
          entry === null ||
          ['env', 'environment', 'environment_variables', 'auth', 'auth_json'].includes(
            key.toLowerCase(),
          ))
      ) {
        if (
          typeof entry === 'string' &&
          !['env', 'environment', 'environment_variables', 'auth', 'auth_json'].includes(
            key.toLowerCase(),
          )
        ) {
          omittedOutputByteCounts[key] = Buffer.byteLength(entry);
        }
        hasRedaction = true;
        continue;
      }
      if (
        SECRET_FIELDS.some((field) => field.toLowerCase() === key.toLowerCase()) &&
        !(usage && typeof entry === 'number')
      ) {
        result.push([key, (redactFields({ [key]: entry }, [key]) as Record<string, unknown>)[key]]);
        hasRedaction = true;
        continue;
      }
      // event discriminators and identifiers are metadata, including on reasoning events
      result.push([
        key,
        visit(
          entry,
          (reasoning && key !== 'type' && key !== 'id' && !key.endsWith('_id')) ||
            /^reasoning(?:_|$)/u.test(key) ||
            OMITTED_FIELDS.has(key.toLowerCase()),
          usage || key === 'usage' || key.endsWith('_usage'),
        ),
      ]);
    }
    if (Object.keys(omittedOutputByteCounts).length > 0)
      result.push(['moldeaPrivateOutputByteCounts', omittedOutputByteCounts]);
    return Object.fromEntries(result);
  };
  const sanitized = visit(event);
  return hasRedaction &&
    typeof sanitized === 'object' &&
    sanitized !== null &&
    !Array.isArray(sanitized)
    ? { ...sanitized, moldeaPrivateRedacted: true }
    : sanitized;
};

/**
 * Opens host-only sidecars and a write-only sandbox Git sink, bounded together to 16 MiB.
 * @returns A streaming collector whose finish operation flushes and verifies completeness.
 * @throws If identifiers/paths are unsafe, private files cannot be created, or capture is incomplete.
 */
export const createPrivateTrace = async (
  options: ICodexEvaluationPrivateTraceOptions,
  socketPath: string,
) => {
  for (const identifier of [options.attemptId, options.caseId, options.invocation]) {
    if (
      !isPortablePathValid(identifier, {
        maxComponentBytes: 64,
        maxPathBytes: 64,
        componentPattern: /^[a-z0-9_-]+$/u,
      }) ||
      identifier.includes('/')
    ) {
      throw new Error('Private diagnostic identifiers must be portable single path components.');
    }
  }
  const basename = `${options.invocation}-${randomUUID().replaceAll('-', '')}`;
  const relativeFile = join(options.attemptId, options.caseId, `${basename}.git.jsonl`);
  if (
    !isPortablePathValid(relativeFile.replaceAll('\\', '/'), {
      maxComponentBytes: 64,
      maxPathBytes: 160,
      componentPattern: /^[a-z0-9._-]+$/u,
    })
  ) {
    throw new Error('Private diagnostic path exceeds portable bounds.');
  }
  const root = join(options.repositoryRoot, '.evidence', 'private-semantic');
  const directory = join(root, options.attemptId, options.caseId);
  await assertNoLinksBelow(options.repositoryRoot, directory);
  await createPrivateDirectory(directory);
  const eventsPath = join(directory, `${basename}.jsonl`);
  const gitPath = join(directory, `${basename}.git.jsonl`);
  const eventsFile = await open(eventsPath, 'wx', 0o600);
  let gitFile;
  try {
    gitFile = await open(gitPath, 'wx', 0o600);
  } catch (error) {
    await eventsFile.close();
    throw error;
  }
  let byteCount = 0;
  const fileByteCounts = { events: 0, git: 0 };
  let eventCount = 0;
  let gitInvocationCount = 0;
  let failure: Error | null = null;
  let writes = Promise.resolve();
  let line = '';
  let isFinished = false;
  const activeCommands = new Set<string>();
  const decoder = new TextDecoder('utf8', { fatal: true });
  const clients = new Set<Socket>();
  let bufferedGitBytes = 0;
  const fail = (message: string): void => {
    failure ??= new Error(message);
  };
  const assertCaptureValid = (): void => {
    if (failure !== null) throw failure;
  };
  const append = (kind: 'events' | 'git', value: unknown, isFooter = false): void => {
    if (failure !== null && !isFooter) return;
    const serialized = `${JSON.stringify(value)}\n`;
    const size = Buffer.byteLength(serialized);
    if (byteCount + size > MAX_TRACE_BYTES - (isFooter ? 0 : FOOTER_RESERVE_BYTES)) {
      fail('Private diagnostic capture exceeded its aggregate byte limit.');
      return;
    }
    byteCount += size;
    fileByteCounts[kind] += size;
    const file = kind === 'events' ? eventsFile : gitFile;
    writes = writes
      .then(async () => {
        await file.writeFile(serialized);
      })
      .catch(() => {
        fail('Private diagnostic capture could not be written.');
      });
  };
  append('events', { moldeaPrivateTrace: true, kind: 'codex-events' });
  append('git', { moldeaPrivateTrace: true, kind: 'git-stderr' });
  const server = createServer({ allowHalfOpen: true }, (client) => {
    clients.add(client);
    const chunks: Buffer[] = [];
    let bytes = 0;
    client.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      bufferedGitBytes += chunk.length;
      if (bufferedGitBytes + byteCount > MAX_TRACE_BYTES || failure !== null) {
        fail('Private Git diagnostic capture exceeded its byte limit.');
        client.destroy();
      } else chunks.push(chunk);
    });
    client.on('error', () => fail('Private Git diagnostic transport failed.'));
    client.on('end', () => {
      bufferedGitBytes -= bytes;
      try {
        const record = GitDiagnosticSchema.parse(
          JSON.parse(Buffer.concat(chunks).toString('utf8')),
        );
        const calls = record.calls.map((call) => {
          if (call.incomplete) fail('Private Git diagnostic subprocess capture was incomplete.');
          const stderr = Buffer.from(call.stderr, 'base64');
          if (stderr.toString('base64') !== call.stderr)
            throw new Error('Invalid stderr encoding.');
          const text = stderr.toString('utf8');
          const redacted = redactCodexDiagnosticText(text);
          const retained = redacted === text ? stderr : Buffer.from(redacted);
          const argumentsList = sanitizePrivateTraceEvent(call.arguments);
          return {
            kind: call.kind,
            arguments: argumentsList,
            argumentsRedacted: JSON.stringify(argumentsList) !== JSON.stringify(call.arguments),
            status: call.status,
            signal: call.signal,
            stderr: retained.toString('base64'),
            encoding: 'base64',
            byteCount: stderr.length,
            retainedByteCount: retained.length,
            sha256: hashValue(retained),
            redacted: redacted !== text,
          };
        });
        gitInvocationCount += 1;
        const argumentsList = sanitizePrivateTraceEvent(record.arguments);
        append('git', {
          arguments: argumentsList,
          argumentsRedacted: JSON.stringify(argumentsList) !== JSON.stringify(record.arguments),
          status: record.status,
          calls,
        });
      } catch {
        fail('Private Git diagnostic capture was malformed.');
      }
      void writes.then(() => client.end('ok'));
    });
    client.on('close', () => clients.delete(client));
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
  } catch (error) {
    await Promise.all([eventsFile.close(), gitFile.close()]);
    throw error;
  }
  server.on('error', () => fail('Private Git diagnostic listener failed.'));
  return {
    /** Marks missing runtime capture without discarding the retained diagnostic stream. */
    markIncomplete(this: void): void {
      fail('Private runtime invocation capture was incomplete.');
    },
    /**
     * Accepts Codex stdout in stream order, without adding a second transcript buffer.
     * @throws If capture is closed, malformed, oversized or unavailable.
     */
    capture(this: void, chunk: Buffer): void {
      if (isFinished) throw new Error('Private diagnostic capture already finished.');
      assertCaptureValid();
      try {
        line += decoder.decode(chunk, { stream: true });
      } catch {
        fail('Private diagnostic event stream was not valid UTF-8.');
      }
      if (Buffer.byteLength(line) > MAX_TRACE_BYTES)
        fail('Private diagnostic event exceeded its byte limit.');
      while (failure === null && line.includes('\n')) {
        const separator = line.indexOf('\n');
        const source = line.slice(0, separator);
        line = line.slice(separator + 1);
        if (source.trim() === '') continue;
        try {
          const event: unknown = JSON.parse(source);
          if (typeof event !== 'object' || event === null || Array.isArray(event))
            throw new Error('Expected an event object.');
          append('events', sanitizePrivateTraceEvent(event));
          eventCount += 1;
          if (
            'type' in event &&
            'item' in event &&
            typeof event.item === 'object' &&
            event.item !== null &&
            'type' in event.item &&
            event.item.type === 'command_execution'
          ) {
            if (event.type === 'item.started') {
              if (
                !('id' in event.item) ||
                typeof event.item.id !== 'string' ||
                activeCommands.has(event.item.id)
              )
                throw new Error('Invalid command start identity.');
              activeCommands.add(event.item.id);
            } else if (
              event.type === 'item.completed' &&
              'id' in event.item &&
              typeof event.item.id === 'string'
            )
              activeCommands.delete(event.item.id);
          }
        } catch {
          fail('Private diagnostic event stream was malformed.');
        }
      }
      assertCaptureValid();
    },
    /**
     * Flushes before host cleanup; a generic integrity error is never operationally retried.
     * @returns A promise resolving after both files and the Git sink close.
     * @throws If capture is closed, incomplete, malformed, oversized or unavailable.
     */
    async finish(
      this: void,
      outcome: 'completed' | 'failed',
      expectedGitInvocationCount: number,
    ): Promise<void> {
      if (isFinished) throw new Error('Private diagnostic capture already finished.');
      isFinished = true;
      try {
        line += decoder.decode();
      } catch {
        fail('Private diagnostic event stream ended with partial UTF-8.');
      }
      if (line.trim() !== '') fail('Private diagnostic event stream ended with a partial line.');
      if (activeCommands.size > 0) fail('Private diagnostic command capture was incomplete.');
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          fail('Private Git diagnostic transport did not finish.');
          for (const client of clients) client.destroy();
        }, 5000);
        server.close(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
      await rm(socketPath, { force: true });
      if (gitInvocationCount !== expectedGitInvocationCount)
        fail('Private Git diagnostic invocation capture was incomplete.');
      await writes;
      for (const [kind, path, file] of [
        ['events', eventsPath, eventsFile],
        ['git', gitPath, gitFile],
      ] as const) {
        try {
          await assertPrivateFile(path);
          const stats = await file.stat();
          if (stats.nlink !== 1 || stats.size !== fileByteCounts[kind])
            fail('Private diagnostic file was missing or truncated.');
        } catch {
          fail('Private diagnostic file was unavailable or unsafe.');
        }
      }
      const footer = {
        moldeaPrivateTrace: true,
        complete: failure === null,
        outcome,
        eventCount,
        gitInvocationCount,
      };
      append('events', footer, true);
      append('git', footer, true);
      await writes;
      await Promise.all([eventsFile.close(), gitFile.close()]);
      if (failure !== null) throw failure;
    },
  };
};
