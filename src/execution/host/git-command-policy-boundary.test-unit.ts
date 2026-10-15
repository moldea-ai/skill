// @vitest-environment node
import { expect, test } from 'vitest';

import {
  CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX,
  CODEX_EVALUATION_GIT_STATUS_ARGUMENTS,
  isApprovedRepairGitArguments,
} from './git-command-policy-boundary.ts';

const status = [...CODEX_EVALUATION_GIT_STATUS_ARGUMENTS, '--untracked-files=all', '--branch'];
const diff = CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX.slice(0, -1);

test.each([
  status,
  [...status.slice(0, status.indexOf('status')), 'config', '--null', '--get', 'attr.tree'],
  [...status.slice(0, status.indexOf('status')), 'ls-files', '-z', '--', '.'],
  [...diff, '--name-only', '--no-renames', '-z', 'a'.repeat(40), '--', '.'],
  [...diff, '--name-only', '--no-renames', 'a'.repeat(40), '--', '.'],
  [...diff, 'HEAD', '--', 'moldea/moldea.yaml'],
  [...diff, 'repair-checkpoint', '--', 'moldea/moldea.yaml'],
  [...diff, 'HEAD~1', '--', 'moldea/moldea.yaml'],
  [...diff, 'refs/tags/release@2^{commit}', '--', 'moldea/moldea.yaml'],
  [...diff, '--', 'moldea/context/a.md'],
  [...diff, '--', 'README.md', 'src/owner-a.js'],
  [...diff, '--', 'src/file with spaces.js'],
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
])('rejects a nonapproved repair shape %o', (...argumentsList) => {
  expect(isApprovedRepairGitArguments(argumentsList)).toBe(false);
});
