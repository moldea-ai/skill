import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

const EXCLUDED_CONTEXT_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const SEMANTIC_INPUT_PATHS = [
  'fixtures/conformance-cases.json',
  'fixtures/semantic-evaluation-coverage.json',
  'tests/semantic-evaluation-runner.mjs',
  'tooling/codex-evaluation-host',
  'tooling/release-identity/constants.mjs',
  'tooling/release-identity/identity.mjs',
  'tooling/resource-calibration/profiles.mjs',
  'tooling/semantic-evaluation',
];
const MAX_SEMANTIC_INPUT_FILE_BYTES = 64 * 1024 * 1024;
const MAX_SEMANTIC_INPUT_FILE_COUNT = 4_096;

const isExcludedDevelopmentFile = (filename) =>
  filename.endsWith('.d.mts') || /\.test-(?:unit|integration|e2e|bench)\./u.test(filename);

const requireContainedPath = (repositoryRoot, repositoryRealRoot, absolutePath) => {
  const relativePath = relative(repositoryRoot, absolutePath);
  const realRelativePath = relative(repositoryRealRoot, realpathSync(absolutePath));
  if (
    relativePath === '' ||
    relativePath.startsWith('..') ||
    isAbsolute(relativePath) ||
    realRelativePath.startsWith('..') ||
    isAbsolute(realRelativePath) ||
    relativePath
      .replaceAll('\\', '/')
      .split('/')
      .some((component) => EXCLUDED_CONTEXT_DIRECTORY_NAMES.has(component))
  ) {
    throw new Error(`Semantic input path escapes its trusted root: ${absolutePath}.`);
  }

  return relativePath.replaceAll('\\', '/');
};

const collectSemanticInputEntries = (repositoryRoot) => {
  const entries = [];
  const repositoryRealRoot = realpathSync(repositoryRoot);

  const collect = (absolutePath) => {
    const relativePath = requireContainedPath(repositoryRoot, repositoryRealRoot, absolutePath);
    const stats = lstatSync(absolutePath);
    if (stats.isFile()) {
      if (!isExcludedDevelopmentFile(relativePath)) {
        if (stats.size > MAX_SEMANTIC_INPUT_FILE_BYTES) {
          throw new Error(`Semantic input is too large: ${relativePath}.`);
        }
        entries.push({
          path: relativePath,
          sha256: createHash('sha256').update(readFileSync(absolutePath)).digest('hex'),
        });
        if (entries.length > MAX_SEMANTIC_INPUT_FILE_COUNT) {
          throw new Error('Semantic input contains too many files.');
        }
      }
      return;
    }
    if (!stats.isDirectory()) {
      throw new Error(`Semantic input has an unsupported path type: ${relativePath}.`);
    }

    for (const directoryEntry of readdirSync(absolutePath, {
      withFileTypes: true,
    }).sort(({ name: left }, { name: right }) => left.localeCompare(right, 'en'))) {
      if (
        directoryEntry.isDirectory() &&
        EXCLUDED_CONTEXT_DIRECTORY_NAMES.has(directoryEntry.name)
      ) {
        continue;
      }
      collect(join(absolutePath, directoryEntry.name));
    }
  };

  for (const relativePath of SEMANTIC_INPUT_PATHS) {
    collect(resolve(repositoryRoot, ...relativePath.split('/')));
  }

  entries.sort(({ path: left }, { path: right }) => left.localeCompare(right, 'en'));
  if (entries.length === 0 || new Set(entries.map(({ path }) => path)).size !== entries.length) {
    throw new Error('Semantic inputs must produce unique source entries.');
  }
  return entries;
};

/** Hashes the exact semantic cases, coverage, runner, host, evaluator, and protocol inputs. */
export const createSemanticInputDigest = (repositoryRoot) =>
  createHash('sha256')
    .update(`${JSON.stringify(collectSemanticInputEntries(resolve(repositoryRoot)))}\n`)
    .digest('hex');
