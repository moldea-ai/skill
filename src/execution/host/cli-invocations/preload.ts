import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isMainThread } from 'node:worker_threads';
import { StringDecoder } from 'node:string_decoder';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../resources/index.ts';

import { observeCanonicalDigest } from './canonical-observation.ts';

// Linux-only evaluator preload. NODE_OPTIONS propagates through cooperative Node wrappers.
const launcher = '/mnt/.agents/skills/moldea/scripts/moldea-cli.mjs';
const log = '/home/evaluator/cli-invocations.jsonl';

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
  if (!isMainThread || process.argv[1] === undefined || resolve(process.argv[1]) !== launcher)
    return;
  const id = randomUUID();
  const observesCanonicalState = process.argv[5] === 'validate';
  appendRecord({
    kind: 'start',
    id,
    arguments: process.argv.slice(2),
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
