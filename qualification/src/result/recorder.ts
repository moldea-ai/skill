import { randomUUID } from 'node:crypto';
import { access, lstat, readFile, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';

import {
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  QUALIFICATION_RESULTS_ROOT,
} from '../constants/index.ts';
import {
  QualificationAttemptResultSchema,
  QualificationLatestResultSchema,
  type IQualificationAttemptResult,
  type IQualificationLatestResult,
} from '../contracts/index.ts';
import {
  calculateFileSha256,
  ensureDirectory,
  listDirectoryFiles,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import { sanitizeEvidenceText, sanitizeEvidenceValue } from './sanitizer.ts';
import type {
  IQualificationResultVerification,
  IQualificationResultVerificationIssue,
  IRecordQualificationResultOptions,
} from './types.ts';

const pathExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

const getTargetRoot = (resultsRoot: string, adapterId: string, implementationId: string): string =>
  path.join(resultsRoot, adapterId, implementationId);

const calculateArtifactDigests = async (
  artifactDirectory: string,
): Promise<Record<string, string>> => {
  const artifactPaths = (await listDirectoryFiles(artifactDirectory)).filter(
    (artifactPath) => artifactPath !== 'attempt.json',
  );
  const digestEntries = await Promise.all(
    artifactPaths.map(
      async (artifactPath) =>
        [
          artifactPath,
          await calculateFileSha256(path.join(artifactDirectory, artifactPath)),
        ] as const,
    ),
  );

  return Object.fromEntries(digestEntries);
};

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

/** Copies public evidence through a final path, credential, JSON, and symlink sanitization boundary. */
const sanitizeArtifactDirectory = async (
  sourceDirectory: string,
  destinationDirectory: string,
  context: IRecordQualificationResultOptions['sanitizationContext'],
): Promise<void> => {
  const artifactPaths = await listDirectoryFiles(sourceDirectory);
  await ensureDirectory(destinationDirectory);

  for (const artifactPath of artifactPaths) {
    const sourcePath = path.join(sourceDirectory, artifactPath);
    const stats = await lstat(sourcePath);

    if (!stats.isFile()) {
      throw new Error(`Public qualification evidence must be a regular file: ${artifactPath}`);
    }

    const destinationPath = path.join(destinationDirectory, artifactPath);
    const source = await readFile(sourcePath, 'utf8');

    if (artifactPath.endsWith('.json')) {
      await writeJsonFileAtomically(
        destinationPath,
        sanitizeEvidenceValue(JSON.parse(source) as unknown, context),
      );
    } else if (artifactPath.endsWith('.jsonl')) {
      await writeTextFileAtomically(destinationPath, sanitizeJsonLines(source, context));
    } else {
      await writeTextFileAtomically(destinationPath, sanitizeEvidenceText(source, context));
    }
  }
};

const readRecordedAttempts = async (
  targetRoot: string,
  expectedSelection: { adapterId: string; implementationId: string },
): Promise<IQualificationAttemptResult[]> => {
  const attemptsRoot = path.join(targetRoot, 'attempts');

  if (!(await pathExists(attemptsRoot))) {
    return [];
  }

  const entries = await readdir(attemptsRoot, { withFileTypes: true });
  const attempts: IQualificationAttemptResult[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }

    const result = await readJsonFile(
      path.join(attemptsRoot, entry.name, 'attempt.json'),
      QualificationAttemptResultSchema,
    );

    if (
      result.attemptId !== entry.name ||
      result.selection.adapterId !== expectedSelection.adapterId ||
      result.selection.implementationId !== expectedSelection.implementationId
    ) {
      throw new Error(`Attempt ${entry.name} does not match its result directory identity.`);
    }

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
  const targetRoot = getTargetRoot(resultsRoot, adapterId, implementationId);
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
  const targetRoot = getTargetRoot(
    resultsRoot,
    sanitizedDraft.selection.adapterId,
    sanitizedDraft.selection.implementationId,
  );
  const attemptsRoot = path.join(targetRoot, 'attempts');
  const attemptDirectory = path.join(attemptsRoot, sanitizedDraft.attemptId);
  const stagingDirectory = path.join(
    attemptsRoot,
    `.${sanitizedDraft.attemptId}.${process.pid}.${randomUUID()}.tmp`,
  );
  await ensureDirectory(attemptsRoot);

  try {
    await rm(stagingDirectory, { force: true, recursive: true });
    await sanitizeArtifactDirectory(
      options.artifactDirectory,
      stagingDirectory,
      options.sanitizationContext,
    );
    const artifactDigests = await calculateArtifactDigests(stagingDirectory);
    const result = QualificationAttemptResultSchema.parse({
      ...sanitizedDraft,
      artifactDigests,
    });

    if (await pathExists(attemptDirectory)) {
      const recordedResult = await readJsonFile(
        path.join(attemptDirectory, 'attempt.json'),
        QualificationAttemptResultSchema,
      );

      if (JSON.stringify(recordedResult) !== JSON.stringify(result)) {
        throw new Error(`Attempt ${result.attemptId} is already recorded with different evidence.`);
      }

      await updateLatestResult(
        resultsRoot,
        result.selection.adapterId,
        result.selection.implementationId,
      );
      return recordedResult;
    }

    await writeJsonFileAtomically(path.join(stagingDirectory, 'attempt.json'), result);
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
  result: IQualificationAttemptResult,
  issues: IQualificationResultVerificationIssue[],
  resultsRoot: string,
): Promise<void> => {
  const actualDigests = await calculateArtifactDigests(attemptDirectory);

  if (JSON.stringify(actualDigests) !== JSON.stringify(result.artifactDigests)) {
    issues.push({
      path: path.relative(resultsRoot, attemptDirectory),
      message: 'Artifact digests do not match attempt.json.',
    });
  }
};

/** Verifies every committed attempt, artifact digest, and latest pointer without executing a test. */
export const verifyQualificationResults = async (
  resultsRoot: string = QUALIFICATION_RESULTS_ROOT,
): Promise<IQualificationResultVerification> => {
  const issues: IQualificationResultVerificationIssue[] = [];
  let attempts = 0;

  if (!(await pathExists(resultsRoot))) {
    return { passed: true, attempts, issues };
  }

  const adapterEntries = await readdir(resultsRoot, { withFileTypes: true });

  for (const adapterEntry of adapterEntries) {
    if (!adapterEntry.isDirectory()) {
      continue;
    }

    const adapterRoot = path.join(resultsRoot, adapterEntry.name);
    const implementationEntries = await readdir(adapterRoot, { withFileTypes: true });

    for (const implementationEntry of implementationEntries) {
      if (!implementationEntry.isDirectory()) {
        continue;
      }

      const targetRoot = path.join(adapterRoot, implementationEntry.name);

      try {
        const recordedAttempts = await readRecordedAttempts(targetRoot, {
          adapterId: adapterEntry.name,
          implementationId: implementationEntry.name,
        });
        attempts += recordedAttempts.length;

        for (const result of recordedAttempts) {
          await verifyAttemptArtifacts(
            path.join(targetRoot, 'attempts', result.attemptId),
            result,
            issues,
            resultsRoot,
          );
        }

        const latestPath = path.join(targetRoot, 'latest.json');

        if (recordedAttempts.length > 0) {
          const latest = await readJsonFile(latestPath, QualificationLatestResultSchema);
          const expectedLatest = recordedAttempts.at(-1);
          const expectedPassing = recordedAttempts
            .filter(({ status }) => status === 'passed')
            .at(-1);

          if (
            latest.adapterId !== adapterEntry.name ||
            latest.implementationId !== implementationEntry.name ||
            latest.latestAttemptId !== expectedLatest?.attemptId ||
            latest.latestStatus !== expectedLatest?.status ||
            latest.lastPassingAttemptId !== (expectedPassing?.attemptId ?? null)
          ) {
            issues.push({
              path: path.relative(resultsRoot, path.join(targetRoot, 'latest.json')),
              message: 'Latest pointer does not match recorded attempt history.',
            });
          }
        } else if (await pathExists(latestPath)) {
          issues.push({
            path: path.relative(resultsRoot, latestPath),
            message: 'Latest pointer exists without any recorded attempt history.',
          });
        }
      } catch (error) {
        issues.push({
          path: path.relative(resultsRoot, targetRoot),
          message: error instanceof Error ? error.message : 'Unknown result verification failure.',
        });
      }
    }
  }

  return { passed: issues.length === 0, attempts, issues };
};

/** Lists every committed latest pointer for local status presentation. */
export const listLatestQualificationResults = async (
  resultsRoot: string = QUALIFICATION_RESULTS_ROOT,
): Promise<IQualificationLatestResult[]> => {
  if (!(await pathExists(resultsRoot))) {
    return [];
  }

  const latestResults: IQualificationLatestResult[] = [];
  const adapterEntries = await readdir(resultsRoot, { withFileTypes: true });

  for (const adapterEntry of adapterEntries) {
    if (!adapterEntry.isDirectory()) {
      continue;
    }

    const implementationEntries = await readdir(path.join(resultsRoot, adapterEntry.name), {
      withFileTypes: true,
    });

    for (const implementationEntry of implementationEntries) {
      if (!implementationEntry.isDirectory()) {
        continue;
      }

      const latestPath = path.join(
        resultsRoot,
        adapterEntry.name,
        implementationEntry.name,
        'latest.json',
      );

      if (await pathExists(latestPath)) {
        latestResults.push(await readJsonFile(latestPath, QualificationLatestResultSchema));
      }
    }
  }

  return latestResults.sort(
    (left, right) =>
      left.adapterId.localeCompare(right.adapterId, 'en') ||
      left.implementationId.localeCompare(right.implementationId, 'en'),
  );
};
