// @vitest-environment node
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
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
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

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
