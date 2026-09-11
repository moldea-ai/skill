// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX,
  CODEX_EVALUATION_GIT_STATUS_ARGUMENTS,
  prepareGitCommandPolicyBoundary,
} from './git-command-policy-boundary.mjs';
const RELEASE_CLI_GIT_OPTIONS = [
  '--no-pager',
  '-c',
  'color.ui=false',
  '-c',
  'core.fsmonitor=false',
  '-c',
  'submodule.recurse=false',
];

const runSystemGit = (repositoryPath, argumentsList) => {
  const result = spawnSync('/usr/bin/git', argumentsList, {
    cwd: repositoryPath,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
};

const runWrappedGit = (wrapperPath, repositoryPath, argumentsList) =>
  spawnSync(process.execPath, [wrapperPath, ...argumentsList], {
    cwd: repositoryPath,
    encoding: 'utf8',
    env: { ...process.env, GIT_ATTR_NOSYSTEM: '1' },
  });

test('Git command-policy boundary suppresses helpers and refuses filter attributes', async () => {
  const testRoot = mkdtempSync(join(tmpdir(), 'moldea-git-command-policy-test-'));
  const repositoryPath = join(testRoot, 'repository');
  const sentinelPath = join(repositoryPath, 'git-filter-ran.txt');

  try {
    mkdirSync(repositoryPath);
    runSystemGit(repositoryPath, ['init', '--quiet']);
    writeFileSync(join(repositoryPath, 'project-state.js'), 'export const state = "clean";\n');
    runSystemGit(repositoryPath, ['add', '--all']);
    runSystemGit(repositoryPath, [
      '-c',
      'user.name=moldea evaluation',
      '-c',
      'user.email=evaluation@invalid.example',
      'commit',
      '--quiet',
      '-m',
      'test: initialize command-policy fixture',
    ]);

    const wrapperPath = await prepareGitCommandPolicyBoundary(join(testRoot, 'bin'));
    const statusArguments = [...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS];
    const safeResult = runWrappedGit(wrapperPath, repositoryPath, statusArguments);

    assert.equal(safeResult.status, 0, safeResult.stderr);
    assert.equal(safeResult.stdout, '');

    const releaseCliResult = runWrappedGit(wrapperPath, repositoryPath, [
      ...RELEASE_CLI_GIT_OPTIONS,
      '-C',
      repositoryPath,
      'rev-parse',
      '--show-toplevel',
    ]);

    assert.equal(releaseCliResult.status, 0, releaseCliResult.stderr);
    assert.equal(releaseCliResult.stdout.trim(), repositoryPath);

    const selectedInventoryArguments = [
      ...RELEASE_CLI_GIT_OPTIONS,
      '-C',
      repositoryPath,
      'ls-files',
      '--cached',
      '--stage',
      '--full-name',
      '--no-abbrev',
      '--no-recurse-submodules',
      '-z',
      '--',
    ];
    const selectedManifestResult = runWrappedGit(wrapperPath, repositoryPath, [
      ...selectedInventoryArguments,
      ':(top,literal)moldea/moldea.yaml',
    ]);

    assert.equal(selectedManifestResult.status, 0, selectedManifestResult.stderr);

    for (const rejectedPathspec of [
      ':(top,literal)README.md',
      ':(top,literal)moldea/context/../project.md',
      ':(top,literal)moldea/context/*.md',
    ]) {
      const rejectedSelectionResult = runWrappedGit(wrapperPath, repositoryPath, [
        ...selectedInventoryArguments,
        rejectedPathspec,
      ]);

      assert.equal(rejectedSelectionResult.status, 2);
      assert.match(rejectedSelectionResult.stderr, /command shape is not evaluator-approved/u);
    }

    const multipleSelectionResult = runWrappedGit(wrapperPath, repositoryPath, [
      ...selectedInventoryArguments,
      ':(top,literal)moldea/project.md',
      ':(top,literal)moldea/moldea.yaml',
    ]);

    assert.equal(multipleSelectionResult.status, 2);
    assert.match(multipleSelectionResult.stderr, /command shape is not evaluator-approved/u);

    const unsupportedCommandSentinelPath = join(repositoryPath, 'unsupported-git-command-ran.txt');
    runSystemGit(repositoryPath, [
      'config',
      'alias.package-manager',
      '!printf executed > unsupported-git-command-ran.txt',
    ]);
    const unsupportedCommandResult = runWrappedGit(wrapperPath, repositoryPath, [
      'package-manager',
    ]);

    assert.equal(unsupportedCommandResult.status, 2);
    assert.match(unsupportedCommandResult.stderr, /command shape is not evaluator-approved/u);
    assert.equal(existsSync(unsupportedCommandSentinelPath), false);

    const attributesPath = join(repositoryPath, '.gitattributes');
    writeFileSync(attributesPath, Buffer.alloc(32_768, 'a'));
    const maximumAttributesResult = runWrappedGit(wrapperPath, repositoryPath, statusArguments);

    assert.equal(maximumAttributesResult.status, 0, maximumAttributesResult.stderr);

    writeFileSync(attributesPath, Buffer.alloc(32_769, 'a'));
    const oversizedAttributesResult = runWrappedGit(wrapperPath, repositoryPath, statusArguments);

    assert.equal(oversizedAttributesResult.status, 2);
    assert.match(
      oversizedAttributesResult.stderr,
      /repository attribute safety was not established/u,
    );
    rmSync(attributesPath);

    const deepDirectoryRoot = join(repositoryPath, 'deep');
    let deepDirectoryPath = deepDirectoryRoot;
    for (let depth = 0; depth < 65; depth += 1) {
      deepDirectoryPath = join(deepDirectoryPath, `depth-${depth}`);
    }
    mkdirSync(deepDirectoryPath, { recursive: true });
    const excessiveDepthResult = runWrappedGit(wrapperPath, repositoryPath, statusArguments);

    assert.equal(excessiveDepthResult.status, 2);
    assert.match(excessiveDepthResult.stderr, /repository attribute safety was not established/u);
    rmSync(deepDirectoryRoot, { recursive: true });

    const wideDirectoryPath = join(repositoryPath, 'wide');
    mkdirSync(wideDirectoryPath);
    for (let entryIndex = 0; entryIndex < 4_097; entryIndex += 1) {
      writeFileSync(join(wideDirectoryPath, `entry-${entryIndex}`), '');
    }
    const excessiveEntriesResult = runWrappedGit(wrapperPath, repositoryPath, statusArguments);

    assert.equal(excessiveEntriesResult.status, 2);
    assert.match(excessiveEntriesResult.stderr, /repository attribute safety was not established/u);
    rmSync(wideDirectoryPath, { recursive: true });

    const filterPath = join(repositoryPath, 'git-filter.sh');
    writeFileSync(
      filterPath,
      '#!/bin/sh\nprintf "executed\\n" > git-filter-ran.txt\ncat\n',
      'utf8',
    );
    chmodSync(filterPath, 0o755);
    writeFileSync(attributesPath, '*.js filter=execution-trap\n', 'utf8');
    runSystemGit(repositoryPath, ['config', 'filter.execution-trap.clean', './git-filter.sh']);
    writeFileSync(join(repositoryPath, 'project-state.js'), 'export const state = "changed";\n');

    const diffArguments = [...CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX, 'project-state.js'];
    const blockedResult = runWrappedGit(wrapperPath, repositoryPath, diffArguments);

    assert.equal(blockedResult.status, 2);
    assert.match(blockedResult.stderr, /repository attribute safety was not established/u);
    assert.equal(existsSync(sentinelPath), false);

    runSystemGit(repositoryPath, ['add', '.gitattributes']);
    rmSync(attributesPath);
    const fallbackBlockedResult = runWrappedGit(wrapperPath, repositoryPath, diffArguments);

    assert.equal(fallbackBlockedResult.status, 2);
    assert.match(fallbackBlockedResult.stderr, /repository attribute safety was not established/u);
    assert.equal(existsSync(sentinelPath), false);
  } finally {
    rmSync(testRoot, { force: true, recursive: true });
  }
});

test('Git command-policy boundary budgets exact trusted read-only workspace paths separately', async () => {
  const testRoot = mkdtempSync(join(tmpdir(), 'moldea-git-read-only-dependencies-test-'));
  const repositoryPath = join(testRoot, 'repository');
  const dependencyDirectoryPath = join(repositoryPath, 'node_modules');
  const skillDirectoryPath = join(repositoryPath, '.agents', 'skills', 'moldea');
  const statusArguments = [...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS];

  try {
    mkdirSync(dependencyDirectoryPath, { recursive: true });
    runSystemGit(repositoryPath, ['init', '--quiet']);
    writeFileSync(join(repositoryPath, 'project-state.js'), 'export const state = "clean";\n');
    runSystemGit(repositoryPath, ['add', '--all']);
    runSystemGit(repositoryPath, [
      '-c',
      'user.name=moldea evaluation',
      '-c',
      'user.email=evaluation@invalid.example',
      'commit',
      '--quiet',
      '-m',
      'test: initialize read-only dependency fixture',
    ]);
    for (let entryIndex = 0; entryIndex < 4_097; entryIndex += 1) {
      writeFileSync(join(dependencyDirectoryPath, `entry-${entryIndex}`), '');
    }

    const strictWrapperPath = await prepareGitCommandPolicyBoundary(join(testRoot, 'strict-bin'));
    const strictResult = runWrappedGit(strictWrapperPath, repositoryPath, statusArguments);

    assert.equal(strictResult.status, 2);
    assert.match(strictResult.stderr, /repository attribute safety was not established/u);

    const trustedWrapperPath = await prepareGitCommandPolicyBoundary(
      join(testRoot, 'trusted-bin'),
      {
        trustedReadOnlyWorkspacePaths: ['.agents/skills/moldea', 'node_modules'],
      },
    );
    const trustedResult = runWrappedGit(trustedWrapperPath, repositoryPath, statusArguments);

    assert.equal(trustedResult.status, 0, trustedResult.stderr);

    mkdirSync(skillDirectoryPath, { recursive: true });
    for (let entryIndex = 0; entryIndex < 4_097; entryIndex += 1) {
      writeFileSync(join(skillDirectoryPath, `entry-${entryIndex}`), '');
    }
    const nestedTrustedResult = runWrappedGit(trustedWrapperPath, repositoryPath, statusArguments);

    assert.equal(nestedTrustedResult.status, 0, nestedTrustedResult.stderr);

    const writableSiblingPath = join(repositoryPath, '.agents', 'scratch');
    mkdirSync(writableSiblingPath, { recursive: true });
    for (let entryIndex = 0; entryIndex < 4_097; entryIndex += 1) {
      writeFileSync(join(writableSiblingPath, `entry-${entryIndex}`), '');
    }
    const writableSiblingResult = runWrappedGit(
      trustedWrapperPath,
      repositoryPath,
      statusArguments,
    );

    assert.equal(writableSiblingResult.status, 2);
    assert.match(writableSiblingResult.stderr, /repository attribute safety was not established/u);

    rmSync(writableSiblingPath, { force: true, recursive: true });
    mkdirSync(writableSiblingPath, { recursive: true });
    writeFileSync(
      join(writableSiblingPath, '.gitattributes'),
      '*.js filter=execution-trap\n',
      'utf8',
    );
    const writableAttributesResult = runWrappedGit(
      trustedWrapperPath,
      repositoryPath,
      statusArguments,
    );

    assert.equal(writableAttributesResult.status, 2);
    assert.match(
      writableAttributesResult.stderr,
      /repository attribute safety was not established/u,
    );

    await assert.rejects(
      prepareGitCommandPolicyBoundary(join(testRoot, 'invalid-bin'), {
        trustedReadOnlyWorkspacePaths: ['.agents/_backup/evidence'],
      }),
      /Invalid trusted read-only workspace path/u,
    );
  } finally {
    rmSync(testRoot, { force: true, recursive: true });
  }
});

test('Git command-policy boundary refuses linked-worktree common attributes', async () => {
  const testRoot = mkdtempSync(join(tmpdir(), 'moldea-git-common-attributes-test-'));
  const mainRepositoryPath = join(testRoot, 'main');
  const linkedWorktreePath = join(testRoot, 'linked');
  const sentinelPath = join(linkedWorktreePath, 'git-filter-ran.txt');

  try {
    mkdirSync(mainRepositoryPath);
    runSystemGit(mainRepositoryPath, ['init', '--quiet']);
    writeFileSync(join(mainRepositoryPath, 'project-state.js'), 'export const state = "clean";\n');
    runSystemGit(mainRepositoryPath, ['add', '--all']);
    runSystemGit(mainRepositoryPath, [
      '-c',
      'user.name=moldea evaluation',
      '-c',
      'user.email=evaluation@invalid.example',
      'commit',
      '--quiet',
      '-m',
      'test: initialize linked-worktree fixture',
    ]);
    runSystemGit(mainRepositoryPath, [
      'worktree',
      'add',
      '--quiet',
      '-b',
      'linked',
      linkedWorktreePath,
    ]);

    const filterPath = join(linkedWorktreePath, 'git-filter.sh');
    writeFileSync(
      filterPath,
      '#!/bin/sh\nprintf "executed\\n" > git-filter-ran.txt\ncat\n',
      'utf8',
    );
    chmodSync(filterPath, 0o755);
    runSystemGit(linkedWorktreePath, ['config', 'filter.execution-trap.clean', './git-filter.sh']);
    writeFileSync(
      join(mainRepositoryPath, '.git', 'info', 'attributes'),
      '*.js filter=execution-trap\n',
      'utf8',
    );
    writeFileSync(
      join(linkedWorktreePath, 'project-state.js'),
      'export const state = "changed";\n',
    );

    const wrapperPath = await prepareGitCommandPolicyBoundary(join(testRoot, 'bin'));
    const blockedResult = runWrappedGit(wrapperPath, linkedWorktreePath, [
      ...CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX,
      'project-state.js',
    ]);

    assert.equal(blockedResult.status, 2);
    assert.match(blockedResult.stderr, /repository attribute safety was not established/u);
    assert.equal(existsSync(sentinelPath), false);
  } finally {
    rmSync(testRoot, { force: true, recursive: true });
  }
});
