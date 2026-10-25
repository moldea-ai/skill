import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { posix } from 'node:path';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../resources/index.ts';

import type { IMoldeaCliOperation } from '../types.ts';

import {
  CliInvocationEventSchema,
  CliInvocationRecordSchema,
  type ICliInvocation,
  type ICliCommandInstance,
} from './types.ts';

// closed launcher operations shared by capture and grading
export const MOLDEA_CLI_OPERATIONS = [
  'composition',
  'content',
  'inspect',
  'scope',
  'validate',
] as const;

/** Recognizes the five closed launcher operations shared by capture and grading. */
export const isMoldeaCliOperation = (input: unknown): input is IMoldeaCliOperation =>
  MOLDEA_CLI_OPERATIONS.some((operation) => operation === input);

/** Identifies the operation from observed launcher argv for the exact sandbox repository. */
export const identifyCliInvocationOperation = (
  argumentsList: readonly string[],
): IMoldeaCliOperation | null => {
  const [flag, repository, separator, operation] = argumentsList;
  return flag === '--repository' &&
    typeof repository === 'string' &&
    repository !== '' &&
    posix.resolve('/mnt', repository) === '/mnt' &&
    separator === '--' &&
    isMoldeaCliOperation(operation)
    ? operation
    : null;
};

/**
 * Reads bounded startup/exit pairs in invocation order, without accepting incomplete capture.
 * @param path The runner-owned temporary log outside the repository.
 * @returns The ordered launcher invocations for content-free projection.
 * @throws If the capture is unreadable, oversized, malformed or incomplete.
 */
export const readCliInvocationCapture = async (
  path: string,
): Promise<{
  invocations: ICliInvocation[];
  commandInstances: ICliCommandInstance[];
}> => {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const maximumBytes = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostOutputBytes;
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size > maximumBytes)
      throw new Error('CLI invocation capture exceeds its byte limit.');
    const bytes = Buffer.alloc(stats.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const { bytesRead } = await handle.read(bytes, length, bytes.length - length, length);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length !== stats.size) throw new Error('CLI invocation capture changed while being read.');
    const content = bytes.subarray(0, length);
    const source = content.toString('utf8');
    if (!Buffer.from(source).equals(content) || (source !== '' && !source.endsWith('\n')))
      throw new Error('CLI invocation capture is incomplete.');
    const starts = new Map<
      string,
      Pick<
        ICliInvocation,
        'arguments' | 'canonicalBefore' | 'entrypoint' | 'callers' | 'callerIdentities'
      >
    >();
    const exits = new Map<string, ICliInvocation>();
    const commandInstances = new Map<string, ICliCommandInstance>();
    const activeIds = new Set<string>();
    const overlappingIds = new Set<string>();
    for (const line of source.split('\n').slice(0, -1)) {
      const record = CliInvocationRecordSchema.parse(JSON.parse(line));
      if (record.kind === 'command') {
        // Retain the original shell invocation when that process later explicitly execs.
        if (!commandInstances.has(record.identity))
          commandInstances.set(record.identity, {
            identity: record.identity,
            arguments: record.arguments,
          });
        continue;
      }
      if (record.kind === 'start') {
        if (starts.has(record.id)) throw new Error('CLI invocation startup is duplicated.');
        // every other active start was already marked when it joined an overlapping interval
        const activeId = activeIds.values().next().value;
        if (activeId !== undefined) {
          overlappingIds.add(activeId);
          overlappingIds.add(record.id);
        }
        activeIds.add(record.id);
        if (
          record.callerIdentities !== undefined &&
          record.callerIdentities.length !== record.callers?.length
        )
          throw new Error('CLI caller identities do not match their arguments.');
        starts.set(record.id, {
          arguments: record.arguments,
          ...(record.entrypoint === undefined ? {} : { entrypoint: record.entrypoint }),
          ...(record.callers === undefined ? {} : { callers: record.callers }),
          ...(record.callerIdentities === undefined
            ? {}
            : { callerIdentities: record.callerIdentities }),
          ...(record.canonicalBefore === undefined
            ? {}
            : { canonicalBefore: record.canonicalBefore }),
        });
      } else {
        const start = starts.get(record.id);
        if (
          start === undefined ||
          exits.has(record.id) ||
          Buffer.byteLength(record.stdout) > record.outputByteCount
        )
          throw new Error('CLI invocation exit does not match its startup.');
        exits.set(record.id, {
          ...start,
          exitCode: record.exitCode,
          stdout: record.stdout,
          outputByteCount: record.outputByteCount,
          ...(record.canonicalAfter === undefined ? {} : { canonicalAfter: record.canonicalAfter }),
        });
        activeIds.delete(record.id);
      }
    }
    if (starts.size !== exits.size)
      throw new Error('CLI invocation capture has an unfinished launcher.');
    const capture = CliInvocationEventSchema.parse({
      type: 'moldea.cli-invocations',
      commandInstances: [...commandInstances.values()],
      invocations: [...starts.keys()].map((id) => {
        const invocation = exits.get(id);
        return overlappingIds.has(id) && invocation !== undefined
          ? {
              ...invocation,
              callers: [],
              callerIdentities: [],
              canonicalBefore: null,
              canonicalAfter: null,
            }
          : invocation;
      }),
    });
    return { invocations: capture.invocations, commandInstances: [...commandInstances.values()] };
  } finally {
    await handle.close();
  }
};

/**
 * Reads the existing ordered-invocation API without exposing private command-instance metadata.
 * @returns Complete bounded launcher invocations.
 * @throws If capture cannot be read and validated by readCliInvocationCapture.
 */
export const readCliInvocations = async (path: string): Promise<ICliInvocation[]> =>
  (await readCliInvocationCapture(path)).invocations;
