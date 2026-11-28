import { constants } from 'node:fs';
import { open } from 'node:fs/promises';

import { z } from 'zod';

import {
  hasValidRepairGitCommandEvidence,
  projectRepairGitArgumentsEvidence,
} from './execution-evidence.ts';
import type { IRepairGitCommandEvidence, IRepairGitReasonCode } from './types.ts';

// raw arguments are temporary, bounded and never persisted in semantic evidence
const MAXIMUM_GIT_LOG_BYTES = 1_048_576;
export const GitInvocationSchema = z.strictObject({
  arguments: z.array(z.string().max(65_536)).max(4_096),
  approved: z.boolean(),
  origin: z.enum(['actor', 'host']),
  caller: z.enum(['actor', 'repair-helper', 'managed-writer', 'release-cli', 'unverified']),
});
export type IGitInvocation = z.infer<typeof GitInvocationSchema>;

export const GitInvocationEvidenceSchema = z
  .strictObject({
    invocationCount: z.number().int().min(0).max(65_536),
    hostInvocationCount: z.number().int().min(0).max(65_536),
    repair: z.custom<IRepairGitCommandEvidence>(hasValidRepairGitCommandEvidence),
  })
  .refine(
    ({ invocationCount, hostInvocationCount, repair }) =>
      repair.unverifiedCount === 0 &&
      repair.compliantCount + repair.noncompliantCount + hostInvocationCount <= invocationCount,
    'Git invocation totals do not match their repair observations.',
  );
export type IGitInvocationEvidence = z.infer<typeof GitInvocationEvidenceSchema>;

export const GitInvocationEventSchema = z
  .strictObject({
    type: z.literal('moldea.git-invocations'),
    evidence: GitInvocationEvidenceSchema,
    blockedInvocationCount: z.number().int().nonnegative().optional(),
  })
  .refine(
    ({ evidence, blockedInvocationCount }) =>
      (blockedInvocationCount ?? 0) <= evidence.invocationCount,
  );

/** Projects actual wrapper calls; empty capture permits opaque commands that used no Git. */
export const projectGitInvocations = (
  source: string,
  blockedInvocations: readonly IGitInvocation[] = [],
): IGitInvocationEvidence => {
  const blockedBytes = blockedInvocations.reduce(
    (total, record) => total + Buffer.byteLength(JSON.stringify(record)) + 1,
    0,
  );
  if (Buffer.byteLength(source) + blockedBytes > MAXIMUM_GIT_LOG_BYTES)
    throw new Error('Git invocation capture exceeded its byte limit.');
  if (source !== '' && !source.endsWith('\n'))
    throw new Error('Git invocation capture is incomplete.');
  const repair: IRepairGitCommandEvidence = {
    compliantCount: 0,
    noncompliantCount: 0,
    unverifiedCount: 0,
    reasons: [],
  };
  const reasons = new Map<IRepairGitReasonCode, number>();
  let invocationCount = 0;
  let hostInvocationCount = 0;
  const loggedRecords = source.split('\n').slice(0, -1);
  const records = [
    ...loggedRecords.map((line) => GitInvocationSchema.parse(JSON.parse(line))),
    ...blockedInvocations,
  ];
  for (const [index, record] of records.entries()) {
    invocationCount++;
    if (record.origin === 'host') {
      hostInvocationCount++;
      continue;
    }
    // a capture failure blocked execution, so an approved shape earns no method credit
    if (index >= loggedRecords.length && record.approved) continue;
    if (
      record.approved &&
      (['release-cli', 'managed-writer'].includes(record.caller) ||
        (record.arguments.length === 1 && record.arguments[0] === '--version'))
    )
      continue;
    const observation = projectRepairGitArgumentsEvidence(
      record.arguments,
      record.caller === 'repair-helper',
    );
    if (!record.approved && observation.noncompliantCount === 0) {
      observation.compliantCount = 0;
      observation.noncompliantCount = 1;
      observation.reasons = [{ code: 'git-other', count: 1 }];
    }
    repair.compliantCount += observation.compliantCount;
    repair.noncompliantCount += observation.noncompliantCount;
    for (const reason of observation.reasons)
      reasons.set(reason.code, (reasons.get(reason.code) ?? 0) + reason.count);
  }
  repair.reasons = [...reasons]
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([code, count]) => ({ code, count }));
  return GitInvocationEvidenceSchema.parse({ invocationCount, hostInvocationCount, repair });
};

/** Reads the runner-owned capture after the sandbox exits, retaining no raw arguments. */
export const readGitInvocationEvidence = async (
  path: string,
  blockedInvocations?: readonly IGitInvocation[],
): Promise<IGitInvocationEvidence> => {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size > MAXIMUM_GIT_LOG_BYTES)
      throw new Error('Git invocation capture is unavailable or exceeds its limit.');
    const bytes = Buffer.alloc(MAXIMUM_GIT_LOG_BYTES + 1);
    let byteCount = 0;
    while (byteCount < bytes.length) {
      const { bytesRead } = await handle.read(
        bytes,
        byteCount,
        bytes.length - byteCount,
        byteCount,
      );
      if (bytesRead === 0) break;
      byteCount += bytesRead;
    }
    if (byteCount !== stats.size)
      throw new Error('Git invocation capture changed or exceeded its limit.');
    const content = bytes.subarray(0, byteCount);
    if (!Buffer.from(content.toString('utf8')).equals(content))
      throw new Error('Git invocation capture is not valid UTF-8.');
    return projectGitInvocations(content.toString('utf8'), blockedInvocations);
  } finally {
    await handle.close();
  }
};
