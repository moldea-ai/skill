import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import {
  LOCAL_QUALIFICATION_ROOT,
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
} from '../constants/index.ts';
import {
  ActorOutputSchema,
  JudgeOutputSchema,
  type IActorOutput,
  type IJudgeOutput,
} from '../contracts/index.ts';
import {
  calculateSha256,
  calculateDirectoryFingerprint,
  calculateFileSha256,
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import {
  captureQualificationWorkspaceSnapshot,
  restoreQualificationWorkspaceSnapshot,
} from '../project-fixture/index.ts';
import type { IActorCacheHit, IJudgeCacheHit, IModelCacheMetadata } from './types.ts';

const ModelCacheMetadataSchema = z.strictObject({
  protocolVersion: z.literal(QUALIFICATION_EVIDENCE_PROTOCOL_VERSION),
  cacheKey: z.string().regex(/^[a-f0-9]{64}$/u),
  role: z.enum(['actor', 'judge']),
  sourceAttemptId: z.string().min(1),
  createdAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  eventsSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  outputSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  usage: z
    .strictObject({
      inputTokens: z.number().int().nonnegative(),
      cachedInputTokens: z.number().int().nonnegative(),
      outputTokens: z.number().int().nonnegative(),
    })
    .nullable(),
  workspaceFingerprint: z
    .string()
    .regex(/^[a-f0-9]{64}$/u)
    .nullable(),
});

type ICanonicalJson =
  null | boolean | number | string | ICanonicalJson[] | { [key: string]: ICanonicalJson };

const canonicalize = (input: unknown): ICanonicalJson => {
  if (
    input === null ||
    typeof input === 'boolean' ||
    typeof input === 'number' ||
    typeof input === 'string'
  ) {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(canonicalize);
  }

  if (typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input as Readonly<Record<string, unknown>>)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, value]) => [key, canonicalize(value)]),
    );
  }

  throw new TypeError('Cache-key input must be JSON-compatible.');
};

const getDefaultCacheRoot = (): string => path.join(LOCAL_QUALIFICATION_ROOT, 'cache');

const getCacheDirectory = (cacheRoot: string, cacheKey: string): string =>
  path.join(cacheRoot, cacheKey);

const createCacheStagingDirectory = (cacheRoot: string, cacheKey: string): string =>
  path.join(cacheRoot, `.${cacheKey}.${process.pid}.${randomUUID()}.tmp`);

/** Commits one fully written cache entry without exposing partial files as a hit. */
const commitCacheDirectory = async (
  stagingDirectory: string,
  cacheDirectory: string,
): Promise<void> => {
  await rm(cacheDirectory, { force: true, recursive: true });
  await rename(stagingDirectory, cacheDirectory);
};

/** Calculates an exact, order-stable cache key from JSON-compatible stage inputs. */
export const calculateModelCacheKey = (input: unknown): string =>
  calculateSha256(`${JSON.stringify(canonicalize(input))}\n`);

const readCacheMetadata = async (
  cacheRoot: string,
  cacheKey: string,
): Promise<IModelCacheMetadata | null> => {
  try {
    const metadata = await readJsonFile(
      path.join(getCacheDirectory(cacheRoot, cacheKey), 'metadata.json'),
      ModelCacheMetadataSchema,
    );
    return metadata.cacheKey === cacheKey ? metadata : null;
  } catch {
    return null;
  }
};

/** Restores an actor output and exact post-actor project snapshot for one matching cache key. */
export const readActorCache = async (
  cacheKey: string,
  workspaceDirectory: string,
  cacheRoot: string = getDefaultCacheRoot(),
): Promise<IActorCacheHit | null> => {
  const metadata = await readCacheMetadata(cacheRoot, cacheKey);

  if (metadata?.role !== 'actor') {
    return null;
  }

  let output: IActorOutput;
  let events: string;
  let workspaceSnapshotDirectory: string;

  try {
    const cacheDirectory = getCacheDirectory(cacheRoot, cacheKey);
    const outputPath = path.join(cacheDirectory, 'output.json');
    const eventsPath = path.join(cacheDirectory, 'events.jsonl');
    workspaceSnapshotDirectory = path.join(cacheDirectory, 'workspace');
    output = await readJsonFile(outputPath, ActorOutputSchema);
    events = await readFile(eventsPath, 'utf8');
    const [outputSha256, eventsSha256, workspaceFingerprint] = await Promise.all([
      calculateFileSha256(outputPath),
      calculateFileSha256(eventsPath),
      calculateDirectoryFingerprint(workspaceSnapshotDirectory),
    ]);

    if (
      metadata.outputSha256 !== outputSha256 ||
      metadata.eventsSha256 !== eventsSha256 ||
      metadata.workspaceFingerprint !== workspaceFingerprint
    ) {
      return null;
    }
  } catch {
    return null;
  }

  await restoreQualificationWorkspaceSnapshot(workspaceDirectory, workspaceSnapshotDirectory);
  return { metadata: { ...metadata, role: 'actor' }, output, events };
};

/** Persists a successful actor output and exact project snapshot under an immutable cache key. */
export const writeActorCache = async (options: {
  cacheKey: string;
  sourceAttemptId: string;
  output: IActorOutput;
  durationMs: number;
  events: string;
  usage: IModelCacheMetadata['usage'];
  workspaceDirectory: string;
  cacheRoot?: string;
}): Promise<void> => {
  const cacheDirectory = getCacheDirectory(
    options.cacheRoot ?? getDefaultCacheRoot(),
    options.cacheKey,
  );
  const cacheRoot = path.dirname(cacheDirectory);
  const stagingDirectory = createCacheStagingDirectory(cacheRoot, options.cacheKey);
  await ensureDirectory(cacheRoot);
  await rm(stagingDirectory, { force: true, recursive: true });

  try {
    await ensureDirectory(stagingDirectory);
    const outputPath = path.join(stagingDirectory, 'output.json');
    const eventsPath = path.join(stagingDirectory, 'events.jsonl');
    const workspaceSnapshotDirectory = path.join(stagingDirectory, 'workspace');
    await writeJsonFileAtomically(outputPath, options.output);
    await writeFile(eventsPath, options.events, 'utf8');
    await captureQualificationWorkspaceSnapshot(
      options.workspaceDirectory,
      workspaceSnapshotDirectory,
    );
    const [outputSha256, eventsSha256, workspaceFingerprint] = await Promise.all([
      calculateFileSha256(outputPath),
      calculateFileSha256(eventsPath),
      calculateDirectoryFingerprint(workspaceSnapshotDirectory),
    ]);
    await writeJsonFileAtomically(path.join(stagingDirectory, 'metadata.json'), {
      protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
      cacheKey: options.cacheKey,
      role: 'actor',
      sourceAttemptId: options.sourceAttemptId,
      createdAt: new Date().toISOString(),
      durationMs: options.durationMs,
      eventsSha256,
      outputSha256,
      usage: options.usage,
      workspaceFingerprint,
    });
    await commitCacheDirectory(stagingDirectory, cacheDirectory);
  } finally {
    await rm(stagingDirectory, { force: true, recursive: true });
  }
};

/** Reads one exact cached judge decision without changing its original evidence timestamp. */
export const readJudgeCache = async (
  cacheKey: string,
  cacheRoot: string = getDefaultCacheRoot(),
): Promise<IJudgeCacheHit | null> => {
  const metadata = await readCacheMetadata(cacheRoot, cacheKey);

  if (metadata?.role !== 'judge') {
    return null;
  }

  try {
    const cacheDirectory = getCacheDirectory(cacheRoot, cacheKey);
    const outputPath = path.join(cacheDirectory, 'output.json');
    const eventsPath = path.join(cacheDirectory, 'events.jsonl');
    const output = await readJsonFile(outputPath, JudgeOutputSchema);
    const events = await readFile(eventsPath, 'utf8');
    const [outputSha256, eventsSha256] = await Promise.all([
      calculateFileSha256(outputPath),
      calculateFileSha256(eventsPath),
    ]);

    if (
      metadata.outputSha256 !== outputSha256 ||
      metadata.eventsSha256 !== eventsSha256 ||
      metadata.workspaceFingerprint !== null
    ) {
      return null;
    }

    return { metadata: { ...metadata, role: 'judge' }, output, events };
  } catch {
    return null;
  }
};

/** Persists one successful structured judge decision under an immutable cache key. */
export const writeJudgeCache = async (options: {
  cacheKey: string;
  sourceAttemptId: string;
  output: IJudgeOutput;
  durationMs: number;
  events: string;
  usage: IModelCacheMetadata['usage'];
  cacheRoot?: string;
}): Promise<void> => {
  const cacheDirectory = getCacheDirectory(
    options.cacheRoot ?? getDefaultCacheRoot(),
    options.cacheKey,
  );
  const cacheRoot = path.dirname(cacheDirectory);
  const stagingDirectory = createCacheStagingDirectory(cacheRoot, options.cacheKey);
  await ensureDirectory(cacheRoot);
  await rm(stagingDirectory, { force: true, recursive: true });

  try {
    await ensureDirectory(stagingDirectory);
    const outputPath = path.join(stagingDirectory, 'output.json');
    const eventsPath = path.join(stagingDirectory, 'events.jsonl');
    await writeJsonFileAtomically(outputPath, options.output);
    await writeFile(eventsPath, options.events, 'utf8');
    const [outputSha256, eventsSha256] = await Promise.all([
      calculateFileSha256(outputPath),
      calculateFileSha256(eventsPath),
    ]);
    await writeJsonFileAtomically(path.join(stagingDirectory, 'metadata.json'), {
      protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
      cacheKey: options.cacheKey,
      role: 'judge',
      sourceAttemptId: options.sourceAttemptId,
      createdAt: new Date().toISOString(),
      durationMs: options.durationMs,
      eventsSha256,
      outputSha256,
      usage: options.usage,
      workspaceFingerprint: null,
    });
    await commitCacheDirectory(stagingDirectory, cacheDirectory);
  } finally {
    await rm(stagingDirectory, { force: true, recursive: true });
  }
};
