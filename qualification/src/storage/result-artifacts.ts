import { Buffer } from 'node:buffer';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

import type { IQualificationAttemptResult } from '../contracts/index.ts';
import {
  calculateFileSha256,
  calculateSha256,
  readJsonFile,
  resolveContainedPath,
} from '../filesystem/index.ts';
import {
  QualificationAttemptStorageSchema,
  type IQualificationArtifactStorageEntry,
  type IQualificationAttemptStorage,
  type IQualificationCompatibilityIdentity,
} from './types.ts';

const POSIX_RELATIVE_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)(?!.*\0).+$/u;
const MAXIMUM_PHYSICAL_ARTIFACT_NAME_LENGTH = 64;
const PHYSICAL_ARTIFACT_NAME_PATTERN = /^f[1-9][0-9]*(?:\.[a-z0-9]+)?$/u;

const assertLogicalArtifactPath = (logicalPath: string): void => {
  if (
    !POSIX_RELATIVE_PATH_PATTERN.test(logicalPath) ||
    path.posix.normalize(logicalPath) !== logicalPath
  ) {
    throw new Error(`Qualification artifact path is not a contained POSIX path: ${logicalPath}`);
  }
};

/** Creates the deterministic short physical key for one complete logical attempt id. */
export const createQualificationAttemptKey = (attemptId: string): string =>
  `a-${calculateSha256(attemptId).slice(0, 32)}`;

/** Creates a stable short physical mapping for an ordered logical artifact inventory. */
export const createQualificationArtifactStorageEntries = (
  artifactDigests: Readonly<Record<string, string>>,
): IQualificationArtifactStorageEntry[] =>
  Object.entries(artifactDigests)
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([logicalPath, sha256], artifactIndex) => {
      assertLogicalArtifactPath(logicalPath);
      const extension = path.posix.extname(logicalPath).toLowerCase();
      const physicalName = `f${artifactIndex + 1}${extension}`;

      if (
        !PHYSICAL_ARTIFACT_NAME_PATTERN.test(physicalName) ||
        Buffer.byteLength(physicalName, 'utf8') > MAXIMUM_PHYSICAL_ARTIFACT_NAME_LENGTH
      ) {
        throw new Error(
          `Qualification artifact storage name is not portable within ${MAXIMUM_PHYSICAL_ARTIFACT_NAME_LENGTH} bytes: ${logicalPath}`,
        );
      }

      const physicalPath = `artifacts/${physicalName}`;

      return { logicalPath, physicalPath, sha256 };
    });

/** Builds and validates one strict storage manifest without changing the logical attempt. */
export const createQualificationAttemptStorage = (options: {
  attemptDigest: string;
  cliClosureDigest: string;
  compatibility: IQualificationCompatibilityIdentity;
  portableSkillBehaviorDigest: string;
  result: IQualificationAttemptResult;
}): IQualificationAttemptStorage => {
  const attemptIdDigest = calculateSha256(options.result.attemptId);

  return QualificationAttemptStorageSchema.parse({
    version: 1,
    attemptKey: createQualificationAttemptKey(options.result.attemptId),
    attemptId: options.result.attemptId,
    attemptIdDigest,
    attemptDigest: options.attemptDigest,
    sourceCommit: options.result.provenance.qualificationRepositoryCommit,
    compatibility: options.compatibility,
    portableSkillBehaviorDigest: options.portableSkillBehaviorDigest,
    cliClosureDigest: options.cliClosureDigest,
    artifacts: createQualificationArtifactStorageEntries(options.result.artifactDigests),
  });
};

/** Reads the strict storage manifest beside one physical attempt. */
export const readQualificationAttemptStorage = (
  attemptDirectory: string,
): Promise<IQualificationAttemptStorage> =>
  readJsonFile(path.join(attemptDirectory, 'storage.json'), QualificationAttemptStorageSchema);

/** Resolves one logical artifact through a verified contained short physical mapping. */
export const resolveQualificationArtifactPath = (
  attemptDirectory: string,
  storage: IQualificationAttemptStorage,
  logicalPath: string,
): string => {
  assertLogicalArtifactPath(logicalPath);
  const artifact = storage.artifacts.find(
    ({ logicalPath: candidatePath }) => candidatePath === logicalPath,
  );

  if (artifact === undefined) {
    throw new Error(`Qualification storage is missing logical artifact ${logicalPath}.`);
  }

  return resolveContainedPath(attemptDirectory, artifact.physicalPath);
};

/** Verifies manifest identity, containment, artifact inventory, and exact stored bytes. */
export const verifyQualificationAttemptStorage = async (options: {
  attemptDirectory: string;
  result: IQualificationAttemptResult;
  storage?: IQualificationAttemptStorage;
}): Promise<IQualificationAttemptStorage> => {
  const storage =
    options.storage ?? (await readQualificationAttemptStorage(options.attemptDirectory));
  const attemptPath = path.join(options.attemptDirectory, 'attempt.json');
  const expectedAttemptKey = createQualificationAttemptKey(options.result.attemptId);
  const attemptDirectoryName = path.basename(options.attemptDirectory);
  const hasExpectedAttemptDirectory =
    attemptDirectoryName === expectedAttemptKey ||
    (attemptDirectoryName.startsWith(`.${expectedAttemptKey}.`) &&
      attemptDirectoryName.endsWith('.tmp'));
  const expectedAttemptIdDigest = calculateSha256(options.result.attemptId);
  const expectedArtifactEntries = createQualificationArtifactStorageEntries(
    options.result.artifactDigests,
  );

  if (
    storage.attemptKey !== expectedAttemptKey ||
    !hasExpectedAttemptDirectory ||
    storage.attemptId !== options.result.attemptId ||
    storage.attemptIdDigest !== expectedAttemptIdDigest ||
    storage.attemptDigest !== (await calculateFileSha256(attemptPath)) ||
    storage.sourceCommit !== options.result.provenance.qualificationRepositoryCommit ||
    JSON.stringify(storage.artifacts) !== JSON.stringify(expectedArtifactEntries)
  ) {
    throw new Error(`Qualification storage does not match attempt ${options.result.attemptId}.`);
  }

  const expectedRootEntries = [
    'attempt.json',
    'storage.json',
    ...(storage.artifacts.length === 0 ? [] : ['artifacts']),
  ].sort((left, right) => left.localeCompare(right, 'en'));
  const rootEntries = await readdir(options.attemptDirectory, { withFileTypes: true });
  const actualRootEntries = rootEntries
    .map(({ name }) => name)
    .sort((left, right) => left.localeCompare(right, 'en'));
  const attemptEntry = rootEntries.find(({ name }) => name === 'attempt.json');
  const storageEntry = rootEntries.find(({ name }) => name === 'storage.json');

  if (
    JSON.stringify(actualRootEntries) !== JSON.stringify(expectedRootEntries) ||
    !attemptEntry?.isFile() ||
    !storageEntry?.isFile()
  ) {
    throw new Error('Qualification attempt storage has an unexpected physical file inventory.');
  }

  if (storage.artifacts.length > 0) {
    const artifactsDirectory = path.join(options.attemptDirectory, 'artifacts');
    const artifactsEntry = rootEntries.find(({ name }) => name === 'artifacts');
    const physicalArtifactNames = storage.artifacts
      .map(({ physicalPath }) => path.posix.basename(physicalPath))
      .sort((left, right) => left.localeCompare(right, 'en'));
    const artifactEntries = await readdir(artifactsDirectory, { withFileTypes: true });
    const actualArtifactNames = artifactEntries
      .map(({ name }) => name)
      .sort((left, right) => left.localeCompare(right, 'en'));

    if (
      !artifactsEntry?.isDirectory() ||
      JSON.stringify(actualArtifactNames) !== JSON.stringify(physicalArtifactNames) ||
      artifactEntries.some((entry) => !entry.isFile())
    ) {
      throw new Error('Qualification attempt storage has an unexpected artifact inventory.');
    }
  }

  await Promise.all(
    storage.artifacts.map(async (artifact) => {
      const artifactPath = resolveQualificationArtifactPath(
        options.attemptDirectory,
        storage,
        artifact.logicalPath,
      );
      if ((await calculateFileSha256(artifactPath)) !== artifact.sha256) {
        throw new Error(`Qualification artifact digest does not match ${artifact.logicalPath}.`);
      }
    }),
  );

  return storage;
};
