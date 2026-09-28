import { createReadStream } from 'node:fs';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { z } from 'zod';

import {
  EXCLUDED_DIRECTORY_NAMES,
  resolveContainedPath,
} from '../../../../src/filesystem/index.ts';

import {
  PROJECT_RUN_MAX_FILE_BYTES,
  PROJECT_RUN_REPOSITORY,
  PROJECT_RUN_TIMEOUT_MS,
} from './constants.ts';
import {
  createProjectAttempt,
  createProjectRunModel,
  encodeProjectRunPath,
} from './presentation.ts';
import {
  ProjectAttemptRecordSchema,
  ProjectRunIndexSchema,
  ProjectRunPathSchema,
  ProjectRunRecordSchema,
  ProjectRunSelectionSchema,
  type IProjectAttempt,
  type IProjectRunModel,
  type IProjectRunSource,
} from './types.ts';

/** Reads a metadata stream with the same memory bound on disk and over HTTP. */
const readBoundedText = async (
  chunks: AsyncIterable<Uint8Array>,
  sourcePath: string,
): Promise<string> => {
  const buffers: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of chunks) {
    size += chunk.byteLength;
    if (size > PROJECT_RUN_MAX_FILE_BYTES)
      throw new Error(
        `Project run source ${sourcePath} exceeds ${PROJECT_RUN_MAX_FILE_BYTES} bytes.`,
      );
    buffers.push(chunk);
  }
  return Buffer.concat(buffers).toString('utf8');
};

/** Rejects linked path components before reading an explicitly referenced local file. */
const readLocalText = async (root: string, sourcePath: string): Promise<string> => {
  const components = sourcePath.split('/');
  let current = root;
  for (const [index, component] of components.entries()) {
    current = path.join(current, component);
    const info = await lstat(current);
    if (
      info.isSymbolicLink() ||
      (index < components.length - 1 ? !info.isDirectory() : !info.isFile())
    ) {
      throw new Error(
        `Project run source ${sourcePath} must contain only ordinary directories and a regular file.`,
      );
    }
  }
  return readBoundedText(createReadStream(resolveContainedPath(root, sourcePath)), sourcePath);
};

/** Reads only the fixed public repository at a full commit, with no redirect fallback. */
const readPublicText = async (commit: string, sourcePath: string): Promise<string> => {
  const response = await fetch(
    `https://raw.githubusercontent.com/${PROJECT_RUN_REPOSITORY}/${commit}/${encodeProjectRunPath(sourcePath)}`,
    {
      signal: AbortSignal.timeout(PROJECT_RUN_TIMEOUT_MS),
      redirect: 'error',
    },
  );
  try {
    if (!response.ok || response.body === null)
      throw new Error(`Project run source ${sourcePath} returned HTTP ${response.status}.`);
    const declaredSize = response.headers.get('content-length');
    if (declaredSize !== null && Number(declaredSize) > PROJECT_RUN_MAX_FILE_BYTES)
      throw new Error(
        `Project run source ${sourcePath} exceeds ${PROJECT_RUN_MAX_FILE_BYTES} bytes.`,
      );
    return await readBoundedText(response.body, sourcePath);
  } finally {
    if (response.body !== null && !response.body.locked) await response.body.cancel();
  }
};

/**
 * Loads exactly one run and its referenced metadata. Local roots are read-only.
 * @returns The source-derived website model, with local links suppressed.
 * @throws
 * - Project run source root is excluded.
 * - If the requested identity or source root is invalid.
 * - Project run source could not be loaded
 */
export const loadProjectRun = async (source: IProjectRunSource): Promise<IProjectRunModel> => {
  ProjectRunRecordSchema.shape.runId.parse(source.runId);
  if (source.kind !== 'local')
    ProjectRunSelectionSchema.shape.run
      .unwrap()
      .parse({ commit: source.commit, runId: source.runId });
  if (
    source.kind !== 'public' &&
    path
      .resolve(source.root)
      .split(path.sep)
      .some((part) => EXCLUDED_DIRECTORY_NAMES.has(part))
  )
    throw new Error('Project run source root is excluded.');
  const root = source.kind === 'public' ? null : await realpath(path.resolve(source.root));
  if (root !== null && root.split(path.sep).some((part) => EXCLUDED_DIRECTORY_NAMES.has(part)))
    throw new Error('Project run source root is excluded.');
  let currentPath = 'evidence/index.json';
  const readText = async (sourcePath: string, commit?: string): Promise<string> => {
    currentPath = ProjectRunPathSchema.parse(sourcePath);
    return source.kind === 'public'
      ? readPublicText(commit ?? source.commit, currentPath)
      : readLocalText(root!, currentPath);
  };
  const readRecord = async <T>(sourcePath: string, schema: z.ZodType<T>): Promise<T> =>
    schema.parse(JSON.parse(await readText(sourcePath)));
  try {
    const index = await readRecord('evidence/index.json', ProjectRunIndexSchema);
    const matches = index.runs.filter(({ runId }) => runId === source.runId);
    if (matches.length !== 1)
      throw new Error('The requested run must have exactly one index entry.');
    const manifestPath = matches[0]!.manifestPath;
    const record = await readRecord(manifestPath, ProjectRunRecordSchema);
    if (record.runId !== source.runId)
      throw new Error('Run identity does not match the selection.');
    const attempts: IProjectAttempt[] = [];
    const ids = new Set<string>();
    const scenarioCache = new Map<string, string>();
    for (const attemptPath of record.attempts) {
      const attempt = await readRecord(attemptPath, ProjectAttemptRecordSchema);
      if (attempt.runId !== record.runId)
        throw new Error('Attempt identity does not match its run.');
      if (ids.has(attempt.attemptId)) throw new Error('Duplicate project attempt ID.');
      ids.add(attempt.attemptId);
      let scenario: string | null = null;
      if (attempt.scenarioDefinition !== undefined && 'path' in attempt.scenarioDefinition) {
        const definition = attempt.scenarioDefinition;
        const key = `${definition.commit}/${definition.path}`;
        scenario = scenarioCache.get(key) ?? (await readText(definition.path, definition.commit));
        scenarioCache.set(key, scenario);
      }
      attempts.push(createProjectAttempt(attempt, source, attemptPath, scenario));
    }
    return createProjectRunModel(record, source, manifestPath, attempts);
  } catch (cause) {
    throw new Error(
      `Project run source could not be loaded (${currentPath}). Check its format, references, and availability.`,
      { cause },
    );
  }
};

/**
 * Loads the maintainer's public snapshot; an empty selection performs no network work.
 * @returns The selected public run, or null.
 * @throws
 * - If the selection is missing or invalid.
 * - Project run source could not be loaded
 */
export const loadPublicProjectRuns = async (
  selectionPath: string,
): Promise<IProjectRunModel | null> => {
  const selection = ProjectRunSelectionSchema.parse(
    JSON.parse(await readFile(selectionPath, 'utf8')),
  );
  return selection.run === null ? null : loadProjectRun({ kind: 'public', ...selection.run });
};
