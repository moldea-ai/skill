// @vitest-environment node
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Exception } from 'jg-exception';
import type * as GitCommands from 'jg-git-commands';
import { ERRORS as GIT_ERRORS } from 'jg-git-commands';
import { ERRORS as PROCESS_ERRORS } from 'jg-process';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { collectRepairGitEvidence } from './repair-git.ts';

const COMMIT = 'a'.repeat(40);

const { git } = vi.hoisted(() => ({
  git: { readIndexEntries: vi.fn(), readStatus: vi.fn(), runGit: vi.fn() },
}));
vi.mock('jg-git-commands', async (importOriginal) => ({
  ...(await importOriginal<typeof GitCommands>()),
  readIndexEntries: git.readIndexEntries,
  readStatus: git.readStatus,
  runGit: git.runGit,
}));

const roots: string[] = [];
const repository = async (): Promise<string> => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'moldea-repair-git-unit-')));
  roots.push(root);
  await mkdir(join(root, '.git'));
  return root;
};

// a result of one raw read: the unset attribute source exits with 1, and every diff succeeds
const createResult = (arguments_: readonly string[], failedCommand?: string) => ({
  exitCode: arguments_[0] === failedCommand ? 128 : arguments_[0] === 'config' ? 1 : 0,
  stdout: Buffer.alloc(0),
  stderr: Buffer.from(arguments_[0] === failedCommand ? 'fatal: Git read denied\n' : ''),
});

// a clean checkpoint: no stored attribute source, an empty index and one commit
beforeEach(() => {
  git.runGit.mockImplementation((arguments_: readonly string[]) =>
    Promise.resolve(createResult(arguments_)),
  );
  git.readIndexEntries.mockResolvedValue([]);
  git.readStatus.mockResolvedValue({ commit: COMMIT, entries: [] });
});

afterEach(async () => {
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

test.each([
  ['win32', 259, true],
  ['win32', 260, false],
  ['win32', 261, false],
  ['linux', 260, true],
] as const)(
  'Git startup on %s with a %d-character root is allowed: %s',
  async (platform, length, isAllowed) => {
    let root = await repository();
    while (length - root.length > 64) root = join(root, 'nested-directory-'.repeat(2));
    root = join(root, 'r'.repeat(length - root.length - 1));
    await mkdir(join(root, '.git'), { recursive: true });
    expect(root).toHaveLength(length);
    vi.stubGlobal('process', { ...process, platform });
    const evidence = await collectRepairGitEvidence({ repositoryRoot: root, mode: 'checkpoint' });
    if (isAllowed) {
      expect(evidence.status).toBe('available');
      expect(git.runGit).toHaveBeenCalled();
    } else {
      expect(evidence).toStrictEqual({
        kind: 'moldea-repair-git',
        mode: 'checkpoint',
        status: 'unavailable',
        reasonCode: 'git-read',
        reason:
          "The repository path exceeds Windows' 260-character working-directory limit for Git; move or clone it to a shorter path.",
      });
      expect(git.runGit).not.toHaveBeenCalled();
    }
  },
);

test.each(['config', 'ls-files', 'status', 'diff'])(
  'failed %s reads use git-read without echoing Git output',
  async (operation) => {
    const failure = new Exception('The git command failed.', {
      code: GIT_ERRORS.GIT_COMMAND_FAILED,
    });
    if (operation === 'ls-files') git.readIndexEntries.mockRejectedValue(failure);
    if (operation === 'status') git.readStatus.mockRejectedValue(failure);
    git.runGit.mockImplementation((arguments_: readonly string[]) =>
      Promise.resolve(createResult(arguments_, operation)),
    );
    expect(
      await collectRepairGitEvidence({ repositoryRoot: await repository(), mode: 'checkpoint' }),
    ).toStrictEqual({
      kind: 'moldea-repair-git',
      mode: 'checkpoint',
      status: 'unavailable',
      reasonCode: 'git-read',
      reason: 'The git command failed.',
    });
  },
);

test('Git output past its bound reports output-limit', async () => {
  git.readStatus.mockRejectedValue(
    new Exception('The process wrote more output than allowed', {
      code: PROCESS_ERRORS.PROCESS_OUTPUT_TOO_LARGE,
    }),
  );
  expect(
    await collectRepairGitEvidence({ repositoryRoot: await repository(), mode: 'checkpoint' }),
  ).toMatchObject({ status: 'unavailable', reasonCode: 'output-limit' });
});

test('long Git error messages cannot exceed the bounded response reason', async () => {
  git.readStatus.mockRejectedValue(
    new Exception(`Git's output isn't valid: ${'x'.repeat(1024)}`, {
      code: GIT_ERRORS.GIT_OUTPUT_INVALID,
    }),
  );
  const evidence = await collectRepairGitEvidence({
    repositoryRoot: await repository(),
    mode: 'checkpoint',
  });
  expect(evidence.status).toBe('unavailable');
  if (evidence.status !== 'unavailable') throw new Error('Expected unavailable Git evidence.');
  expect(evidence.reasonCode).toBe('git-read');
  expect(evidence.reason).toHaveLength(512);
});

test('every read sees only the repository config, its own work tree and empty LFS filters', async () => {
  const root = await repository();
  const options = {
    isolateConfig: true,
    env: {
      GIT_WORK_TREE: root,
      GIT_CONFIG_COUNT: '4',
      GIT_CONFIG_KEY_0: 'filter.lfs.clean',
      GIT_CONFIG_VALUE_0: '',
      GIT_CONFIG_KEY_1: 'filter.lfs.process',
      GIT_CONFIG_VALUE_1: '',
      GIT_CONFIG_KEY_2: 'filter.lfs.required',
      GIT_CONFIG_VALUE_2: 'false',
      GIT_CONFIG_KEY_3: 'filter.lfs.smudge',
      GIT_CONFIG_VALUE_3: '',
    },
  };

  expect(
    await collectRepairGitEvidence({ repositoryRoot: root, mode: 'checkpoint' }),
  ).toMatchObject({ status: 'available', commit: COMMIT });
  expect(git.runGit).toHaveBeenCalledWith(['config', '--null', '--get', 'attr.tree'], {
    cwd: root,
    encoding: 'buffer',
    maxOutputBytes: 262_144,
    ...options,
  });
  expect(git.readIndexEntries).toHaveBeenCalledWith(root, {
    maxOutputBytes: 4_194_304,
    ...options,
  });
  expect(git.readStatus).toHaveBeenCalledWith(root, { maxOutputBytes: 262_144, ...options });
  expect(git.runGit).toHaveBeenCalledWith(
    [
      'diff',
      '--no-ext-diff',
      '--no-textconv',
      '--ignore-submodules=all',
      COMMIT,
      '--',
      'moldea/moldea.yaml',
    ],
    { cwd: root, encoding: 'buffer', maxOutputBytes: 262_144, ...options },
  );
});
