import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink } from 'node:fs/promises';
import { join, relative } from 'node:path';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const hasExactKeys = (input, keys) =>
  Object.keys(input).length === keys.length && keys.every((key) => key in input);

/** Hashes an exact directory tree without following symlinks. */
export const createEvaluationTreeDigest = async (root) => {
  const entries = [];

  const visit = async (directoryPath) => {
    const directoryEntries = await readdir(directoryPath, {
      withFileTypes: true,
    });
    directoryEntries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of directoryEntries) {
      if (entry.isDirectory() && EXCLUDED_DIRECTORY_NAMES.has(entry.name)) continue;
      const absolutePath = join(directoryPath, entry.name);
      const path = relative(root, absolutePath).replaceAll('\\', '/');
      const stats = await lstat(absolutePath);
      if (stats.isDirectory()) {
        entries.push({ mode: stats.mode, path, type: 'directory' });
        await visit(absolutePath);
      } else if (stats.isSymbolicLink()) {
        entries.push({
          mode: stats.mode,
          path,
          target: await readlink(absolutePath),
          type: 'symlink',
        });
      } else if (stats.isFile()) {
        entries.push({
          mode: stats.mode,
          path,
          sha256: createHash('sha256')
            .update(await readFile(absolutePath))
            .digest('hex'),
          type: 'file',
        });
      }
    }
  };

  await visit(root);
  return createHash('sha256').update(JSON.stringify(entries)).digest('hex');
};

/** Runs one read-only Git metadata command with optional locking disabled. */
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
    throw new Error(`Unable to inspect evaluation Git metadata: ${result.stderr.trim()}`);
  }
  return result;
};

/** Captures the Git and installed-skill state that actors must preserve. */
export const captureRepositoryControlState = async (repositoryPath) => {
  const commitResult = inspectGit(repositoryPath, ['rev-parse', '--verify', 'HEAD'], true);
  const symbolicHeadResult = inspectGit(repositoryPath, ['symbolic-ref', '-q', 'HEAD'], true);
  const refsResult = inspectGit(repositoryPath, [
    'for-each-ref',
    '--format=%(refname)%00%(objectname)',
  ]);
  const indexResult = inspectGit(repositoryPath, ['ls-files', '--stage', '-z']);
  const configContent = await readFile(join(repositoryPath, '.git', 'config'));
  const refs = refsResult.stdout
    .split('\n')
    .filter(Boolean)
    .map((entry) => {
      const [name, oid] = entry.split('\0');
      return { name, oid };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    gitDigest: await createEvaluationTreeDigest(join(repositoryPath, '.git')),
    head: {
      commit: commitResult.status === 0 ? commitResult.stdout.trim() : null,
      symbolicRef: symbolicHeadResult.status === 0 ? symbolicHeadResult.stdout.trim() : null,
    },
    indexDigest: createHash('sha256').update(indexResult.stdout).digest('hex'),
    installedSkillDigest: await createEvaluationTreeDigest(
      join(repositoryPath, '.agents', 'skills', 'moldea'),
    ),
    localConfigDigest: createHash('sha256').update(configContent).digest('hex'),
    refs,
  };
};

/** Compares before and after control states and records every changed boundary. */
export const createRepositoryControlEvidence = (before, after) => {
  const violations = [];
  for (const [field, violation] of [
    ['gitDigest', 'git-metadata-changed'],
    ['head', 'head-changed'],
    ['indexDigest', 'staged-state-changed'],
    ['installedSkillDigest', 'installed-skill-changed'],
    ['localConfigDigest', 'git-config-changed'],
    ['refs', 'git-refs-changed'],
  ]) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) violations.push(violation);
  }
  return { after, before, violations };
};

/** Validates persisted repository-control evidence without trusting its pass claim. */
export const hasValidRepositoryControlEvidence = (evidence) => {
  const isValidState = (state) =>
    isPlainRecord(state) &&
    hasExactKeys(state, [
      'gitDigest',
      'head',
      'indexDigest',
      'installedSkillDigest',
      'localConfigDigest',
      'refs',
    ]) &&
    SHA256_PATTERN.test(state.gitDigest) &&
    SHA256_PATTERN.test(state.indexDigest) &&
    SHA256_PATTERN.test(state.installedSkillDigest) &&
    SHA256_PATTERN.test(state.localConfigDigest) &&
    isPlainRecord(state.head) &&
    hasExactKeys(state.head, ['commit', 'symbolicRef']) &&
    (state.head.commit === null || /^[a-f0-9]{40,64}$/u.test(state.head.commit)) &&
    (state.head.symbolicRef === null || typeof state.head.symbolicRef === 'string') &&
    Array.isArray(state.refs) &&
    state.refs.every(
      (reference) =>
        isPlainRecord(reference) &&
        hasExactKeys(reference, ['name', 'oid']) &&
        typeof reference.name === 'string' &&
        /^[a-f0-9]{40,64}$/u.test(reference.oid),
    );

  if (
    !isPlainRecord(evidence) ||
    !hasExactKeys(evidence, ['after', 'before', 'violations']) ||
    !isValidState(evidence.before) ||
    !isValidState(evidence.after) ||
    !Array.isArray(evidence.violations) ||
    !evidence.violations.every((violation) => typeof violation === 'string')
  ) {
    return false;
  }

  return (
    JSON.stringify(evidence) ===
    JSON.stringify(createRepositoryControlEvidence(evidence.before, evidence.after))
  );
};
