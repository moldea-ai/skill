import { randomUUID } from 'node:crypto';
import { appendFileSync, lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { isMainThread } from 'node:worker_threads';
import { StringDecoder } from 'node:string_decoder';

import { readBoundedFile } from 'jg-fs/sync';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../resources/index.ts';

import { observeCanonicalDigest } from './canonical-observation.ts';
import { getNodeEvalSource, observeNodeAssertions } from './runtime-assertion.ts';

// Linux-only evaluator preload. NODE_OPTIONS propagates through cooperative Node wrappers.
const cli = '/mnt/.agents/skills/moldea/scripts/moldea-cli/moldea.mjs';
const helperDirectory = '/mnt/.agents/skills/moldea/scripts/';
const helperEntrypoints = new Map([
  [`${helperDirectory}managed-agents.mjs`, 'managed-agents'],
  [`${helperDirectory}managed-readme.mjs`, 'managed-readme'],
  [`${helperDirectory}relevance-gate.mjs`, 'relevance-gate'],
  [`${helperDirectory}repair-git.mjs`, 'repair-git'],
] as const);
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

/** Signals capture failure independently of the tool's exit status or response. */
const appendRecord = (record: object): void => {
  try {
    appendFileSync(log, `${JSON.stringify(record)}\n`);
  } catch (error) {
    process.stderr.write('MOLDEA_CLI_CAPTURE_FAILED\n');
    throw new Error('CLI invocation capture could not be written.', { cause: error });
  }
};

/** Installs bounded observation before the entry point resolves or executes. */
const observeTool = (): void => {
  if (!isMainThread) return;
  const evalSource = process.argv.length === 1 ? getNodeEvalSource(process.execArgv) : null;
  const isNodeEval = evalSource !== null && evalSource.includes('node:assert');
  const path = process.argv[1] === undefined ? null : resolve(process.argv[1]);
  const entrypoint = isNodeEval
    ? 'node-eval'
    : path === cli
      ? 'cli'
      : path === null
        ? undefined
        : helperEntrypoints.get(path as Parameters<typeof helperEntrypoints.get>[0]);
  if (entrypoint === undefined) return;
  if (
    entrypoint !== 'cli' &&
    entrypoint !== 'managed-agents' &&
    !isNodeEval &&
    process.execArgv.length !== 0
  )
    return;
  if (path !== null && entrypoint !== 'cli') {
    try {
      if (realpathSync(path) !== path || !lstatSync(path).isFile()) return;
    } catch {
      return;
    }
  }
  const args = isNodeEval ? process.execArgv : process.argv.slice(2);
  if (entrypoint === 'cli') {
    const repositoryIndex = args.indexOf('--repository');
    const repository = repositoryIndex === -1 ? process.cwd() : args[repositoryIndex + 1];
    if (repository === undefined || resolve(repository) !== '/mnt') return;
  }
  const id = randomUUID();
  const observesCanonicalState = entrypoint === 'cli' && args[0] === 'validate';
  appendRecord({
    kind: 'start',
    id,
    arguments: args,
    entrypoint,
    ...observeCallers(),
    ...(observesCanonicalState ? { canonicalBefore: observeCanonicalDigest('/mnt/moldea') } : {}),
  });
  const readAssertion = isNodeEval ? observeNodeAssertions() : null;
  let outputByteCount = 0;
  let stdoutByteCount = 0;
  const chunks: Buffer[] = [];
  const maximumBytes = isNodeEval
    ? 0
    : MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxMoldeaInvocationOutputBytes;
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
      ...(readAssertion === null ? {} : { assertionObservation: readAssertion() }),
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
} else observeTool();
