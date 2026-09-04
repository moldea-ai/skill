import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readlink } from 'node:fs/promises';
import { join } from 'node:path';

const MAX_SCENARIO_EVIDENCE_FILE_BYTES = 32_768;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const hasExactKeys = (input, keys) =>
  Object.keys(input).length === keys.length && keys.every((key) => key in input);

/** Runs evaluator-owned Git inspection for cases that explicitly declare Git-state evidence. */
const inspectGit = (repositoryPath, argumentsList, allowFailure = false) => {
  const result = spawnSync(
    'git',
    [
      '-c',
      'core.fsmonitor=false',
      '-c',
      'diff.external=',
      '-c',
      'core.attributesFile=/dev/null',
      ...argumentsList,
    ],
    {
      cwd: repositoryPath,
      encoding: 'utf8',
      env: {
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_PAGER: 'cat',
        LANG: 'C.UTF-8',
        PATH: process.env.PATH,
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`Unable to inspect scenario Git state: ${result.stderr.trim()}`);
  }
  return result;
};

/** Reads one bounded file without assuming UTF-8 content. */
const readBoundedFile = async (path) => {
  const contentChunks = [];
  const hash = createHash('sha256');
  let collectedBytes = 0;
  let totalBytes = 0;
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
    totalBytes += chunk.byteLength;
    if (collectedBytes < MAX_SCENARIO_EVIDENCE_FILE_BYTES) {
      const boundedChunk = chunk.subarray(
        0,
        Math.min(chunk.byteLength, MAX_SCENARIO_EVIDENCE_FILE_BYTES - collectedBytes),
      );
      contentChunks.push(boundedChunk);
      collectedBytes += boundedChunk.byteLength;
    }
  }

  const contentBuffer = Buffer.concat(contentChunks, collectedBytes);
  let content = null;
  let omission = totalBytes > MAX_SCENARIO_EVIDENCE_FILE_BYTES ? 'file-too-large' : null;
  if (omission === null) {
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(contentBuffer);
    } catch {
      omission = 'non-utf8';
    }
  }

  return {
    content,
    omission,
    sha256: hash.digest('hex'),
  };
};

/** Inspects one declared path without following symlinks. */
const inspectEvidencePath = async (root, path, expectedType) => {
  let parentPath = root;
  for (const segment of path.split('/').slice(0, -1)) {
    parentPath = join(parentPath, segment);
    try {
      const parentStats = await lstat(parentPath);
      if (parentStats.isSymbolicLink()) {
        throw new Error(`Scenario evidence path ${path} traverses an intermediate symlink.`);
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') break;
      throw error;
    }
  }

  const absolutePath = join(root, path);
  let stats;
  try {
    stats = await lstat(absolutePath);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      if (expectedType !== 'missing') {
        throw new Error(`Scenario evidence path ${path} is missing.`);
      }
      return { path, type: 'missing' };
    }
    throw error;
  }

  const type = stats.isDirectory()
    ? 'directory'
    : stats.isFile()
      ? 'file'
      : stats.isSymbolicLink()
        ? 'symlink'
        : 'other';
  if (type !== expectedType) {
    throw new Error(`Scenario evidence path ${path} is ${type}, expected ${expectedType}.`);
  }
  if (type === 'directory') return { mode: stats.mode, path, type };
  if (type === 'symlink') {
    const target = await readlink(absolutePath);
    return {
      mode: stats.mode,
      path,
      sha256: createHash('sha256').update(target).digest('hex'),
      target,
      type,
    };
  }

  return { ...(await readBoundedFile(absolutePath)), mode: stats.mode, path, type };
};

/** Parses exact tracked and untracked states from NUL-delimited porcelain v2 output. */
const parseGitStatus = (output) => {
  const fields = output.split('\0');
  const trackedStatuses = [];
  let hasUntrackedPaths = false;

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (field.length === 0) continue;
    const recordType = field[0];
    if (recordType === '?') {
      hasUntrackedPaths = true;
      continue;
    }
    if (recordType === '!') continue;
    if (!['1', '2', 'u'].includes(recordType)) {
      throw new Error(`Unsupported Git status record type: ${recordType}.`);
    }

    const status = field.split(' ', 3)[1];
    if (typeof status !== 'string' || !/^[A-Z.]{2}$/u.test(status)) {
      throw new Error(`Unsupported Git status record: ${field}.`);
    }
    trackedStatuses.push(status);
    if (recordType === '2') {
      index += 1;
      if (index >= fields.length || fields[index].length === 0) {
        throw new Error('A renamed Git status record is missing its original path.');
      }
    }
  }

  return { hasUntrackedPaths, trackedStatuses };
};

/** Captures the safe Git facts supported by semantic scenario declarations. */
const collectGitFacts = (repositoryPath) => {
  const headResult = inspectGit(repositoryPath, ['rev-parse', '--verify', 'HEAD'], true);
  const statusResult = inspectGit(repositoryPath, [
    'status',
    '--porcelain=v2',
    '-z',
    '--untracked-files=all',
  ]);
  const { hasUntrackedPaths, trackedStatuses } = parseGitStatus(statusResult.stdout);
  const hasHead = headResult.status === 0;
  const hasStagedChanges = trackedStatuses.some((status) => status[0] !== '.');
  const hasUnstagedChanges = trackedStatuses.some((status) => status[1] !== '.');

  return {
    'has-deleted-paths': trackedStatuses.some((status) => status.includes('D')),
    'has-renamed-paths': trackedStatuses.some((status) => status.includes('R')),
    'has-staged-changes': hasStagedChanges,
    'has-unstaged-changes': hasUnstagedChanges,
    'has-untracked-paths': hasUntrackedPaths,
    'head-exists': hasHead,
    'head-missing': !hasHead,
    'working-tree-clean': trackedStatuses.length === 0 && !hasUntrackedPaths,
    'working-tree-dirty': trackedStatuses.length > 0 || hasUntrackedPaths,
  };
};

/** Collects evaluator-owned scenario evidence before actor execution. */
export const collectScenarioEvidence = async ({ caseDefinition, repositoryPath }) => {
  const gitFacts = caseDefinition.input.repositoryEvidence.some(
    ({ source }) => source.kind === 'git-state',
  )
    ? collectGitFacts(repositoryPath)
    : null;
  const evidence = [];

  for (const declaration of caseDefinition.input.repositoryEvidence) {
    const { source } = declaration;
    let observation;
    if (source.kind === 'developer-direction') {
      observation = {
        content: caseDefinition.input.developerDirection,
        type: 'developer-direction',
      };
    } else if (source.kind === 'git-state') {
      observation = {
        fact: source.fact,
        observed: gitFacts?.[source.fact] === true,
        type: 'git-state',
      };
      if (!observation.observed) {
        throw new Error(`Scenario Git fact ${source.fact} is not present.`);
      }
    } else {
      observation = await inspectEvidencePath(repositoryPath, source.path, source.expectedType);
    }
    evidence.push({ claim: declaration.claim, observation, source });
  }

  return evidence;
};

/** Validates persisted scenario evidence against its exact case declarations. */
export const hasValidScenarioEvidence = (evidence, caseDefinition) => {
  if (
    !Array.isArray(evidence) ||
    evidence.length !== caseDefinition.input.repositoryEvidence.length
  ) {
    return false;
  }

  return evidence.every((entry, index) => {
    const declaration = caseDefinition.input.repositoryEvidence[index];
    if (
      !isPlainRecord(entry) ||
      !hasExactKeys(entry, ['claim', 'observation', 'source']) ||
      entry.claim !== declaration.claim ||
      JSON.stringify(entry.source) !== JSON.stringify(declaration.source) ||
      !isPlainRecord(entry.observation) ||
      typeof entry.observation.type !== 'string'
    ) {
      return false;
    }

    const { observation } = entry;
    if (declaration.source.kind === 'developer-direction') {
      return (
        hasExactKeys(observation, ['content', 'type']) &&
        observation.type === 'developer-direction' &&
        observation.content === caseDefinition.input.developerDirection
      );
    }
    if (declaration.source.kind === 'git-state') {
      return (
        hasExactKeys(observation, ['fact', 'observed', 'type']) &&
        observation.type === 'git-state' &&
        observation.fact === declaration.source.fact &&
        observation.observed === true
      );
    }
    if (
      observation.type !== declaration.source.expectedType ||
      observation.path !== declaration.source.path
    ) {
      return false;
    }
    if (observation.type === 'missing') {
      return hasExactKeys(observation, ['path', 'type']) && typeof observation.path === 'string';
    }
    if (observation.type === 'directory') {
      return (
        hasExactKeys(observation, ['mode', 'path', 'type']) &&
        typeof observation.path === 'string' &&
        Number.isSafeInteger(observation.mode)
      );
    }
    if (observation.type === 'symlink') {
      return (
        hasExactKeys(observation, ['mode', 'path', 'sha256', 'target', 'type']) &&
        typeof observation.path === 'string' &&
        Number.isSafeInteger(observation.mode) &&
        typeof observation.target === 'string' &&
        SHA256_PATTERN.test(observation.sha256)
      );
    }
    if (observation.type === 'file') {
      return (
        hasExactKeys(observation, ['content', 'mode', 'omission', 'path', 'sha256', 'type']) &&
        typeof observation.path === 'string' &&
        Number.isSafeInteger(observation.mode) &&
        SHA256_PATTERN.test(observation.sha256) &&
        (typeof observation.content === 'string' || observation.content === null) &&
        [null, 'file-too-large', 'non-utf8'].includes(observation.omission) &&
        (observation.content === null) !== (observation.omission === null)
      );
    }
    return false;
  });
};
