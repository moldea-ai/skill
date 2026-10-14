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
  [...diff, '--name-only', '--no-renames', 'a'.repeat(40), '--', '.'],
  [...diff, 'HEAD', '--', 'moldea/moldea.yaml'],
  [...diff, 'repair-checkpoint', '--', 'moldea/moldea.yaml'],
  [...diff, 'HEAD~1', '--', 'moldea/moldea.yaml'],
  [...diff, 'refs/tags/release@2^{commit}', '--', 'moldea/moldea.yaml'],
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
  [...status.slice(0, status.indexOf('status')), 'rev-parse', 'HEAD'],
])('rejects a nonapproved repair shape %o', (...argumentsList) => {
  expect(isApprovedRepairGitArguments(argumentsList)).toBe(false);
});
