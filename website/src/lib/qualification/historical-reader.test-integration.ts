// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';

import { readHistoricalQualificationTargets } from './historical-reader.ts';

const SOURCE_COMMIT = 'fcbc34f60b12b1b66cd9ebb28b1865979a259429';
const SOURCE_RELEASE = 'v4.0.0';
const canonicalRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const temporaryRoots: string[] = [];

const executeGit = (repositoryRoot: string, args: string[], input?: string): string =>
  execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: 'qualification@example.com',
      GIT_AUTHOR_NAME: 'Qualification Fixture',
      GIT_COMMITTER_EMAIL: 'qualification@example.com',
      GIT_COMMITTER_NAME: 'Qualification Fixture',
    },
    input,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();

const createMutableHistoryRepository = (): string => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'moldea-history-reader-'));
  temporaryRoots.push(repositoryRoot);
  execFileSync(
    'git',
    ['clone', '--quiet', '--shared', '--no-checkout', canonicalRepositoryRoot, repositoryRoot],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  executeGit(repositoryRoot, ['read-tree', SOURCE_COMMIT]);
  return repositoryRoot;
};

const commitIndexAsSourceRelease = (repositoryRoot: string): string => {
  const tree = executeGit(repositoryRoot, ['write-tree']);
  const commit = executeGit(
    repositoryRoot,
    ['commit-tree', tree, '-p', SOURCE_COMMIT],
    'test: mutate immutable history fixture\n',
  );
  executeGit(repositoryRoot, ['tag', '--force', SOURCE_RELEASE, commit]);
  return commit;
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('readHistoricalQualificationTargets', () => {
  test('rejects a release tag that does not resolve to the declared commit', () => {
    expect(() =>
      readHistoricalQualificationTargets({
        repositoryRoot: canonicalRepositoryRoot,
        sourceCommit: '0'.repeat(40),
        sourceRelease: SOURCE_RELEASE,
      }),
    ).toThrow(`${SOURCE_RELEASE} must resolve to ${'0'.repeat(40)}`);
  });

  test('rejects a missing artifact object from an otherwise complete history tree', () => {
    const repositoryRoot = createMutableHistoryRepository();
    const artifactPath = executeGit(repositoryRoot, [
      'ls-tree',
      '-r',
      '--name-only',
      SOURCE_COMMIT,
      '--',
      'qualification/results',
    ])
      .split('\n')
      .find((relativePath) => relativePath.includes('/cases/'));

    if (artifactPath === undefined) throw new Error('Historical fixture has no case artifact.');

    executeGit(repositoryRoot, ['update-index', '--force-remove', '--', artifactPath]);
    const sourceCommit = commitIndexAsSourceRelease(repositoryRoot);

    expect(() =>
      readHistoricalQualificationTargets({
        repositoryRoot,
        sourceCommit,
        sourceRelease: SOURCE_RELEASE,
      }),
    ).toThrow('Historical qualification object is missing');
  });

  test('rejects an unsafe historical tree path before reading its object', () => {
    const repositoryRoot = createMutableHistoryRepository();
    const unsafePath = 'qualification/results/_backup/evidence.txt';
    const blob = executeGit(repositoryRoot, ['hash-object', '-w', '--stdin'], 'fixture\n');
    executeGit(repositoryRoot, [
      'update-index',
      '--add',
      '--cacheinfo',
      '100644',
      blob,
      unsafePath,
    ]);
    const sourceCommit = commitIndexAsSourceRelease(repositoryRoot);

    expect(() =>
      readHistoricalQualificationTargets({
        repositoryRoot,
        sourceCommit,
        sourceRelease: SOURCE_RELEASE,
      }),
    ).toThrow(`Historical qualification path enters an excluded directory: ${unsafePath}`);
  });
});
