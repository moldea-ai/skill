// @vitest-environment node
import { expect, test } from 'vitest';

import {
  CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX,
  CODEX_EVALUATION_GIT_STATUS_ARGUMENTS,
  isApprovedRepairGitArguments,
} from './git-command-policy-boundary.ts';

const status = [...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS, '--untracked-files=all', '--branch'];
const diff = CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX.slice(0, -1);
const hardened = status.slice(0, status.indexOf('status'));
const storage = [
  ...hardened,
  'ls-files',
  '--cached',
  '--others',
  '--exclude-standard',
  '--stage',
  '-z',
  '--',
];
const symlinkSetting = [
  ...hardened,
  'config',
  '--type=bool',
  '--default=true',
  '--get',
  'core.symlinks',
];

// jg-git-commands 0.3.1's command prefix, and the same with `isolateConfig`
const jgPrefix = [
  '-c',
  'core.fsmonitor=',
  '-c',
  'core.askPass=',
  '-c',
  'core.pager=cat',
  '-c',
  'color.ui=false',
  '-c',
  'submodule.recurse=false',
  '-c',
  'credential.helper=',
  '--no-pager',
];
const jgIsolatedPrefix = [
  ...jgPrefix.slice(0, 10),
  '-c',
  'core.attributesFile=/dev/null',
  ...jgPrefix.slice(10),
];
const commit = 'a'.repeat(40);
const repairDiff = [
  ...jgIsolatedPrefix,
  'diff',
  '--no-ext-diff',
  '--no-textconv',
  '--ignore-submodules=all',
];
const changedPaths = [
  ...jgIsolatedPrefix,
  'diff',
  '--no-ext-diff',
  '--no-textconv',
  '--no-renames',
  '--ignore-submodules=all',
  '--name-only',
  '-z',
  '--end-of-options',
];
const index = [...jgPrefix, 'ls-files', '--cached', '--stage', '--full-name', '-z', '--'];
const untracked = [
  ...jgPrefix,
  'ls-files',
  '--others',
  '--exclude-standard',
  '--full-name',
  '-z',
  '--',
];

test.each([
  status,
  [...status.slice(0, status.indexOf('status')), 'config', '--null', '--get', 'attr.tree'],
  [...diff, '--name-only', '--no-renames', '-z', 'a'.repeat(40), '--', '.'],
  [...diff, '--name-only', '--no-renames', 'a'.repeat(40), '--', '.'],
  [...diff, 'HEAD', '--', 'moldea/moldea.yaml'],
  [...diff, 'repair-checkpoint', '--', 'moldea/moldea.yaml'],
  [...diff, 'HEAD~1', '--', 'moldea/moldea.yaml'],
  [...diff, 'refs/tags/release@2^{commit}', '--', 'moldea/moldea.yaml'],
  [...diff, '--', 'moldea/context/a.md'],
  [...diff, '--', 'README.md', 'src/owner-a.js'],
  [...diff, '--', 'src/file with spaces.js'],
  [...jgIsolatedPrefix, 'config', '--null', '--get', 'attr.tree'],
  [...jgIsolatedPrefix, 'ls-files', '--cached', '--stage', '--full-name', '-z', '--'],
  [
    ...jgIsolatedPrefix,
    'status',
    '--porcelain=v2',
    '-z',
    '--branch',
    '--untracked-files=all',
    '--ignore-submodules=all',
  ],
  [
    ...jgIsolatedPrefix,
    'rev-parse',
    '--verify',
    '--quiet',
    '--end-of-options',
    `${commit}^{commit}`,
  ],
  [...changedPaths, commit, '--'],
  [...changedPaths, 'b'.repeat(64), '--'],
  [...repairDiff, commit, '--', 'moldea/moldea.yaml'],
  [...repairDiff, '--', 'README.md', 'src/file with spaces.js'],
  [...index, 'AGENTS.md'],
  [...untracked, 'docs/shared agents.md'],
  [...jgPrefix, 'config', '--type=bool', '--default=true', '--get', 'core.symlinks'],
])('accepts a complete approved repair shape %o', (...argumentsList) => {
  expect(isApprovedRepairGitArguments(argumentsList)).toBe(true);
});

test.each([
  [
    'status',
    '--porcelain=v2',
    '-z',
    '--ignore-submodules=all',
    '--untracked-files=all',
    '--branch',
  ],
  [...status.slice(0, -1)],
  [...status, '--short'],
  ['-c', 'core.fsmonitor=false', ...status],
  ['-c', 'core.fsmonitor=true', ...status],
  [...status.slice(2)],
  [...diff, '--name-only', '--no-renames', 'HEAD', '--', 'src'],
  [...diff, '--name-only', 'HEAD', '--', '.'],
  ...['HEAD..main', 'HEAD^!', 'HEAD^-', 'HEAD^-2', 'HEAD^@', '^HEAD'].map((commit) => [
    ...diff,
    commit,
    '--',
    'moldea/moldea.yaml',
  ]),
  [...diff, '--cached', '--', 'moldea/moldea.yaml'],
  [...diff, 'HEAD', '--', 'moldea/moldea.yaml', 'src/a.js'],
  [...diff, 'HEAD', 'moldea/moldea.yaml'],
  [...diff, '--'],
  ...[
    '.',
    './README.md',
    '../README.md',
    '/mnt/README.md',
    'src//a.js',
    'src/../a.js',
    'src\\a.js',
    ':(top)README.md',
    'moldea/**',
    'src/[ab].js',
    'src/{a,b}.js',
    '~/README.md',
    '-p',
    'src/a\n.js',
    'src/a\u0085.js',
    ...['_archive', '_archives', '_backup', '_backups'].map((directory) => `src/${directory}/a.js`),
  ].map((path) => [...diff, '--', path]),
  [...diff, '--cached', '--', 'README.md'],
  [...status.slice(0, status.indexOf('status')), 'rev-parse', 'HEAD'],
  storage,
  [...storage, 'AGENTS.md', 'CLAUDE.md'],
  [...storage.filter((argument) => argument !== '--exclude-standard'), 'AGENTS.md'],
  [...storage.slice(0, -1), '--ignored', '--', 'AGENTS.md'],
  [...storage.slice(0, -1), 'AGENTS.md'],
  ...[':(top)AGENTS.md', 'docs/[ab].md', '../AGENTS.md', 'src/_archive/AGENTS.md', '-p'].map(
    (path) => [...storage, path],
  ),
  [...diff.slice(0, diff.indexOf('diff')), ...storage.slice(hardened.length), 'AGENTS.md'],
  symlinkSetting.slice(0, -1),
  [...symlinkSetting.slice(0, -1), 'core.hooksPath'],
  [...hardened, 'config', '--get', 'core.symlinks'],
  // the hardened forms of reads the helpers now run through jg-git-commands
  [...hardened, 'ls-files', '-z', '--', '.'],
  [...hardened, 'cat-file', '-t', commit],
  [...storage, 'AGENTS.md'],
  symlinkSetting,
  // jg-git-commands command lines outside the helpers' exact reads
  [
    ...jgPrefix.slice(0, -3),
    '--no-pager',
    'ls-files',
    '--cached',
    '--stage',
    '--full-name',
    '-z',
    '--',
    'AGENTS.md',
  ],
  [...jgPrefix, 'config', '--null', '--get', 'attr.tree'],
  [
    ...jgPrefix,
    'status',
    '--porcelain=v2',
    '-z',
    '--branch',
    '--untracked-files=all',
    '--ignore-submodules=all',
  ],
  [...jgIsolatedPrefix, 'ls-files', '--cached', '--stage', '--full-name', '-z', '--', 'AGENTS.md'],
  [...jgIsolatedPrefix, 'rev-parse', '--verify', '--quiet', '--end-of-options', 'HEAD^{commit}'],
  [...jgIsolatedPrefix, 'rev-parse', '--verify', '--quiet', '--end-of-options', commit],
  [...jgIsolatedPrefix, 'rev-parse', '--verify', '--end-of-options', `${commit}^{commit}`],
  [...changedPaths, 'HEAD', '--'],
  [...changedPaths, commit, '--', '.'],
  [...changedPaths, commit],
  [...repairDiff, 'HEAD', '--', 'moldea/moldea.yaml'],
  [...repairDiff, commit, '--', 'moldea/project.md'],
  [...repairDiff, '--'],
  [...repairDiff, '--', '.'],
  [...repairDiff, '--', ':(top)README.md'],
  [...repairDiff, '--', 'src/_backup/a.js'],
  index,
  [...index, 'AGENTS.md', 'CLAUDE.md'],
  [...index, ':(top)AGENTS.md'],
  [...untracked, '../AGENTS.md'],
  [...untracked.slice(0, -1), '--ignored', '--', 'AGENTS.md'],
  [...jgPrefix, 'config', '--type=bool', '--default=true', '--get', 'core.hooksPath'],
])('rejects a nonapproved repair shape %o', (...argumentsList) => {
  expect(isApprovedRepairGitArguments(argumentsList)).toBe(false);
});
