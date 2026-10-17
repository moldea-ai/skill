import { constants } from 'node:fs';
import { open } from 'node:fs/promises';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../resources/index.ts';

import {
  CliInvocationEventSchema,
  CliInvocationRecordSchema,
  type ICliInvocation,
} from './types.ts';

/**
 * Reads bounded startup/exit pairs in invocation order, without accepting incomplete capture.
 * @param path The runner-owned temporary log outside the repository.
 * @returns The ordered launcher invocations for content-free projection.
 * @throws If the capture is unreadable, oversized, malformed or incomplete.
 */
export const readCliInvocations = async (path: string): Promise<ICliInvocation[]> => {
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
    const starts = new Map<string, ICliInvocation['arguments']>();
    const exits = new Map<string, ICliInvocation>();
    for (const line of source.split('\n').slice(0, -1)) {
      const record = CliInvocationRecordSchema.parse(JSON.parse(line));
      if (record.kind === 'start') {
        if (starts.has(record.id)) throw new Error('CLI invocation startup is duplicated.');
        starts.set(record.id, record.arguments);
      } else {
        const argumentsList = starts.get(record.id);
        if (
          argumentsList === undefined ||
          exits.has(record.id) ||
          Buffer.byteLength(record.stdout) > record.outputByteCount
        )
          throw new Error('CLI invocation exit does not match its startup.');
        exits.set(record.id, {
          arguments: argumentsList,
          exitCode: record.exitCode,
          stdout: record.stdout,
          outputByteCount: record.outputByteCount,
        });
      }
    }
    if (starts.size !== exits.size)
      throw new Error('CLI invocation capture has an unfinished launcher.');
    return CliInvocationEventSchema.parse({
      type: 'moldea.cli-invocations',
      invocations: [...starts.keys()].map((id) => exits.get(id)),
    }).invocations;
  } finally {
    await handle.close();
  }
};
