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
const HOST_EXECUTABLES = new Set(['/opt/codex', '/opt/codex-code-mode-host']);

/** Reads one live process identity without observing its environment. */
const observeProcess = (pid: number) => {
  const root = `/proc/${pid}`;
  const stats = readBoundedFile(`${root}/stat`, 4096).toString('utf8');
  const fields = stats.slice(stats.lastIndexOf(')') + 2).split(' ');
  const parent = fields[1];
  const start = fields[19];
  if (parent === undefined || start === undefined || !/^\d+$/u.test(parent + start))
    throw new Error('Process identity was unavailable.');
  const executable = readlinkSync(`${root}/exe`);
  // the native host identity needs no argv, which may include a large startup schema.
  if (HOST_EXECUTABLES.has(executable))
    return { identity: `${pid}:${start}`, parent: Number(parent), executable, args: [] };
  const bytes = readBoundedFile(
    `${root}/cmdline`,
    MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxCommandTextBytes,
  );
  const source = bytes.toString('utf8');
  if (bytes.length === 0 || bytes.at(-1) !== 0 || !Buffer.from(source).equals(bytes))
    throw new Error('Process arguments were unavailable.');
  const args = source.split('\0').slice(0, -1);
  if (args.length > 4096) throw new Error('Process argument count exceeded its bound.');
  return { identity: `${pid}:${start}`, parent: Number(parent), executable, args };
};

const isCodexProcess = (processInfo: ReturnType<typeof observeProcess>): boolean =>
  HOST_EXECUTABLES.has(processInfo.executable) || HOST_EXECUTABLES.has(processInfo.args[1] ?? '');

/** Returns a proved host-owned shell; unavailable process metadata supplies no identity. */
const observeHostShell = (): ReturnType<typeof observeProcess> | null => {
  try {
    const shell = observeProcess(process.ppid);
    return ['/bin/bash', '/usr/bin/bash'].includes(shell.executable) &&
      isCodexProcess(observeProcess(shell.parent))
      ? shell
      : null;
  } catch {
    return null;
  }
};

/** Observes bounded caller argv and process instances, without reading environment. */
const observeCallers = (): { callers: string[][]; callerIdentities: string[] } => {
  const callers: string[][] = [];
  const callerIdentities: string[] = [];
  let pid = process.pid;
  while (pid > 0 && callers.length < 8) {
    try {
      const observed = observeProcess(pid);
      if (isCodexProcess(observed)) break;
      callers.push([observed.executable, ...observed.args.slice(1)]);
      callerIdentities.push(observed.identity);
      pid = observed.parent;
    } catch {
      break;
    }
  }
  return { callers, callerIdentities };
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
    ...observeCallers(),
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

if (
  process.argv[1] === '/home/evaluator/bin/cli-invocation-preload.mjs' &&
  process.argv[2] === '--observe-shell' &&
  process.argv.length === 3
) {
  const shell = observeHostShell();
  if (shell !== null)
    appendRecord({
      kind: 'command',
      identity: shell.identity,
      arguments: [shell.executable, ...shell.args.slice(1)],
    });
} else observeLauncher();
