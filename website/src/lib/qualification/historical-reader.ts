import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import {
  QualificationAttemptResultSchema,
  QualificationLatestResultSchema,
  type IQualificationAttemptResult,
  type IQualificationLatestResult,
} from './types.ts';

const COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const RELEASE_PATTERN = /^v\d+\.\d+\.\d+$/u;
const GIT_TREE_RECORD_PATTERN = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/u;
const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const DEFAULT_HISTORICAL_ATTEMPT_COUNT = 60;
const MAXIMUM_GIT_OUTPUT_BYTES = 512 * 1024 * 1024;
const MAXIMUM_GIT_BLOB_BYTES = 64 * 1024 * 1024;
const MAXIMUM_GIT_TREE_ENTRY_COUNT = 16_384;
const RESULTS_ROOT = 'qualification/results';

// immutable blob and logical artifact sources for one historical attempt
export interface IHistoricalQualificationAttemptSource {
  artifactSources: ReadonlyMap<string, Buffer>;
  attemptPath: string;
  attemptSource: Buffer;
  result: IQualificationAttemptResult;
  sourceCommit: string;
  sourceRelease: string;
}

// validated immutable history grouped by its logical qualification target
export interface IHistoricalQualificationTargetSource {
  adapterId: string;
  attempts: IHistoricalQualificationAttemptSource[];
  implementationId: string;
  latest: IQualificationLatestResult;
}

interface IGitTreeEntry {
  objectId: string;
  path: string;
}

const hasExcludedDirectory = (relativePath: string): boolean =>
  relativePath.split('/').some((component) => EXCLUDED_DIRECTORY_NAMES.has(component));

const assertSafeGitPath = (relativePath: string): void => {
  if (
    relativePath === '' ||
    relativePath.includes('\0') ||
    relativePath.startsWith('/') ||
    relativePath.includes('\\') ||
    relativePath.includes('\ufffd') ||
    relativePath
      .split('/')
      .some((component) => component === '' || component === '.' || component === '..')
  ) {
    throw new Error(`Historical qualification path is not a contained POSIX path: ${relativePath}`);
  }

  if (hasExcludedDirectory(relativePath)) {
    throw new Error(`Historical qualification path enters an excluded directory: ${relativePath}`);
  }
};

const runGit = (repositoryRoot: string, args: string[], input?: Buffer): Buffer => {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: null,
    input,
    maxBuffer: MAXIMUM_GIT_OUTPUT_BYTES,
    windowsHide: true,
  });

  if (result.error !== undefined || result.status !== 0) {
    const detail = result.stderr?.toString('utf8').trim();
    throw new Error(
      `Git ${args[0] ?? 'command'} failed${detail ? `: ${detail}` : '.'}`,
      result.error === undefined ? undefined : { cause: result.error },
    );
  }

  return result.stdout ?? Buffer.alloc(0);
};

const resolveSourceCommit = (
  repositoryRoot: string,
  sourceRelease: string,
  expectedSourceCommit: string,
): void => {
  if (!RELEASE_PATTERN.test(sourceRelease) || !COMMIT_PATTERN.test(expectedSourceCommit)) {
    throw new Error('Historical qualification evidence requires an exact release and commit.');
  }

  let resolvedCommit: string;

  try {
    resolvedCommit = runGit(repositoryRoot, ['rev-parse', `${sourceRelease}^{commit}`])
      .toString('utf8')
      .trim();
  } catch (error) {
    throw new Error(
      `Cannot build qualification history without immutable ${sourceRelease}. Fetch the tag and full history, then retry.`,
      { cause: error },
    );
  }

  if (resolvedCommit !== expectedSourceCommit) {
    throw new Error(
      `${sourceRelease} must resolve to ${expectedSourceCommit} before qualification history can be built.`,
    );
  }
};

const listGitTree = (repositoryRoot: string, sourceCommit: string): IGitTreeEntry[] => {
  const source = runGit(repositoryRoot, [
    'ls-tree',
    '-r',
    '-z',
    '--full-tree',
    sourceCommit,
    '--',
    RESULTS_ROOT,
  ]);
  const entries = source
    .toString('utf8')
    .split('\0')
    .filter((record) => record !== '')
    .map((record): IGitTreeEntry => {
      const match = GIT_TREE_RECORD_PATTERN.exec(record);

      if (!match) throw new Error('Historical qualification tree contains an unsupported entry.');

      const objectId = match[2];
      const path = match[3];

      if (objectId === undefined || path === undefined) {
        throw new Error('Historical qualification tree contains an incomplete entry.');
      }

      assertSafeGitPath(path);
      return { objectId, path };
    });

  if (entries.length > MAXIMUM_GIT_TREE_ENTRY_COUNT) {
    throw new Error('Historical qualification tree exceeds the supported entry count.');
  }

  return entries;
};

const parseBatchBlobs = (
  source: Buffer,
  requestedObjectIds: readonly string[],
): Map<string, Buffer> => {
  const blobs = new Map<string, Buffer>();
  let offset = 0;

  for (const expectedObjectId of requestedObjectIds) {
    const headerEnd = source.indexOf(0x0a, offset);

    if (headerEnd === -1) throw new Error('Git batch output ended before its object header.');

    const [objectId, objectType, sizeSource] = source
      .subarray(offset, headerEnd)
      .toString('utf8')
      .split(' ');
    const size = Number.parseInt(sizeSource ?? '', 10);

    if (
      objectId !== expectedObjectId ||
      objectType !== 'blob' ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > MAXIMUM_GIT_BLOB_BYTES
    ) {
      throw new Error(`Git batch output contradicted object ${expectedObjectId}.`);
    }

    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;

    if (contentEnd >= source.length || source[contentEnd] !== 0x0a) {
      throw new Error(`Git batch output truncated object ${expectedObjectId}.`);
    }

    blobs.set(expectedObjectId, source.subarray(contentStart, contentEnd));
    offset = contentEnd + 1;
  }

  if (offset !== source.length) throw new Error('Git batch output contains trailing bytes.');

  return blobs;
};

const readGitBlobs = (
  repositoryRoot: string,
  entries: readonly IGitTreeEntry[],
): ReadonlyMap<string, Buffer> => {
  const objectIds = [...new Set(entries.map(({ objectId }) => objectId))];
  const blobs = new Map<string, Buffer>();

  for (let index = 0; index < objectIds.length; index += 128) {
    const batch = objectIds.slice(index, index + 128);
    const output = runGit(
      repositoryRoot,
      ['cat-file', '--batch'],
      Buffer.from(`${batch.join('\n')}\n`),
    );

    for (const [objectId, content] of parseBatchBlobs(output, batch)) {
      blobs.set(objectId, content);
    }
  }

  return blobs;
};

const requireBlob = (
  entry: IGitTreeEntry | undefined,
  blobs: ReadonlyMap<string, Buffer>,
  path: string,
): Buffer => {
  const source = entry === undefined ? undefined : blobs.get(entry.objectId);

  if (source === undefined) throw new Error(`Historical qualification object is missing: ${path}`);

  return source;
};

const parseJson = <Output>(
  source: Buffer,
  path: string,
  parse: (input: unknown) => Output,
): Output => {
  try {
    return parse(JSON.parse(source.toString('utf8')) as unknown);
  } catch (error) {
    throw new Error(`Historical qualification JSON is invalid: ${path}`, { cause: error });
  }
};

const validateLatestPointer = (
  latest: IQualificationLatestResult,
  attempts: readonly IHistoricalQualificationAttemptSource[],
): void => {
  const expectedLatest = attempts.at(-1)?.result;
  const expectedPassing = attempts
    .filter(({ result }) => result.status === 'passed')
    .at(-1)?.result;

  if (
    expectedLatest === undefined ||
    latest.adapterId !== expectedLatest.selection.adapterId ||
    latest.implementationId !== expectedLatest.selection.implementationId ||
    latest.protocolVersion !== expectedLatest.protocolVersion ||
    latest.latestAttemptId !== expectedLatest.attemptId ||
    latest.latestStatus !== expectedLatest.status ||
    latest.lastPassingAttemptId !== (expectedPassing?.attemptId ?? null)
  ) {
    throw new Error('Historical qualification latest pointer contradicts its attempt history.');
  }
};

/**
 * Reads and validates immutable qualification history directly from Git objects.
 * @param options Repository, source release, exact commit, and expected attempt count.
 * @returns Historical targets with digest-bound in-memory attempt and artifact sources.
 * @throws If source provenance, Git objects, paths, digests, inventory, or pointers are invalid.
 */
export const readHistoricalQualificationTargets = (options: {
  expectedAttemptCount?: number;
  repositoryRoot: string;
  sourceCommit: string;
  sourceRelease: string;
}): IHistoricalQualificationTargetSource[] => {
  const expectedAttemptCount = options.expectedAttemptCount ?? DEFAULT_HISTORICAL_ATTEMPT_COUNT;

  if (!Number.isSafeInteger(expectedAttemptCount) || expectedAttemptCount < 1) {
    throw new Error('Historical qualification attempt count must be a positive integer.');
  }

  resolveSourceCommit(options.repositoryRoot, options.sourceRelease, options.sourceCommit);
  const entries = listGitTree(options.repositoryRoot, options.sourceCommit);
  const entryByPath = new Map(entries.map((entry) => [entry.path, entry]));
  const blobs = readGitBlobs(options.repositoryRoot, entries);
  const accountedPaths = new Set<string>();
  const attemptEntries = entries.filter(({ path }) => path.endsWith('/attempt.json'));

  if (attemptEntries.length !== expectedAttemptCount) {
    throw new Error(
      `Immutable ${options.sourceRelease} qualification history must contain exactly ${expectedAttemptCount} attempts, found ${attemptEntries.length}.`,
    );
  }

  const attempts = attemptEntries.map((entry): IHistoricalQualificationAttemptSource => {
    const attemptSource = requireBlob(entry, blobs, entry.path);
    const result = parseJson(attemptSource, entry.path, (input) =>
      QualificationAttemptResultSchema.parse(input),
    );
    const expectedAttemptPath = `${RESULTS_ROOT}/${result.selection.adapterId}/${result.selection.implementationId}/attempts/${result.attemptId}/attempt.json`;

    if (entry.path !== expectedAttemptPath) {
      throw new Error(`Historical qualification attempt path contradicts ${result.attemptId}.`);
    }

    accountedPaths.add(entry.path);
    const attemptRoot = entry.path.slice(0, -'/attempt.json'.length);
    const artifactSources = new Map<string, Buffer>();

    for (const [logicalPath, expectedDigest] of Object.entries(result.artifactDigests)) {
      assertSafeGitPath(logicalPath);
      const artifactPath = `${attemptRoot}/${logicalPath}`;
      const artifactSource = requireBlob(entryByPath.get(artifactPath), blobs, artifactPath);
      const actualDigest = createHash('sha256').update(artifactSource).digest('hex');

      if (actualDigest !== expectedDigest) {
        throw new Error(
          `Historical qualification artifact digest does not match: ${result.attemptId}/${logicalPath}`,
        );
      }

      artifactSources.set(logicalPath, artifactSource);
      accountedPaths.add(artifactPath);
    }

    return {
      artifactSources,
      attemptPath: entry.path,
      attemptSource,
      result,
      sourceCommit: options.sourceCommit,
      sourceRelease: options.sourceRelease,
    };
  });

  const attemptIds = attempts.map(({ result }) => result.attemptId);

  if (new Set(attemptIds).size !== attemptIds.length) {
    throw new Error('Historical qualification attempt ids must be globally unique.');
  }

  const attemptsByTarget = new Map<string, IHistoricalQualificationAttemptSource[]>();

  for (const attempt of attempts) {
    const { adapterId, implementationId } = attempt.result.selection;
    const targetIdentity = `${adapterId}\0${implementationId}`;
    const targetAttempts = attemptsByTarget.get(targetIdentity) ?? [];
    targetAttempts.push(attempt);
    attemptsByTarget.set(targetIdentity, targetAttempts);
  }

  const targets = [...attemptsByTarget.values()].map(
    (targetAttempts): IHistoricalQualificationTargetSource => {
      targetAttempts.sort(
        (left, right) =>
          left.result.createdAt.localeCompare(right.result.createdAt, 'en') ||
          left.result.attemptId.localeCompare(right.result.attemptId, 'en'),
      );
      const selection = targetAttempts[0]?.result.selection;

      if (selection === undefined) throw new Error('Historical qualification target is empty.');

      const latestPath = `${RESULTS_ROOT}/${selection.adapterId}/${selection.implementationId}/latest.json`;
      const latestSource = requireBlob(entryByPath.get(latestPath), blobs, latestPath);
      const latest = parseJson(latestSource, latestPath, (input) =>
        QualificationLatestResultSchema.parse(input),
      );
      accountedPaths.add(latestPath);
      validateLatestPointer(latest, targetAttempts);

      return {
        adapterId: selection.adapterId,
        attempts: targetAttempts,
        implementationId: selection.implementationId,
        latest,
      };
    },
  );

  const resultsReadmePath = `${RESULTS_ROOT}/README.md`;
  requireBlob(entryByPath.get(resultsReadmePath), blobs, resultsReadmePath);
  accountedPaths.add(resultsReadmePath);
  const unaccountedEntry = entries.find(({ path }) => !accountedPaths.has(path));

  if (unaccountedEntry !== undefined) {
    throw new Error(
      `Historical qualification history contains an unaccounted object: ${unaccountedEntry.path}`,
    );
  }

  return targets.sort(
    (left, right) =>
      left.adapterId.localeCompare(right.adapterId, 'en') ||
      left.implementationId.localeCompare(right.implementationId, 'en'),
  );
};
