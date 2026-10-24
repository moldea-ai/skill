import { randomUUID } from 'node:crypto';
import { appendFileSync, lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { isMainThread } from 'node:worker_threads';
import { StringDecoder } from 'node:string_decoder';

import { readBoundedFile } from 'jg-fs/sync';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../resources/index.ts';

import { observeCanonicalDigest } from './canonical-observation.ts';

// Linux-only evaluator preload. NODE_OPTIONS propagates through cooperative Node wrappers.
const launcher = '/mnt/.agents/skills/moldea/scripts/moldea-cli.mjs';
const writer = '/mnt/.agents/skills/moldea/scripts/managed-agents.mjs';
const log = '/home/evaluator/cli-invocations.jsonl';

/** Observes a bounded live caller chain for command correspondence, without reading environment. */
const observeCallers = (): string[][] => {
  const callers: string[][] = [];
  let pid = process.pid;
  while (pid > 0 && callers.length < 8) {
    try {
      const root = `/proc/${pid}`;
      const executable = readlinkSync(`${root}/exe`);
      if (executable === '/opt/codex' || executable === '/opt/codex-code-mode-host') break;
      const bytes = readBoundedFile(
        `${root}/cmdline`,
        MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxCommandTextBytes,
      );
      if (bytes.length === 0 || bytes.at(-1) !== 0) break;
      const source = bytes.toString('utf8');
      if (!Buffer.from(source).equals(bytes)) break;
      const args = source.split('\0').slice(0, -1);
      if (args[1] === '/opt/codex' || args[1] === '/opt/codex-code-mode-host' || args.length > 4096)
        break;
      callers.push([executable, ...args.slice(1)]);
      const stats = readBoundedFile(`${root}/stat`, 4096).toString('utf8');
      const parent = stats.slice(stats.lastIndexOf(')') + 2).split(' ')[1];
      if (parent === undefined || !/^\d+$/u.test(parent)) break;
      pid = Number(parent);
    } catch {
      break;
    }
  }
  return callers;
};

/** Signals capture failure independently of the launcher's own exit status or response. */
const appendRecord = (record: object): void => {
  try {
    appendFileSync(log, `${JSON.stringify(record)}\n`);
  } catch (error) {
    process.stderr.write('MOLDEA_CLI_CAPTURE_FAILED\n');
    throw new Error('CLI invocation capture could not be written.', { cause: error });
  }
};

/** Installs bounded observation before the entry point resolves or executes. */
const observeLauncher = (): void => {
  if (!isMainThread || process.argv[1] === undefined) return;
  const entrypoint = resolve(process.argv[1]);
  if (entrypoint !== launcher && entrypoint !== writer) return;
  if (entrypoint === writer) {
    try {
      if (realpathSync(writer) !== writer || !lstatSync(writer).isFile()) return;
    } catch {
      return;
    }
  }
  const id = randomUUID();
  const observesCanonicalState = entrypoint === launcher && process.argv[5] === 'validate';
  appendRecord({
    kind: 'start',
    id,
    arguments: process.argv.slice(2),
    entrypoint: entrypoint === launcher ? 'cli' : 'managed-agents',
    callers: observeCallers(),
    ...(observesCanonicalState ? { canonicalBefore: observeCanonicalDigest('/mnt/moldea') } : {}),
  });
  let outputByteCount = 0;
  let stdoutByteCount = 0;
  const chunks: Buffer[] = [];
  const maximumBytes = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaInvocationOutputBytes;
  for (const [stream, isStdout] of [
    [process.stdout, true],
    [process.stderr, false],
  ] as const) {
    const write = stream.write.bind(stream);
    stream.write = (chunk: string | Uint8Array, ...args: unknown[]): boolean => {
      const encoding = typeof args[0] === 'string' ? (args[0] as BufferEncoding) : 'utf8';
      const bytes = typeof chunk === 'string' ? Buffer.from(chunk, encoding) : Buffer.from(chunk);
      outputByteCount += bytes.length;
      if (isStdout && stdoutByteCount < maximumBytes) {
        chunks.push(bytes.subarray(0, maximumBytes - stdoutByteCount));
        stdoutByteCount += chunks.at(-1)?.length ?? 0;
      }
      return Reflect.apply(write, stream, [chunk, ...args]) as boolean;
    };
  }
  process.once('exit', (exitCode) => {
    appendRecord({
      kind: 'exit',
      id,
      exitCode,
      outputByteCount,
      stdout: new StringDecoder('utf8').write(Buffer.concat(chunks)),
      ...(observesCanonicalState ? { canonicalAfter: observeCanonicalDigest('/mnt/moldea') } : {}),
    });
  });
};

observeLauncher();
