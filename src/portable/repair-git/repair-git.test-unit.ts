// @vitest-environment node
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';

import { collectRepairGitEvidence } from './repair-git.ts';

const { runGit } = vi.hoisted(() => ({ runGit: vi.fn() }));
vi.mock('node:child_process', () => ({ spawnSync: runGit }));

const roots: string[] = [];
const repository = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-repair-git-unit-'));
  roots.push(root);
  await mkdir(join(root, '.git'));
  return root;
};

afterEach(async () => {
  runGit.mockReset();
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
    let root = await realpath(await repository());
    while (length - root.length > 64) root = join(root, 'nested-directory-'.repeat(2));
    root = join(root, 'r'.repeat(length - root.length - 1));
    await mkdir(join(root, '.git'), { recursive: true });
    expect(root).toHaveLength(length);
    vi.stubGlobal('process', { ...process, platform });
    runGit.mockImplementation((_executable: string, arguments_: string[]) => ({
      status: arguments_.includes('config') ? 1 : 0,
      stdout: Buffer.from(arguments_.includes('status') ? `# branch.oid ${'a'.repeat(40)}\0` : ''),
      stderr: Buffer.alloc(0),
    }));
    const evidence = await collectRepairGitEvidence({ repositoryRoot: root, mode: 'checkpoint' });
    if (isAllowed) {
      expect(evidence.status).toBe('available');
      expect(runGit).toHaveBeenCalled();
    } else {
      expect(evidence).toStrictEqual({
        kind: 'moldea-repair-git',
        mode: 'checkpoint',
        status: 'unavailable',
        reasonCode: 'git-read',
        reason:
          "The repository path exceeds Windows' 260-character working-directory limit for Git; move or clone it to a shorter path.",
      });
      expect(runGit).not.toHaveBeenCalled();
    }
  },
);

test.each(['config', 'ls-files', 'status', 'diff'])(
  'failed %s reads use git-read and retain only the bounded first error line',
  async (operation) => {
    runGit.mockImplementation((_executable: string, arguments_: string[]) => {
      const failed = arguments_.includes(operation);
      return {
        status: failed ? 128 : arguments_.includes('config') ? 1 : 0,
        stdout: Buffer.from(
          arguments_.includes('status') ? `# branch.oid ${'a'.repeat(40)}\0` : '',
        ),
        stderr: Buffer.from(failed ? 'fatal: Git read denied\nsecond line must not escape\n' : ''),
      };
    });
    expect(
      await collectRepairGitEvidence({ repositoryRoot: await repository(), mode: 'checkpoint' }),
    ).toMatchObject({
      status: 'unavailable',
      reasonCode: 'git-read',
      reason: 'The bounded repair Git read failed or exceeded its limit. fatal: Git read denied',
    });
  },
);

test('Git receives its portable null path for both configuration and attributes', async () => {
  runGit.mockReturnValue({
    status: 128,
    stdout: Buffer.alloc(0),
    stderr: Buffer.from('fatal: stop'),
  });
  await collectRepairGitEvidence({ repositoryRoot: await repository(), mode: 'checkpoint' });
  expect(runGit).toHaveBeenCalledExactlyOnceWith(
    'git',
    expect.arrayContaining(['core.attributesFile=/dev/null']),
    expect.any(Object),
  );
  expect(runGit.mock.calls[0]).toHaveProperty('2.env.GIT_CONFIG_GLOBAL', '/dev/null');
});

test('long Git error lines cannot exceed the bounded response reason', async () => {
  runGit.mockReturnValue({
    status: 128,
    stdout: Buffer.alloc(0),
    stderr: Buffer.from(`fatal: ${'x'.repeat(1024)}\nsecond line`),
  });
  const evidence = await collectRepairGitEvidence({
    repositoryRoot: await repository(),
    mode: 'checkpoint',
  });
  expect(evidence.status).toBe('unavailable');
  if (evidence.status !== 'unavailable') throw new Error('Expected unavailable Git evidence.');
  expect(evidence.reasonCode).toBe('git-read');
  expect(evidence.reason).toHaveLength(512);
  expect(evidence.reason).toContain('fatal: ');
  expect(evidence.reason).not.toContain('second line');
});

test('Git file-monitor failures retain git-read classification and the first error line', async () => {
  runGit.mockReturnValue({
    status: 128,
    stdout: Buffer.alloc(0),
    stderr: Buffer.from('fatal: fsmonitor read failed\nprivate detail'),
  });
  const result = await collectRepairGitEvidence({
    repositoryRoot: await repository(),
    mode: 'checkpoint',
  });
  expect(result).toMatchObject({
    status: 'unavailable',
    reasonCode: 'git-read',
    reason:
      'The bounded repair Git read failed or exceeded its limit. fatal: fsmonitor read failed',
  });
  expect(runGit.mock.calls[0]).toHaveProperty(
    '1',
    expect.arrayContaining(['core.fsmonitor=false']),
  );
});
