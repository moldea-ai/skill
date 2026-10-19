// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, test } from 'vitest';

import {
  prepareGitCommandPolicyBoundary,
  CODEX_EVALUATION_GIT_STATUS_ARGUMENTS,
} from '../../execution/host/index.ts';

import { collectRepairGitEvidence } from './repair-git.ts';
import type { IRepairGitEvidence } from './types.ts';

const roots: string[] = [];
const git = (root: string, ...arguments_: string[]): string => {
  const result = spawnSync(
    'git',
    ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...arguments_],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_AUTHOR_NAME: 'Fixture',
        GIT_AUTHOR_EMAIL: 'fixture@example.com',
        GIT_COMMITTER_NAME: 'Fixture',
        GIT_COMMITTER_EMAIL: 'fixture@example.com',
      },
    },
  );
  if (result.error || result.status !== 0)
    throw new Error('Fixture Git operation failed.', { cause: result.error ?? result.stderr });
  return result.stdout.trim();
};
const repository = (committed = true): string => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-repair-git-'));
  roots.push(root);
  git(root, 'init', '--initial-branch=main');
  mkdirSync(join(root, 'moldea'));
  writeFileSync(join(root, 'moldea', 'moldea.yaml'), 'version: 1\n');
  writeFileSync(join(root, 'source file.js'), 'alpha\n');
  if (committed) {
    git(root, 'add', '--', 'moldea/moldea.yaml', 'source file.js');
    git(root, 'commit', '-m', 'Fixture foundation');
  }
  return root;
};
const runHelper = (root: string, ...arguments_: string[]) =>
  spawnSync(
    process.env['MOLDEA_TEST_NODE'] ?? process.execPath,
    [
      resolve(import.meta.dirname, '../../../moldea/scripts/repair-git.mjs'),
      '--repository',
      root,
      '--',
      ...arguments_,
    ],
    { encoding: 'utf8', timeout: 30_000 },
  );

// records every Git storage path and its bytes so a read can prove it wrote nothing
const snapshot = (directory: string, prefix = ''): string[] =>
  readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) =>
      entry.isDirectory()
        ? [
            `${prefix}${entry.name}/`,
            ...snapshot(join(directory, entry.name), `${prefix}${entry.name}/`),
          ]
        : [
            `${prefix}${entry.name}:${readFileSync(join(directory, entry.name)).toString('base64')}`,
          ],
    );

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('bundled helper captures full commit, uncommitted paths and manifest evidence without index writes', async () => {
  const root = repository();
  const checkpoint = git(root, 'rev-parse', 'HEAD');
  const index = readFileSync(join(root, '.git', 'index'));
  writeFileSync(join(root, 'source file.js'), 'bravo\n');
  writeFileSync(join(root, 'moldea', 'moldea.yaml'), 'version: 1\ncontext: {}\n');
  writeFileSync(join(root, 'new.js'), 'new\n');
  const result = runHelper(root, 'continue', '--checkpoint', checkpoint);
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  const evidence = JSON.parse(result.stdout) as IRepairGitEvidence;
  expect(evidence).toMatchObject({
    status: 'available',
    commit: checkpoint,
    changedPaths: ['moldea/moldea.yaml', 'new.js', 'source file.js'],
    uncommittedPaths: ['moldea/moldea.yaml', 'new.js', 'source file.js'],
  });
  if (evidence.status !== 'available') throw new Error('Expected available repair evidence.');
  expect(evidence.manifestDiff).toContain('+context: {}');
  expect(evidence.uncommittedManifestDiff).toContain('+context: {}');
  expect(readFileSync(join(root, '.git', 'index'))).toStrictEqual(index);
  const review = await collectRepairGitEvidence({
    repositoryRoot: root,
    mode: 'review',
    paths: ['source file.js'],
  });
  expect(review.status).toBe('available');
  if (review.status !== 'available') throw new Error('Expected written-file review.');
  expect(review.writtenDiff).toContain('+bravo');
  expect(review.writtenDiff).not.toContain('context:');
});

test('unborn repositories explicitly require conservative reassessment', () => {
  const result = runHelper(repository(false), 'checkpoint');
  expect(result.status).toBe(1);
  expect(JSON.parse(result.stdout)).toMatchObject({
    status: 'unavailable',
    reasonCode: 'commit-unavailable',
  });
});

test('bundled helper reports the first Git error during attribute inspection as a Git read failure', () => {
  const root = repository();
  writeFileSync(join(root, '.git', 'config'), '[invalid\n');
  const result = runHelper(root, 'checkpoint');
  expect(result.status).toBe(1);
  expect(result.stderr).toBe('');
  const evidence = JSON.parse(result.stdout) as IRepairGitEvidence;
  expect(evidence).toMatchObject({
    status: 'unavailable',
    reasonCode: 'git-read',
  });
  if (evidence.status !== 'unavailable') throw new Error('Expected unavailable Git evidence.');
  expect(evidence.reason).toContain('fatal: bad config line 1');
});

test('Git ownership refusal is reported as git-read with its bounded reason', () => {
  const root = repository();
  const result = spawnSync(
    process.env['MOLDEA_TEST_NODE'] ?? process.execPath,
    [
      resolve(import.meta.dirname, '../../../moldea/scripts/repair-git.mjs'),
      '--repository',
      root,
      '--',
      'checkpoint',
    ],
    {
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, GIT_TEST_ASSUME_DIFFERENT_OWNER: '1' },
    },
  );
  expect(result.status).toBe(1);
  const evidence = JSON.parse(result.stdout) as IRepairGitEvidence;
  expect(evidence).toMatchObject({ status: 'unavailable', reasonCode: 'git-read' });
  if (evidence.status !== 'unavailable') throw new Error('Expected ownership refusal.');
  expect(evidence.reason).toContain('dubious ownership');
});

test('a configured failing file monitor is suppressed without executing its hook', () => {
  const root = repository();
  const sentinel = join(root, 'monitor-ran');
  writeFileSync(
    join(root, 'monitor.cjs'),
    "require('node:fs').writeFileSync('monitor-ran','x');process.exit(1);\n",
  );
  git(root, 'config', 'core.fsmonitor', 'node monitor.cjs');
  git(root, 'status', '--porcelain');
  expect(existsSync(sentinel)).toBe(true);
  rmSync(sentinel);
  const result = runHelper(root, 'checkpoint');
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ status: 'available' });
  expect(existsSync(sentinel)).toBe(false);
});

// the false shim is a POSIX sh script; Git 2.35 and earlier ran core.fsmonitor=false through PATH
test.skipIf(process.platform === 'win32')(
  'a stored file-monitor index extension never runs a false program from PATH',
  () => {
    const root = repository();
    writeFileSync(join(root, 'monitor.cjs'), 'process.exit(0);\n');
    git(root, 'config', 'core.fsmonitorHookVersion', '1');
    git(root, 'config', 'core.fsmonitor', 'node monitor.cjs');
    git(root, 'update-index', '--fsmonitor');
    git(root, 'config', '--unset', 'core.fsmonitor');
    git(root, 'config', '--unset', 'core.fsmonitorHookVersion');
    expect(readFileSync(join(root, '.git', 'index')).includes('FSMN')).toBe(true);
    const tools = mkdtempSync(join(tmpdir(), 'moldea-repair-tools-'));
    roots.push(tools);
    const sentinel = join(tools, 'false-ran');
    writeFileSync(join(tools, 'false'), `#!/bin/sh\nprintf x >> '${sentinel}'\nexit 1\n`);
    chmodSync(join(tools, 'false'), 0o755);
    const result = spawnSync(
      process.env['MOLDEA_TEST_NODE'] ?? process.execPath,
      [
        resolve(import.meta.dirname, '../../../moldea/scripts/repair-git.mjs'),
        '--repository',
        root,
        '--',
        'checkpoint',
      ],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: { ...process.env, PATH: tools + ':' + process.env['PATH'] },
      },
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ status: 'available' });
    expect(existsSync(sentinel)).toBe(false);
  },
);

test('a missing object in a partial clone is unavailable evidence and is never fetched', () => {
  const source = repository();
  const checkpoint = git(source, 'rev-parse', 'HEAD');
  const missingBlob = git(source, 'rev-parse', 'HEAD:moldea/moldea.yaml');
  writeFileSync(join(source, 'moldea', 'moldea.yaml'), 'version: 1\ncontext: {}\n');
  git(source, 'add', '--', 'moldea/moldea.yaml');
  git(source, 'commit', '-m', 'Manifest change');
  git(source, 'config', 'uploadpack.allowFilter', 'true');
  git(source, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
  const parent = mkdtempSync(join(tmpdir(), 'moldea-repair-partial-'));
  roots.push(parent);
  const clone = join(parent, 'clone');
  git(parent, 'clone', '--filter=blob:none', pathToFileURL(source).href, clone);
  const isMissing = (): boolean =>
    git(clone, 'rev-list', '--objects', '--missing=print', checkpoint)
      .split('\n')
      .includes(`?${missingBlob}`);
  expect(isMissing()).toBe(true);
  // a POSIX upload-pack shim proves whether any fetch reached the remote
  const sentinel = join(parent, 'upload-pack-ran');
  if (process.platform !== 'win32') {
    const uploadPack = join(parent, 'upload-pack.sh');
    writeFileSync(uploadPack, `#!/bin/sh\nprintf x >> '${sentinel}'\nexec git upload-pack "$@"\n`);
    chmodSync(uploadPack, 0o755);
    git(clone, 'config', 'remote.origin.uploadpack', uploadPack);
  }
  const before = snapshot(join(clone, '.git'));

  const result = runHelper(clone, 'continue', '--checkpoint', checkpoint);
  expect(result.status, result.stdout + result.stderr).toBe(1);
  expect(JSON.parse(result.stdout)).toMatchObject({
    status: 'unavailable',
    reasonCode: 'git-read',
  });
  expect(snapshot(join(clone, '.git'))).toStrictEqual(before);
  expect(isMissing()).toBe(true);
  if (process.platform === 'win32') return;
  expect(existsSync(sentinel)).toBe(false);

  // the same read without the helper's environment fetches, so the fixture is meaningful
  git(clone, 'diff', checkpoint, '--', 'moldea/moldea.yaml');
  expect(existsSync(sentinel)).toBe(true);
  expect(isMissing()).toBe(false);
});

test('bundled repair reads tracked backup paths without changing the index', () => {
  const root = repository();
  mkdirSync(join(root, '_backups'));
  writeFileSync(join(root, '_backups', 'source.js'), 'alpha\n');
  git(root, 'add', '--', '_backups/source.js');
  git(root, 'commit', '-m', 'Tracked backup fixture');
  const checkpoint = git(root, 'rev-parse', 'HEAD');
  const index = readFileSync(join(root, '.git', 'index'));
  writeFileSync(join(root, '_backups', 'source.js'), 'bravo\n');

  const continuation = runHelper(root, 'continue', '--checkpoint', checkpoint);
  expect(continuation.status).toBe(0);
  expect(JSON.parse(continuation.stdout)).toMatchObject({
    status: 'available',
    commit: checkpoint,
    changedPaths: ['_backups/source.js'],
    uncommittedPaths: ['_backups/source.js'],
  });
  const review = runHelper(root, 'review', '--path', '_backups/source.js');
  expect(review.status).toBe(0);
  const reviewed = JSON.parse(review.stdout) as IRepairGitEvidence;
  expect(reviewed.status).toBe('available');
  if (reviewed.status !== 'available') throw new Error('Expected available repair evidence.');
  expect(reviewed.writtenDiff).toContain('+bravo');
  expect(readFileSync(join(root, '.git', 'index'))).toStrictEqual(index);
});

test.each(['worktree', 'index-fallback', 'info', 'nested'] as const)(
  'never executes a same-size clean filter through %s attributes',
  async (location) => {
    const root = repository();
    const sentinel = join(root, 'filter-ran');
    writeFileSync(
      join(root, 'trap.cjs'),
      "require('node:fs').appendFileSync('filter-ran','x'); process.stdin.pipe(process.stdout);\n",
    );
    git(root, 'config', 'filter.trap.clean', 'node trap.cjs');
    git(root, 'config', 'filter.trap.required', 'true');
    let attribute = join(root, '.gitattributes');
    if (location === 'info') attribute = join(root, '.git', 'info', 'attributes');
    if (location === 'nested') {
      mkdirSync(join(root, 'nested'));
      renameSync(join(root, 'source file.js'), join(root, 'nested', 'source.js'));
      git(root, 'add', '--', 'source file.js', 'nested/source.js');
      git(root, 'commit', '-m', 'Nested fixture');
      attribute = join(root, 'nested', '.gitattributes');
    }
    writeFileSync(attribute, '*.js filter=trap\n');
    if (location === 'index-fallback') {
      git(root, 'add', '--', '.gitattributes');
      rmSync(attribute);
      rmSync(sentinel, { force: true });
    }
    writeFileSync(
      join(root, location === 'nested' ? 'nested/source.js' : 'source file.js'),
      'bravo\n',
    );
    const result = await collectRepairGitEvidence({ repositoryRoot: root, mode: 'checkpoint' });
    expect(result).toMatchObject({ status: 'unavailable', reasonCode: 'attribute-safety' });
    expect(existsSync(sentinel)).toBe(false);
  },
);

test('rename status retains both exact paths and does not decode quoted strings', async () => {
  const root = repository();
  renameSync(join(root, 'source file.js'), join(root, 'renamed file.js'));
  git(root, 'add', '--', 'source file.js', 'renamed file.js');
  expect(
    await collectRepairGitEvidence({ repositoryRoot: root, mode: 'checkpoint' }),
  ).toMatchObject({ status: 'available', uncommittedPaths: ['renamed file.js', 'source file.js'] });
});

test('linked worktrees inspect their common Git attributes before status', async () => {
  const root = repository();
  const worktree = join(mkdtempSync(join(tmpdir(), 'moldea-repair-worktree-')), 'copy');
  roots.push(resolve(worktree, '..'));
  git(root, 'worktree', 'add', '-b', 'copy', worktree);
  expect(
    await collectRepairGitEvidence({ repositoryRoot: worktree, mode: 'checkpoint' }),
  ).toMatchObject({ status: 'available' });
  writeFileSync(join(root, '.git', 'info', 'attributes'), '*.js filter=trap\n');
  expect(
    await collectRepairGitEvidence({ repositoryRoot: worktree, mode: 'checkpoint' }),
  ).toMatchObject({ status: 'unavailable', reasonCode: 'attribute-safety' });
});

test.each(['../outside', '..\\outside', '/absolute', 'source\n.js'])(
  'rejects unsafe paths or checkpoint identities: %s',
  async (path) => {
    const root = repository();
    expect(
      await collectRepairGitEvidence({ repositoryRoot: root, mode: 'review', paths: [path] }),
    ).toMatchObject({ status: 'unavailable', reasonCode: 'arguments' });
    expect(
      await collectRepairGitEvidence({ repositoryRoot: root, mode: 'continue', checkpoint: path }),
    ).toMatchObject({ status: 'unavailable', reasonCode: 'arguments' });
  },
);

test('refuses linked review parents and oversized attributes', async () => {
  const root = repository();
  const outside = mkdtempSync(join(tmpdir(), 'moldea-repair-outside-'));
  roots.push(outside);
  writeFileSync(join(outside, 'source.js'), 'outside');
  symlinkSync(outside, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  expect(
    await collectRepairGitEvidence({
      repositoryRoot: root,
      mode: 'review',
      paths: ['linked/source.js'],
    }),
  ).toMatchObject({ status: 'unavailable', reasonCode: 'arguments' });
  rmSync(join(root, 'linked'));
  writeFileSync(join(root, '.gitattributes'), '#'.repeat(32_769));
  expect(
    await collectRepairGitEvidence({ repositoryRoot: root, mode: 'checkpoint' }),
  ).toMatchObject({ status: 'unavailable', reasonCode: 'attribute-safety' });
});

test('refuses revision expressions as a checkpoint', async () => {
  const root = repository();
  for (const checkpoint of ['HEAD^!', 'HEAD^-', 'repair-checkpoint']) {
    expect(
      await collectRepairGitEvidence({ repositoryRoot: root, mode: 'continue', checkpoint }),
    ).toMatchObject({ status: 'unavailable', reasonCode: 'arguments' });
  }
});

// this evaluator-wrapper fixture uses a POSIX executable shim and /usr/bin/git
test.skipIf(process.platform === 'win32')(
  'bundled continuation works through the real evaluator Git boundary',
  async () => {
    const root = repository();
    const checkpoint = git(root, 'rev-parse', 'HEAD');
    writeFileSync(join(root, 'source file.js'), 'bravo\n');
    const tools = join(root, 'host-tools');
    const wrapper = await prepareGitCommandPolicyBoundary(tools, {
      realGitExecutable: '/usr/bin/git',
      invocationLogPath: join(tools, '..', 'git-invocations.jsonl'),
    });
    const wrapperSource = join(tools, 'git-boundary.cjs');
    renameSync(wrapper, wrapperSource);
    writeFileSync(
      wrapper,
      '#!/bin/sh\nexec "$MOLDEA_TEST_WRAPPER_NODE" "$MOLDEA_TEST_WRAPPER_PATH" "$@"\n',
    );
    chmodSync(wrapper, 0o755);
    const result = spawnSync(
      process.execPath,
      [
        resolve(import.meta.dirname, '../../../moldea/scripts/repair-git.mjs'),
        '--repository',
        root,
        '--',
        'continue',
        '--checkpoint',
        checkpoint,
      ],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          PATH: tools + ':' + process.env['PATH'],
          MOLDEA_TEST_WRAPPER_NODE: process.execPath,
          MOLDEA_TEST_WRAPPER_PATH: wrapperSource,
        },
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const evidence = JSON.parse(result.stdout) as IRepairGitEvidence;
    expect(evidence).toMatchObject({ status: 'available', commit: checkpoint });
    if (evidence.status !== 'available') throw new Error('Expected wrapped continuation evidence.');
    expect(evidence.changedPaths).toContain('source file.js');
  },
);

test('ambient Git repository routing cannot redirect the bundled helper', () => {
  const root = repository();
  const other = repository();
  const commit = git(root, 'rev-parse', 'HEAD');
  writeFileSync(join(root, 'only-here.js'), 'local\n');
  const result = spawnSync(
    process.execPath,
    [
      resolve(import.meta.dirname, '../../../moldea/scripts/repair-git.mjs'),
      '--repository',
      root,
      '--',
      'checkpoint',
    ],
    {
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        GIT_DIR: join(other, '.git'),
        GIT_WORK_TREE: other,
        GIT_INDEX_FILE: join(other, '.git/index'),
      },
    },
  );
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ commit, uncommittedPaths: ['only-here.js'] });
});

test('oversized evidence is explicitly unavailable rather than truncated', async () => {
  const root = repository();
  writeFileSync(join(root, 'source file.js'), 'x'.repeat(70_000) + '\n');
  const result = await collectRepairGitEvidence({
    repositoryRoot: root,
    mode: 'review',
    paths: ['source file.js'],
  });
  expect(result).toMatchObject({ status: 'unavailable', reasonCode: 'output-limit' });
});

test('framework and punctuation filenames remain literal in checkpoint and review evidence', async () => {
  const root = repository();
  mkdirSync(join(root, 'app', '[slug]'), { recursive: true });
  mkdirSync(join(root, 'app', 's'), { recursive: true });
  writeFileSync(join(root, 'app/[slug]/page.tsx'), 'alpha\n');
  writeFileSync(join(root, 'app/s/page.tsx'), 'alpha\n');
  git(root, 'add', '--', 'app');
  git(root, 'commit', '-m', 'Framework fixture');
  writeFileSync(join(root, 'app/[slug]/page.tsx'), 'bravo\n');
  writeFileSync(join(root, 'app/s/page.tsx'), 'wrong\n');
  const checkpoint = await collectRepairGitEvidence({ repositoryRoot: root, mode: 'checkpoint' });
  expect(checkpoint).toMatchObject({
    status: 'available',
    uncommittedPaths: ['app/[slug]/page.tsx', 'app/s/page.tsx'],
  });
  const review = await collectRepairGitEvidence({
    repositoryRoot: root,
    mode: 'review',
    paths: ['app/[slug]/page.tsx'],
  });
  expect(review.status).toBe('available');
  if (review.status !== 'available') throw new Error('Expected literal review.');
  expect(review.writtenDiff).toContain('+bravo');
  expect(review.writtenDiff).not.toContain('+wrong');
});

// this evaluator-wrapper fixture uses a POSIX executable shim and /usr/bin/git
test.skipIf(process.platform === 'win32')(
  'literal pathspec environment cannot hide indexed attributes from the evaluator boundary',
  async () => {
    const root = repository();
    writeFileSync(
      join(root, 'trap.cjs'),
      "require('node:fs').appendFileSync('filter-ran','x'); process.stdin.pipe(process.stdout);\n",
    );
    git(root, 'config', 'filter.trap.clean', 'node trap.cjs');
    writeFileSync(join(root, '.gitattributes'), '*.js filter=trap\n');
    git(root, 'add', '--', '.gitattributes');
    rmSync(join(root, '.gitattributes'));
    rmSync(join(root, 'filter-ran'), { force: true });
    writeFileSync(join(root, 'source file.js'), 'bravo\n');
    const wrapper = await prepareGitCommandPolicyBoundary(join(root, 'host-tools'), {
      realGitExecutable: '/usr/bin/git',
      invocationLogPath: join(join(root, 'host-tools'), '..', 'git-invocations.jsonl'),
    });
    const result = spawnSync(
      process.execPath,
      [wrapper, ...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS, '--untracked-files=all', '--branch'],
      {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, GIT_LITERAL_PATHSPECS: '1' },
        timeout: 10_000,
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(2);
    expect(existsSync(join(root, 'filter-ran'))).toBe(false);
  },
);

for (const boundary of ['helper', 'wrapper'] as const) {
  // helper behavior runs everywhere; evaluator-wrapper fixtures use POSIX executable paths
  test.skipIf(boundary === 'wrapper' && process.platform === 'win32')(
    `repository core.worktree cannot redirect attribute-checked repair reads through ${boundary}`,
    async () => {
      const root = repository();
      const other = repository();
      writeFileSync(join(other, '.gitattributes'), '*.js filter=trap\n');
      const trap =
        "require('node:fs').appendFileSync(process.env.MOLDEA_FILTER_SENTINEL,'x'); process.stdin.pipe(process.stdout);\n";
      writeFileSync(join(root, 'trap.cjs'), trap);
      writeFileSync(join(other, 'trap.cjs'), trap);
      git(root, 'config', 'core.worktree', other);
      git(root, 'config', 'filter.trap.clean', 'node trap.cjs');
      writeFileSync(join(other, 'source file.js'), 'bravo\n');
      const sentinel = join(root, 'filter-ran');
      const result = spawnSync(
        process.execPath,
        boundary === 'helper'
          ? [
              resolve(import.meta.dirname, '../../../moldea/scripts/repair-git.mjs'),
              '--repository',
              root,
              '--',
              'checkpoint',
            ]
          : [
              await prepareGitCommandPolicyBoundary(join(root, 'host-tools'), {
                realGitExecutable: '/usr/bin/git',
                invocationLogPath: join(join(root, 'host-tools'), '..', 'git-invocations.jsonl'),
              }),
              ...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS,
              '--untracked-files=all',
              '--branch',
            ],
        {
          cwd: root,
          encoding: 'utf8',
          env: { ...process.env, MOLDEA_FILTER_SENTINEL: sentinel },
          timeout: 30_000,
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status, result.stdout + result.stderr).toBe(0);
      expect(existsSync(sentinel)).toBe(false);
    },
  );

  // helper behavior runs everywhere; evaluator-wrapper fixtures use POSIX executable paths
  test.skipIf(boundary === 'wrapper' && process.platform === 'win32')(
    `stored attribute trees are refused before a clean filter can run through ${boundary}`,
    async () => {
      const root = repository();
      writeFileSync(join(root, '.gitattributes'), '*.js filter=trap\n');
      git(root, 'add', '--', '.gitattributes');
      git(root, 'commit', '-m', 'Attribute tree fixture');
      const source = git(root, 'rev-parse', 'HEAD');
      git(root, 'rm', '--', '.gitattributes');
      git(root, 'commit', '-m', 'Visible attribute removal');
      writeFileSync(
        join(root, 'trap.cjs'),
        "require('node:fs').appendFileSync('filter-ran','x'); process.stdin.pipe(process.stdout);\n",
      );
      git(root, 'config', 'filter.trap.clean', 'node trap.cjs');
      git(root, 'config', 'attr.tree', source);
      writeFileSync(join(root, 'source file.js'), 'bravo\n');
      if (boundary === 'helper') {
        const result = await collectRepairGitEvidence({ repositoryRoot: root, mode: 'checkpoint' });
        expect(result).toMatchObject({ status: 'unavailable', reasonCode: 'attribute-safety' });
      } else {
        const wrapper = await prepareGitCommandPolicyBoundary(join(root, 'host-tools'), {
          realGitExecutable: '/usr/bin/git',
          invocationLogPath: join(join(root, 'host-tools'), '..', 'git-invocations.jsonl'),
        });
        const result = spawnSync(
          process.execPath,
          [wrapper, ...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS, '--untracked-files=all', '--branch'],
          { cwd: root, encoding: 'utf8', timeout: 30_000 },
        );
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(2);
      }
      expect(existsSync(join(root, 'filter-ran'))).toBe(false);
    },
  );
}

test('clean medium repositories fit the separate internal index bound', async () => {
  const root = repository();
  mkdirSync(join(root, 'many'));
  for (let index = 0; index < 8192; index += 1)
    writeFileSync(
      join(
        root,
        'many',
        `module-${String(index).padStart(5, '0')}-representative-repository-path.js`,
      ),
      'export {};\n',
    );
  git(root, 'add', '--', 'many');
  git(root, 'commit', '-m', 'Medium repository fixture');
  const result = await collectRepairGitEvidence({ repositoryRoot: root, mode: 'checkpoint' });
  expect(result).toMatchObject({ status: 'available', uncommittedPaths: [] });
});

test('untracked nested repositories yield a literal directory path without failing capture', async () => {
  const root = repository();
  mkdirSync(join(root, 'nested'));
  git(join(root, 'nested'), 'init', '--initial-branch=main');
  expect(
    await collectRepairGitEvidence({ repositoryRoot: root, mode: 'checkpoint' }),
  ).toMatchObject({ status: 'available', uncommittedPaths: ['nested'] });
});

// the executable fake-Git shim uses POSIX sh; macOS supports it, Windows does not
test.skipIf(process.platform === 'win32')(
  'index capture overflow reports unavailable evidence without a worktree read',
  () => {
    const root = repository();
    const tools = join(root, 'fake-tools');
    mkdirSync(tools);
    const source = join(tools, 'git.cjs');
    writeFileSync(
      source,
      "if(process.argv.includes('config'))process.exit(1);if(process.argv.includes('ls-files')){process.stdout.write('path.js\\0'.repeat(524289));}else{require('node:fs').writeFileSync(process.env.MOLDEA_TEST_GIT_SENTINEL,'x');}\n",
    );
    const executable = join(tools, 'git');
    writeFileSync(
      executable,
      '#!/bin/sh\nexec "$MOLDEA_TEST_GIT_NODE" "$MOLDEA_TEST_GIT_SOURCE" "$@"\n',
    );
    chmodSync(executable, 0o755);
    const sentinel = join(root, 'worktree-read');
    const result = spawnSync(
      process.execPath,
      [
        resolve(import.meta.dirname, '../../../moldea/scripts/repair-git.mjs'),
        '--repository',
        root,
        '--',
        'checkpoint',
      ],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          PATH: tools + ':' + process.env['PATH'],
          MOLDEA_TEST_GIT_NODE: process.execPath,
          MOLDEA_TEST_GIT_SOURCE: source,
          MOLDEA_TEST_GIT_SENTINEL: sentinel,
        },
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: 'unavailable',
      reasonCode: 'output-limit',
    });
    expect(existsSync(sentinel)).toBe(false);
  },
);

test('verifies full commit objects and rejects missing objects and blobs', async () => {
  const root = repository();
  const commit = git(root, 'rev-parse', 'HEAD');
  const verified = await collectRepairGitEvidence({
    repositoryRoot: root,
    mode: 'verify',
    checkpoint: commit,
  });
  expect(verified.status).toBe('available');
  if (verified.status === 'available') expect(verified.commit).toBe(commit);
  for (const checkpoint of ['0'.repeat(40), git(root, 'rev-parse', 'HEAD:source file.js')]) {
    const result = await collectRepairGitEvidence({
      repositoryRoot: root,
      mode: 'verify',
      checkpoint,
    });
    expect(result.status).toBe('unavailable');
    const continuation = await collectRepairGitEvidence({
      repositoryRoot: root,
      mode: 'continue',
      checkpoint,
    });
    expect(continuation.status).toBe('unavailable');
  }
  expect(runHelper(root, 'verify', '--checkpoint', commit).status).toBe(0);
});
