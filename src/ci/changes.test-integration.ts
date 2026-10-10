// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, expect, test } from 'vitest';

import { executeProcess } from '../process/index.ts';

import { classifyChanges } from './index.ts';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const createRepository = async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-ci-git-'));
  roots.push(root);
  const git = async (...args: string[]) =>
    (await executeProcess({ command: 'git', args, cwd: root })).stdout.trim();
  await git('init', '--quiet');
  await git('config', 'user.name', 'CI fixture');
  await git('config', 'user.email', 'fixture@example.com');
  await git('config', 'commit.gpgsign', 'false');
  const write = async (file: string, content: string) => {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), content);
  };
  const commit = async () => {
    await git('add', '.');
    await git('commit', '--quiet', '-m', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  await write('src/shared.ts', 'shared\n');
  await write('website/public/original.svg', 'original\n');
  const baseSha = await commit();
  return { root, git, write, commit, baseSha };
};

test.each(['presentation', 'mixed', 'rename-out', 'rename-in', 'copy-out', 'copy-in'])(
  'classifies a real %s Git diff conservatively',
  async (scenario) => {
    const fixture = await createRepository();
    if (scenario === 'presentation' || scenario === 'mixed') {
      await fixture.write('website/src/pages/index.astro', 'page\n');
      if (scenario === 'mixed') await fixture.write('src/new.ts', 'new\n');
    } else {
      const movesOut = scenario.endsWith('out');
      const source = movesOut ? 'website/public/original.svg' : 'src/shared.ts';
      const target = movesOut ? 'src/copied.svg' : 'website/public/copied.ts';
      if (scenario.startsWith('rename')) {
        await fixture.git('mv', source, target);
      } else {
        await fixture.write(target, movesOut ? 'original\n' : 'shared\n');
      }
    }
    const testedSha = await fixture.commit();
    expect(
      await classifyChanges({
        repositoryRoot: fixture.root,
        eventName: 'pull_request',
        refType: 'branch',
        baseSha: fixture.baseSha,
        testedSha,
      }),
    ).toBe(scenario !== 'presentation');
  },
);

test('compares the event base with the exact tested merge commit', async () => {
  const fixture = await createRepository();
  await fixture.git('checkout', '--quiet', '-b', 'feature');
  await fixture.write('website/public/original.svg', 'changed\n');
  await fixture.commit();
  await fixture.git('checkout', '--quiet', '-b', 'base', fixture.baseSha);
  await fixture.write('src/base-change.ts', 'new base input\n');
  const currentBaseSha = await fixture.commit();
  await fixture.git('merge', '--quiet', '--no-edit', 'feature');
  const testedSha = await fixture.git('rev-parse', 'HEAD');
  const inputs = {
    repositoryRoot: fixture.root,
    eventName: 'pull_request',
    refType: 'branch',
    testedSha,
  };
  expect(await classifyChanges({ ...inputs, baseSha: fixture.baseSha })).toBe(true);
  expect(await classifyChanges({ ...inputs, baseSha: currentBaseSha })).toBe(false);
  expect(await classifyChanges({ ...inputs, baseSha: testedSha })).toBe(true);
  await expect(classifyChanges({ ...inputs, baseSha: 'f'.repeat(40) })).rejects.toThrow();
});

test('keeps a partially edited rename within presentation directories narrow', async () => {
  const fixture = await createRepository();
  const source = Array.from({ length: 64 }, (_, index) => `original line ${index}`).join('\n');
  await fixture.write('website/public/source.txt', source);
  const baseSha = await fixture.commit();
  await fixture.git('mv', 'website/public/source.txt', 'website/public/renamed.txt');
  await fixture.write(
    'website/public/renamed.txt',
    source.replace('original line 0', 'edited line 0'),
  );
  const testedSha = await fixture.commit();
  expect(await fixture.git('diff', '--name-status', baseSha, testedSha)).toMatch(/^R0\d\d\s/);
  expect(
    await classifyChanges({
      repositoryRoot: fixture.root,
      eventName: 'pull_request',
      refType: 'branch',
      baseSha,
      testedSha,
    }),
  ).toBe(false);
});

test.each([
  { eventName: 'pull_request', refType: 'branch' },
  {
    eventName: 'pull_request',
    refType: 'branch',
    baseSha: '--bad-option',
    testedSha: 'f'.repeat(40),
  },
  { eventName: 'push', refType: 'tag' },
  { eventName: 'unknown', refType: 'branch' },
])('selects full checks before accessing Git for uncertain inputs %o', async (inputs) => {
  expect(await classifyChanges({ repositoryRoot: 'missing-repository', ...inputs })).toBe(true);
});
