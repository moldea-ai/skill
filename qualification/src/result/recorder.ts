import { randomUUID } from 'node:crypto';
import { access, lstat, readFile, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';

import {
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  QUALIFICATION_RESULTS_ROOT,
  SKILL_REPOSITORY_ROOT,
} from '../constants/index.ts';
import {
  QualificationAttemptResultSchema,
  QualificationLatestResultSchema,
  QualificationRecordedAttemptResultSchema,
  QualificationRecordedLatestResultSchema,
  type IQualificationAttemptResult,
  type IQualificationRecordedAttemptResult,
  type IQualificationRecordedLatestResult,
} from '../contracts/index.ts';
import { createQualificationCompatibilityIdentityAtCommit } from '../evidence-identity/index.ts';
import { createQualificationCompatibilityIdentity } from '../evidence-identity/index.ts';
import {
  calculateSha256,
  ensureDirectory,
  listDirectoryFiles,
  readJsonFile,
  resolveContainedPath,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import {
  createQualificationAttemptKey,
  createQualificationAttemptStorage,
  loadQualificationProfileIndex,
  readQualificationAttemptStorage,
  resolveQualificationArtifactPath,
  resolveQualificationProfilesRootForResults,
  resolveQualificationResultTargetDirectory,
  verifyQualificationAttemptStorage,
  type IQualificationAttemptStorage,
  type IQualificationProfileIndexTarget,
} from '../storage/index.ts';
import { validateQualificationAttemptEvidence } from './evidence.ts';
import { sanitizeEvidenceText, sanitizeEvidenceValue } from './sanitizer.ts';
import type {
  IQualificationResultVerification,
  IQualificationResultVerificationIssue,
  IRecordQualificationResultOptions,
} from './types.ts';

type ISanitizedArtifact = {
  content: string;
  logicalPath: string;
  sha256: string;
};

const pathExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

const getTargetRoot = (
  resultsRoot: string,
  adapterId: string,
  implementationId: string,
): Promise<string> =>
  resolveQualificationResultTargetDirectory(resultsRoot, { adapterId, implementationId });

/** Sanitizes every structured event in a JSON Lines artifact while preserving line boundaries. */
const sanitizeJsonLines = (
  source: string,
  context: IRecordQualificationResultOptions['sanitizationContext'],
): string =>
  source
    .split('\n')
    .map((eventLine) =>
      eventLine.trim() === ''
        ? ''
        : JSON.stringify(sanitizeEvidenceValue(JSON.parse(eventLine) as unknown, context)),
    )
    .join('\n');

const sanitizeArtifactSource = (
  source: string,
  logicalPath: string,
  context: IRecordQualificationResultOptions['sanitizationContext'],
): string => {
  if (logicalPath.endsWith('.json')) {
    return `${JSON.stringify(
      sanitizeEvidenceValue(JSON.parse(source) as unknown, context),
      null,
      2,
    )}\n`;
  }
  if (logicalPath.endsWith('.jsonl')) {
    return sanitizeJsonLines(source, context);
  }
  return sanitizeEvidenceText(source, context);
};

/** Reads and sanitizes public artifacts before assigning any physical storage path. */
const readSanitizedArtifacts = async (
  sourceDirectory: string,
  context: IRecordQualificationResultOptions['sanitizationContext'],
): Promise<ISanitizedArtifact[]> => {
  const logicalPaths = await listDirectoryFiles(sourceDirectory);

  return Promise.all(
    logicalPaths.map(async (logicalPath) => {
      const sourcePath = resolveContainedPath(sourceDirectory, logicalPath);
      const stats = await lstat(sourcePath);

      if (!stats.isFile()) {
        throw new Error(`Public qualification evidence must be a regular file: ${logicalPath}`);
      }

      const content = sanitizeArtifactSource(
        await readFile(sourcePath, 'utf8'),
        logicalPath,
        context,
      );
      return { content, logicalPath, sha256: calculateSha256(content) };
    }),
  );
};

/** Writes sanitized logical artifacts only through their short contained physical mappings. */
const writeSanitizedArtifacts = async (
  attemptDirectory: string,
  storage: IQualificationAttemptStorage,
  artifacts: readonly ISanitizedArtifact[],
): Promise<void> => {
  await Promise.all(
    artifacts.map(async (artifact) => {
      const destinationPath = resolveQualificationArtifactPath(
        attemptDirectory,
        storage,
        artifact.logicalPath,
      );
      await writeTextFileAtomically(destinationPath, artifact.content);
    }),
  );
};

const readRecordedAttempts = async (
  targetRoot: string,
  expectedSelection: { adapterId: string; implementationId: string },
): Promise<IQualificationRecordedAttemptResult[]> => {
  const attemptsRoot = path.join(targetRoot, 'attempts');

  if (!(await pathExists(attemptsRoot))) {
    return [];
  }

  const entries = await readdir(attemptsRoot, { withFileTypes: true });
  const attempts: IQualificationRecordedAttemptResult[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^a-[a-f0-9]{32}$/u.test(entry.name)) {
      throw new Error(`Qualification attempts contain an unexpected entry: ${entry.name}`);
    }

    const attemptDirectory = path.join(attemptsRoot, entry.name);
    const result = await readJsonFile(
      path.join(attemptDirectory, 'attempt.json'),
      QualificationRecordedAttemptResultSchema,
    );

    if (
      createQualificationAttemptKey(result.attemptId) !== entry.name ||
      result.selection.adapterId !== expectedSelection.adapterId ||
      result.selection.implementationId !== expectedSelection.implementationId
    ) {
      throw new Error(`Attempt ${entry.name} does not match its result directory identity.`);
    }

    await verifyQualificationAttemptStorage({ attemptDirectory, result });
    attempts.push(result);
  }

  return attempts.sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt, 'en') ||
      left.attemptId.localeCompare(right.attemptId, 'en'),
  );
};

const updateLatestResult = async (
  resultsRoot: string,
  adapterId: string,
  implementationId: string,
): Promise<void> => {
  const targetRoot = await getTargetRoot(resultsRoot, adapterId, implementationId);
  const attempts = await readRecordedAttempts(targetRoot, { adapterId, implementationId });
  const latestAttempt = attempts.at(-1);

  if (latestAttempt === undefined) {
    return;
  }

  const lastPassingAttempt = attempts.filter(({ status }) => status === 'passed').at(-1);
  const latestResult = QualificationLatestResultSchema.parse({
    protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
    adapterId,
    implementationId,
    latestAttemptId: latestAttempt.attemptId,
    latestStatus: latestAttempt.status,
    lastPassingAttemptId: lastPassingAttempt?.attemptId ?? null,
    updatedAt: new Date().toISOString(),
  });

  await writeJsonFileAtomically(path.join(targetRoot, 'latest.json'), latestResult);
};

/**
 * Records pass, failure, error, or explicitly requested incomplete evidence without overwriting history.
 * @returns The immutable recorded result.
 * @throws
 * - If passing evidence was produced from dirty package, qualification-suite, or portable-skill source
 * - If the attempt identity already contains different evidence
 */
export const recordQualificationResult = async (
  options: IRecordQualificationResultOptions,
  resultsRoot: string = QUALIFICATION_RESULTS_ROOT,
): Promise<IQualificationAttemptResult> => {
  if (
    options.result.status === 'passed' &&
    (options.result.provenance.packagesRepositoryDirty ||
      options.result.provenance.qualificationRepositoryDirty ||
      options.result.provenance.skillRepositoryDirty)
  ) {
    throw new Error('Passing qualification evidence requires clean repository inputs.');
  }

  const sanitizedDraft = sanitizeEvidenceValue(options.result, options.sanitizationContext);
  const targetRoot = await getTargetRoot(
    resultsRoot,
    sanitizedDraft.selection.adapterId,
    sanitizedDraft.selection.implementationId,
  );
  const attemptsRoot = path.join(targetRoot, 'attempts');
  const attemptKey = createQualificationAttemptKey(sanitizedDraft.attemptId);
  const attemptDirectory = path.join(attemptsRoot, attemptKey);
  const stagingDirectory = path.join(
    attemptsRoot,
    `.${attemptKey}.${process.pid}.${randomUUID()}.tmp`,
  );
  const artifacts = await readSanitizedArtifacts(
    options.artifactDirectory,
    options.sanitizationContext,
  );
  const artifactDigests = Object.fromEntries(
    artifacts.map(({ logicalPath, sha256 }) => [logicalPath, sha256]),
  );
  const result = QualificationAttemptResultSchema.parse({
    ...sanitizedDraft,
    artifactDigests,
  });
  const qualificationRoot = path.resolve(
    await resolveQualificationProfilesRootForResults(resultsRoot),
    '..',
  );
  const adjacentRepositoryRoot = path.resolve(qualificationRoot, '..');
  const hasAdjacentRepository =
    path.basename(qualificationRoot) === 'qualification' &&
    ((await pathExists(path.join(adjacentRepositoryRoot, '.git'))) ||
      (await pathExists(path.join(qualificationRoot, 'src'))));
  const compatibility = await createQualificationCompatibilityIdentity({
    qualificationRoot,
    repositoryRoot: hasAdjacentRepository ? adjacentRepositoryRoot : SKILL_REPOSITORY_ROOT,
    selection: result.selection,
  });
  const attemptSource = `${JSON.stringify(result, null, 2)}\n`;
  const storage = createQualificationAttemptStorage({
    attemptDigest: calculateSha256(attemptSource),
    compatibility,
    result,
  });

  await ensureDirectory(attemptsRoot);

  try {
    await rm(stagingDirectory, { force: true, recursive: true });
    await ensureDirectory(stagingDirectory);
    await writeSanitizedArtifacts(stagingDirectory, storage, artifacts);
    await writeTextFileAtomically(path.join(stagingDirectory, 'attempt.json'), attemptSource);
    await writeJsonFileAtomically(path.join(stagingDirectory, 'storage.json'), storage);
    await verifyQualificationAttemptStorage({
      attemptDirectory: stagingDirectory,
      result,
      storage,
    });
    await validateQualificationAttemptEvidence({
      attemptDirectory: stagingDirectory,
      result,
      resultsRoot,
    });

    if (await pathExists(attemptDirectory)) {
      const recordedResult = await readJsonFile(
        path.join(attemptDirectory, 'attempt.json'),
        QualificationAttemptResultSchema,
      );
      const recordedStorage = await readQualificationAttemptStorage(attemptDirectory);

      if (
        JSON.stringify(recordedResult) !== JSON.stringify(result) ||
        JSON.stringify(recordedStorage) !== JSON.stringify(storage)
      ) {
        throw new Error(`Attempt ${result.attemptId} is already recorded with different evidence.`);
      }

      await verifyQualificationAttemptStorage({
        attemptDirectory,
        result: recordedResult,
        storage: recordedStorage,
      });
      await updateLatestResult(
        resultsRoot,
        result.selection.adapterId,
        result.selection.implementationId,
      );
      return recordedResult;
    }

    await rename(stagingDirectory, attemptDirectory);
    await updateLatestResult(
      resultsRoot,
      result.selection.adapterId,
      result.selection.implementationId,
    );
    return result;
  } finally {
    await rm(stagingDirectory, { force: true, recursive: true });
  }
};

const verifyAttemptArtifacts = async (
  attemptDirectory: string,
  result: IQualificationRecordedAttemptResult,
  issues: IQualificationResultVerificationIssue[],
  repositoryRoot: string,
  resultsRoot: string,
): Promise<void> => {
  try {
    const storage = await verifyQualificationAttemptStorage({ attemptDirectory, result });

    if (storage.carryForward !== undefined) {
      const expectedCompatibility = await createQualificationCompatibilityIdentityAtCommit({
        commit: storage.carryForward.sourceCommit,
        repositoryRoot,
        selection: result.selection,
      });

      if (JSON.stringify(storage.compatibility) !== JSON.stringify(expectedCompatibility)) {
        throw new Error('Qualification carry-forward compatibility does not match its source.');
      }
    }
  } catch (error) {
    issues.push({
      path: path.relative(resultsRoot, attemptDirectory),
      message: error instanceof Error ? error.message : 'Unknown qualification storage failure.',
    });
  }
};

const verifyQualificationTarget = async (options: {
  issues: IQualificationResultVerificationIssue[];
  repositoryRoot: string;
  resultsRoot: string;
  target: IQualificationProfileIndexTarget;
}): Promise<number> => {
  const targetRoot = resolveContainedPath(options.resultsRoot, options.target.key);

  try {
    if (!(await pathExists(targetRoot))) {
      return 0;
    }

    const recordedAttempts = await readRecordedAttempts(targetRoot, options.target);
    const targetEntries = await readdir(targetRoot, { withFileTypes: true });
    const attemptsEntry = targetEntries.find(({ name }) => name === 'attempts');
    const latestEntry = targetEntries.find(({ name }) => name === 'latest.json');

    if (
      targetEntries.length === 0 ||
      targetEntries.some(({ name }) => name !== 'attempts' && name !== 'latest.json') ||
      (attemptsEntry !== undefined && !attemptsEntry.isDirectory()) ||
      (latestEntry !== undefined && !latestEntry.isFile())
    ) {
      throw new Error('Qualification result target has an unexpected physical inventory.');
    }

    for (const result of recordedAttempts) {
      const attemptDirectory = path.join(
        targetRoot,
        'attempts',
        createQualificationAttemptKey(result.attemptId),
      );
      await verifyAttemptArtifacts(
        attemptDirectory,
        result,
        options.issues,
        options.repositoryRoot,
        options.resultsRoot,
      );

      try {
        await validateQualificationAttemptEvidence({
          attemptDirectory,
          result,
          resultsRoot: options.resultsRoot,
        });
      } catch (error) {
        options.issues.push({
          path: path.relative(options.resultsRoot, attemptDirectory),
          message:
            error instanceof Error
              ? error.message
              : 'Unknown qualification evidence validation failure.',
        });
      }
    }

    const latestPath = path.join(targetRoot, 'latest.json');

    if (recordedAttempts.length > 0) {
      const latest = await readJsonFile(latestPath, QualificationRecordedLatestResultSchema);
      const expectedLatest = recordedAttempts.at(-1);
      const expectedPassing = recordedAttempts.filter(({ status }) => status === 'passed').at(-1);

      if (
        latest.adapterId !== options.target.adapterId ||
        latest.implementationId !== options.target.implementationId ||
        latest.protocolVersion !== expectedLatest?.protocolVersion ||
        latest.latestAttemptId !== expectedLatest?.attemptId ||
        latest.latestStatus !== expectedLatest?.status ||
        latest.lastPassingAttemptId !== (expectedPassing?.attemptId ?? null)
      ) {
        options.issues.push({
          path: path.relative(options.resultsRoot, latestPath),
          message: 'Latest pointer does not match recorded attempt history.',
        });
      }
    } else if (await pathExists(latestPath)) {
      options.issues.push({
        path: path.relative(options.resultsRoot, latestPath),
        message: 'Latest pointer exists without any recorded attempt history.',
      });
    }

    return recordedAttempts.length;
  } catch (error) {
    options.issues.push({
      path: path.relative(options.resultsRoot, targetRoot),
      message: error instanceof Error ? error.message : 'Unknown result verification failure.',
    });
    return 0;
  }
};

/** Verifies every current short attempt, artifact digest, manifest, and latest pointer. */
export const verifyQualificationResults = async (
  resultsRoot: string = QUALIFICATION_RESULTS_ROOT,
  repositoryRoot: string = path.resolve(resultsRoot, '..', '..'),
): Promise<IQualificationResultVerification> => {
  const issues: IQualificationResultVerificationIssue[] = [];
  let attempts = 0;

  if (!(await pathExists(resultsRoot))) {
    return { passed: true, attempts, issues };
  }

  try {
    const profilesRoot = await resolveQualificationProfilesRootForResults(resultsRoot);
    const index = await loadQualificationProfileIndex(profilesRoot);
    const targetsByKey = new Map(index.targets.map((target) => [target.key, target]));
    const resultEntries = await readdir(resultsRoot, { withFileTypes: true });

    for (const resultEntry of resultEntries) {
      if (!resultEntry.isDirectory()) {
        issues.push({
          path: resultEntry.name,
          message: 'Result root entries must be directories.',
        });
        continue;
      }
      const target = targetsByKey.get(resultEntry.name);
      if (target === undefined) {
        issues.push({
          path: resultEntry.name,
          message: 'Result target key is not present in the qualification profile index.',
        });
        continue;
      }
      attempts += await verifyQualificationTarget({ issues, repositoryRoot, resultsRoot, target });
    }
  } catch (error) {
    issues.push({
      path: '.',
      message: error instanceof Error ? error.message : 'Unknown result verification failure.',
    });
  }

  return { passed: issues.length === 0, attempts, issues };
};

/** Lists every current short latest pointer while returning unchanged logical identifiers. */
export const listLatestQualificationResults = async (
  resultsRoot: string = QUALIFICATION_RESULTS_ROOT,
): Promise<IQualificationRecordedLatestResult[]> => {
  if (!(await pathExists(resultsRoot))) {
    return [];
  }

  const profilesRoot = await resolveQualificationProfilesRootForResults(resultsRoot);
  const index = await loadQualificationProfileIndex(profilesRoot);
  const latestResults: IQualificationRecordedLatestResult[] = [];

  for (const target of index.targets) {
    const latestPath = path.join(resultsRoot, target.key, 'latest.json');

    if (await pathExists(latestPath)) {
      const latest = await readJsonFile(latestPath, QualificationRecordedLatestResultSchema);
      if (
        latest.adapterId !== target.adapterId ||
        latest.implementationId !== target.implementationId
      ) {
        throw new Error(`Latest result ${target.key} does not match its indexed target.`);
      }
      latestResults.push(latest);
    }
  }

  return latestResults.sort(
    (left, right) =>
      left.adapterId.localeCompare(right.adapterId, 'en') ||
      left.implementationId.localeCompare(right.implementationId, 'en'),
  );
};
