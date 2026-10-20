// @vitest-environment node
import { execFileSync } from 'node:child_process';
import fsPromises, {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type * as GitCommand from '../git-command/index.ts';
import { isPathWithin } from '../repository-files.ts';

import { resolveInstructionWriteTarget } from './index.ts';

const { gitCalls } = vi.hoisted(() => ({ gitCalls: [] as string[][] }));
vi.mock('../git-command/index.ts', async (importOriginal) => {
  const original = await importOriginal<typeof GitCommand>();
  return {
    ...original,
    runGitCommand: (...parameters: Parameters<typeof original.runGitCommand>) => {
      gitCalls.push([...parameters[1]]);
      return original.runGitCommand(...parameters);
    },
  };
});

const isWindows = process.platform === 'win32';
const temporaryRoots: string[] = [];

/** Runs Git in a test repository with the test's isolated home directory. */
const git = (root: string, gitArguments: string[], input?: string): string =>
  execFileSync('git', gitArguments, { cwd: root, encoding: 'utf8', input });

const createDirectory = async (prefix: string): Promise<string> => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  temporaryRoots.push(directory);
  return directory;
};

/** Creates an empty Git repository below a fresh directory, so `..` from it stays disposable. */
const createRepository = async (): Promise<string> => {
  const root = join(await createDirectory('moldea-instruction-link-'), 'repository');
  await mkdir(root);
  git(root, ['init', '-q']);
  git(root, ['config', 'core.symlinks', 'true']);
  return root;
};

const link = async (target: string, linkPath: string, kind: 'dir' | 'file' = 'file') =>
  symlink(target, linkPath, isWindows ? kind : undefined);

/** Stores a Git link in the index and checks it out as a plain file holding its text. */
const materialize = (root: string, path: string, target: string): void => {
  const objectId = git(root, ['hash-object', '-w', '--stdin'], target).trim();
  git(root, ['update-index', '--add', '--cacheinfo', `120000,${objectId},${path}`]);
  git(root, ['config', 'core.symlinks', 'false']);
  git(root, ['checkout', '--', path]);
};

// the OS oracle: the file the OS opens through the link is the selected host file
const expectSameFile = async (linkPath: string, hostPath: string): Promise<void> => {
  const [opened, selected] = await Promise.all([
    stat(linkPath, { bigint: true }),
    stat(hostPath, { bigint: true }),
  ]);
  expect([opened.dev, opened.ino]).toStrictEqual([selected.dev, selected.ino]);
};

beforeEach(async () => {
  // Git reads global config from these; each test controls it
  const home = await createDirectory('moldea-instruction-link-home-');
  vi.stubEnv('HOME', home);
  vi.stubEnv('XDG_CONFIG_HOME', join(home, '.config'));
  gitCalls.length = 0;
});

afterEach(async () => {
  vi.unstubAllEnvs();
  for (const directory of temporaryRoots.splice(0))
    await rm(directory, { recursive: true, force: true });
});

test('selects an absent or regular instruction file itself', async () => {
  const root = await createRepository();
  const absent = await resolveInstructionWriteTarget(root, 'AGENTS.md');
  expect(absent.hostPath).toBe(join(root, 'AGENTS.md'));
  expect(gitCalls).toStrictEqual([]);

  await writeFile(join(root, 'AGENTS.md'), '# Rules\n');
  const regular = await resolveInstructionWriteTarget(root, 'AGENTS.md');
  expect(regular.hostPath).toBe(join(root, 'AGENTS.md'));
  await expect(regular.confirm()).resolves.toBeUndefined();
});

test('leaves an instruction path that is a directory to the file reader without asking Git', async () => {
  const root = await createRepository();
  await mkdir(join(root, 'AGENTS.md'));

  const target = await resolveInstructionWriteTarget(root, 'AGENTS.md');

  expect(target.hostPath).toBe(join(root, 'AGENTS.md'));
  expect(gitCalls).toStrictEqual([]);
});

test('selects the regular-file target of an inside link and confirms it is kept', async () => {
  const root = await createRepository();
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs', 'AGENTS.md'), '# Rules\n');
  await link(join('docs', 'AGENTS.md'), join(root, 'AGENTS.md'));

  const target = await resolveInstructionWriteTarget(root, 'AGENTS.md');

  expect(target.hostPath).toBe(join(root, 'docs', 'AGENTS.md'));
  await expectSameFile(join(root, 'AGENTS.md'), target.hostPath);
  await expect(target.confirm()).resolves.toBeUndefined();
  await rm(join(root, 'AGENTS.md'));
  await writeFile(join(root, 'other.md'), '# Other\n');
  await link('other.md', join(root, 'AGENTS.md'));
  await expect(target.confirm()).rejects.toThrow(
    'AGENTS.md changed its link target during the update',
  );
});

test('follows a Git link checked out as a plain file without changing its text', async () => {
  const root = await createRepository();
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs', 'AGENTS.md'), '# Rules\n');
  materialize(root, 'AGENTS.md', 'docs/AGENTS.md');
  const linkBytes = await readFile(join(root, 'AGENTS.md'));
  expect(linkBytes.toString('utf8')).toBe('docs/AGENTS.md');

  const target = await resolveInstructionWriteTarget(root, 'AGENTS.md');

  expect(target.hostPath).toBe(join(root, 'docs', 'AGENTS.md'));
  await expect(target.confirm()).resolves.toBeUndefined();
  expect(await readFile(join(root, 'AGENTS.md'))).toStrictEqual(linkBytes);
});

test('updates a committed link replaced by a real file as a plain file when links are enabled', async () => {
  const root = await createRepository();
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs', 'AGENTS.md'), '# Rules\n');
  materialize(root, 'AGENTS.md', 'docs/AGENTS.md');
  git(root, ['config', 'core.symlinks', 'true']);
  await writeFile(join(root, 'AGENTS.md'), '# Replaced\n');

  const target = await resolveInstructionWriteTarget(root, 'AGENTS.md');

  expect(target.hostPath).toBe(join(root, 'AGENTS.md'));
});

test('refuses link and regular-file index modes for one path when links are disabled', async () => {
  const root = await createRepository();
  await writeFile(join(root, 'AGENTS.md'), '# Rules\n');
  const linkObject = git(root, ['hash-object', '-w', '--stdin'], 'docs/AGENTS.md').trim();
  const fileObject = git(root, ['hash-object', '-w', '--', 'AGENTS.md']).trim();
  git(
    root,
    ['update-index', '--index-info'],
    `120000 ${linkObject} 2\tAGENTS.md\n100644 ${fileObject} 3\tAGENTS.md\n`,
  );
  git(root, ['config', 'core.symlinks', 'false']);

  await expect(resolveInstructionWriteTarget(root, 'AGENTS.md')).rejects.toThrow(
    'AGENTS.md is stored in the Git index both as a link and as a file',
  );
});

test.each([
  ['outside', 'AGENTS.md links outside the repository'],
  ['absolute', 'Replace an absolute link with a relative one'],
  ['missing', "AGENTS.md links to a file that isn't in the repository"],
  ['ignored', 'commit it, or point the link at a committed file'],
  ['loop', 'AGENTS.md is a link loop. Fix the links'],
  ['directory', "AGENTS.md doesn't link straight to a file"],
  ['parent after folder', "AGENTS.md doesn't link straight to a file"],
])('refuses a %s link with its reason and changes no file', async (condition, message) => {
  const root = await createRepository();
  const outsidePath = join(root, '..', 'outside.md');
  await writeFile(outsidePath, 'outside\n');
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs', 'AGENTS.md'), '# Rules\n');
  const agentsPath = join(root, 'AGENTS.md');
  if (condition === 'outside') await link(join('..', 'outside.md'), agentsPath);
  if (condition === 'absolute') await link(join(root, 'docs', 'AGENTS.md'), agentsPath);
  if (condition === 'missing') await link('missing.md', agentsPath);
  if (condition === 'ignored') {
    await writeFile(join(root, '.gitignore'), 'private.md\n');
    await writeFile(join(root, 'private.md'), '# Private\n');
    await link('private.md', agentsPath);
  }
  if (condition === 'loop') {
    await link('loop.md', agentsPath);
    await link('AGENTS.md', join(root, 'loop.md'));
  }
  if (condition === 'directory') await link('docs', agentsPath, 'dir');
  if (condition === 'parent after folder') await link('docs/../docs/AGENTS.md', agentsPath);

  await expect(resolveInstructionWriteTarget(root, 'AGENTS.md')).rejects.toThrow(message);
  expect(await readFile(outsidePath, 'utf8')).toBe('outside\n');
  expect(await readFile(join(root, 'docs', 'AGENTS.md'), 'utf8')).toBe('# Rules\n');
});

test('follows a link to an ignored instruction file, as validation does', async () => {
  const root = await createRepository();
  await writeFile(join(root, '.gitignore'), 'CLAUDE.local.md\n');
  await writeFile(join(root, 'CLAUDE.local.md'), '# Mine\n');
  await link('CLAUDE.local.md', join(root, 'AGENTS.md'));

  const target = await resolveInstructionWriteTarget(root, 'AGENTS.md');

  expect(target.hostPath).toBe(join(root, 'CLAUDE.local.md'));
});

test('refuses when Git cannot report how the repository stores the file', async () => {
  const root = join(await createDirectory('moldea-instruction-link-no-git-'), 'repository');
  await mkdir(root);
  await writeFile(join(root, 'AGENTS.md'), '# Rules\n');

  await expect(resolveInstructionWriteTarget(root, 'AGENTS.md')).rejects.toThrow(
    'AGENTS.md was not updated: Git could not report how the repository stores this file',
  );
});

test('queries a target name with pathspec characters literally', async () => {
  const root = await createRepository();
  // a leading `:(glob)` is pathspec magic unless Git reads the name literally
  const name = isWindows ? 'notes[1].md' : ':(glob)notes[1].md';
  await writeFile(join(root, 'notes1.md'), '# Glob match\n');
  await writeFile(join(root, name), '# Literal\n');
  await link(name, join(root, 'AGENTS.md'));

  const target = await resolveInstructionWriteTarget(root, 'AGENTS.md');

  expect(target.hostPath).toBe(join(root, name));
  expect(gitCalls).toContainEqual([
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '--stage',
    '-z',
    '--',
    name,
  ]);
});

test('asks Git only about visited paths, and about core.symlinks only after a link mode', async () => {
  const root = await createRepository();
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs', 'AGENTS.md'), '# Rules\n');
  await writeFile(join(root, 'unrelated.md'), '# Unrelated\n');
  await link(join('docs', 'AGENTS.md'), join(root, 'AGENTS.md'));

  await resolveInstructionWriteTarget(root, 'AGENTS.md');
  expect(gitCalls.map((call) => call.at(-1))).toStrictEqual(['AGENTS.md', 'docs/AGENTS.md']);

  gitCalls.length = 0;
  await rm(join(root, 'AGENTS.md'));
  materialize(root, 'AGENTS.md', 'docs/AGENTS.md');
  await resolveInstructionWriteTarget(root, 'AGENTS.md');
  expect(gitCalls).toStrictEqual([
    ['ls-files', '--cached', '--others', '--exclude-standard', '--stage', '-z', '--', 'AGENTS.md'],
    ['config', '--type=bool', '--default=true', '--get', 'core.symlinks'],
    [
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '--stage',
      '-z',
      '--',
      'docs/AGENTS.md',
    ],
  ]);
});

test('counts only Git output lines that name exactly the visited path', async () => {
  const root = await createRepository();
  await mkdir(join(root, 'notes'));
  await writeFile(join(root, 'notes', 'a.md'), '# A\n');
  git(root, ['add', '--', 'notes/a.md']);
  await rm(join(root, 'notes'), { recursive: true });
  await writeFile(join(root, '.gitignore'), '/notes\n');
  await writeFile(join(root, 'notes'), '# Ignored file\n');
  await link('notes', join(root, 'AGENTS.md'));

  await expect(resolveInstructionWriteTarget(root, 'AGENTS.md')).rejects.toThrow(
    "AGENTS.md links to a file that isn't in the repository",
  );
});

test.each([
  ['a global core.symlinks=false', 'global-false', 'link'],
  ['a repository value over the global one', 'repository-true', 'file'],
])('honors %s, as the CLI does', async (_label, configuration, expected) => {
  const root = await createRepository();
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs', 'AGENTS.md'), '# Rules\n');
  materialize(root, 'AGENTS.md', 'docs/AGENTS.md');
  git(root, ['config', '--unset', 'core.symlinks']);
  git(root, ['config', '--global', 'core.symlinks', 'false']);
  if (configuration === 'repository-true') git(root, ['config', 'core.symlinks', 'true']);

  const target = await resolveInstructionWriteTarget(root, 'AGENTS.md');

  expect(target.hostPath).toBe(
    expected === 'link' ? join(root, 'docs', 'AGENTS.md') : join(root, 'AGENTS.md'),
  );
});

test('treats a target a global excludes file ignores as missing, as the CLI does', async () => {
  const root = await createRepository();
  const home = process.env['HOME']!;
  await writeFile(join(home, 'excludes'), 'shared.md\n');
  git(root, ['config', '--global', 'core.excludesFile', join(home, 'excludes')]);
  await writeFile(join(root, 'shared.md'), '# Shared\n');
  await link('shared.md', join(root, 'AGENTS.md'));

  await expect(resolveInstructionWriteTarget(root, 'AGENTS.md')).rejects.toThrow(
    "AGENTS.md links to a file that isn't in the repository",
  );
});

test('never touches a host path outside the repository root', async () => {
  const root = await createRepository();
  await writeFile(join(root, '..', 'outside.md'), 'outside\n');
  const observed: string[] = [];
  const record =
    <TArguments extends unknown[], TResult>(
      original: (...parameters: TArguments) => TResult,
    ): ((...parameters: TArguments) => TResult) =>
    (...parameters) => {
      observed.push(String(parameters[0]));
      return original(...parameters);
    };

  for (const target of [
    join('..', 'outside.md'),
    join(root, '..', 'outside.md'),
    isWindows ? '\\\\server\\share\\AGENTS.md' : '//server/share/AGENTS.md',
  ]) {
    await rm(join(root, 'AGENTS.md'), { force: true });
    await link(target, join(root, 'AGENTS.md'));
    for (const name of ['lstat', 'readlink', 'open', 'opendir', 'realpath', 'stat'] as const) {
      const original = fsPromises[name];
      vi.spyOn(fsPromises, name).mockImplementation(record(original) as never);
    }
    syncBuiltinESMExports();
    try {
      await expect(resolveInstructionWriteTarget(root, 'AGENTS.md')).rejects.toThrow(
        'AGENTS.md links outside the repository',
      );
    } finally {
      vi.restoreAllMocks();
      syncBuiltinESMExports();
    }
  }

  expect(observed.length).toBeGreaterThan(0);
  expect(observed.filter((hostPath) => !isPathWithin(root, hostPath))).toStrictEqual([]);
});

test('requires a nested instruction file to sit in a real directory', async () => {
  const root = await createRepository();
  const outside = join(root, '..', 'claude-outside');
  await mkdir(outside);
  await writeFile(join(outside, 'CLAUDE.md'), '# Outside\n');
  await link(outside, join(root, '.claude'), 'dir');

  await expect(resolveInstructionWriteTarget(root, '.claude/CLAUDE.md')).rejects.toThrow(
    '.claude must be a regular directory',
  );
  await rm(join(root, '.claude'));
  const absent = await resolveInstructionWriteTarget(root, '.claude/CLAUDE.md');
  expect(absent.hostPath).toBe(join(root, '.claude', 'CLAUDE.md'));
});
