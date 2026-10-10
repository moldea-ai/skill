// @vitest-environment node
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';

const TEST_NODE_EXECUTABLE = process.env['MOLDEA_TEST_NODE'] ?? process.execPath;
const SOURCE = resolve(import.meta.dirname, '../../../moldea');
const withInstallation = async (
  operation: (root: string, run: (flags?: string[]) => SpawnSyncReturns<string>) => Promise<void>,
): Promise<void> => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-agents-'));
  try {
    const skill = join(root, '.agents', 'skills', 'moldea');
    await mkdir(join(skill, 'scripts'), { recursive: true });
    await copyFile(join(SOURCE, 'SKILL.md'), join(skill, 'SKILL.md'));
    for (const name of await readdir(join(SOURCE, 'scripts')))
      await copyFile(join(SOURCE, 'scripts', name), join(skill, 'scripts', name));
    const run = (flags: string[] = []) =>
      spawnSync(
        TEST_NODE_EXECUTABLE,
        [join(skill, 'scripts', 'managed-agents.mjs'), '--repository', root, ...flags],
        { encoding: 'utf8' },
      );
    await operation(root, run);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

test('print, write and check agree and preserve unrelated instruction bytes', async () => {
  await withInstallation(async (root, run) => {
    expect(run(['--check']).stdout).toMatch(/^warning: AGENTS.md is missing/u);
    const printed = run(['--print']);
    expect(printed.status).toBe(0);
    expect(printed.stdout).toContain(
      '<repo-root>/.agents/skills/moldea/scripts/relevance-gate.mjs',
    );
    expect(printed.stdout).not.toContain(root);
    const target = join(root, 'AGENTS.md');
    await expect(lstat(target)).rejects.toThrow();
    expect(run().stdout).toBe('created\n');
    expect(await readFile(target, 'utf8')).toBe(printed.stdout);
    expect(run(['--check']).stdout).toBe('ready\n');
    expect(run().stdout).toBe('unchanged\n');
    const prefix = '\uFEFF# Host instructions\r\n\r\n';
    const suffix = '\r\nKeep these rules.\r\n';
    await writeFile(
      target,
      `${prefix}<!-- moldea:start -->\r\nOld\r\n<!-- moldea:end -->\r\n${suffix}`,
    );
    expect(run(['--check']).stdout).toMatch(/^warning:/u);
    expect(run().stdout).toBe('updated\n');
    expect(await readFile(target, 'utf8')).toBe(
      prefix + printed.stdout.replaceAll('\n', '\r\n') + suffix,
    );
    const before = await readFile(target);
    expect(run(['--check']).stdout).toBe('ready\n');
    expect(run(['--print']).stdout).toBe(printed.stdout);
    expect(await readFile(target)).toStrictEqual(before);
    expect((await readdir(root)).some((name) => name.endsWith('.tmp'))).toBe(false);
  });
});

test.each(['link', 'directory', 'ambiguous', 'invalid-utf8', 'oversized'])(
  'unsafe AGENTS target %s warns read-only and refuses writes',
  async (condition) => {
    await withInstallation(async (root, run) => {
      const target = join(root, 'AGENTS.md');
      if (condition === 'link')
        await symlink(join(root, '.agents', 'skills', 'moldea', 'SKILL.md'), target);
      if (condition === 'directory') await mkdir(target);
      if (condition === 'ambiguous') await writeFile(target, '<!-- moldea:start -->\n');
      if (condition === 'invalid-utf8') await writeFile(target, Buffer.from([0xff]));
      if (condition === 'oversized') await writeFile(target, Buffer.alloc(2_097_153, 0x61));
      const before = await lstat(target);
      expect(run(['--check']).stdout).toMatch(/^warning:/u);
      expect(run().status).toBe(1);
      expect((await lstat(target)).ino).toBe(before.ino);
      expect((await readdir(root)).some((name) => name.endsWith('.tmp'))).toBe(false);
    });
  },
);

test('rendering follows a moved installation and rejects use for another repository', async () => {
  await withInstallation(async (root, run) => {
    const printed = run(['--print']).stdout;
    const moved = join(root, 'renamed');
    await rename(join(root, '.agents'), moved);
    const helper = join(moved, 'skills', 'moldea', 'scripts', 'managed-agents.mjs');
    const render = spawnSync(TEST_NODE_EXECUTABLE, [helper, '--repository', root, '--print'], {
      encoding: 'utf8',
    });
    expect(render.status).toBe(0);
    expect(render.stdout).toBe(
      printed.replaceAll('.agents/skills/moldea', 'renamed/skills/moldea'),
    );
    const nested = join(root, 'other');
    await mkdir(nested);
    const outside = spawnSync(TEST_NODE_EXECUTABLE, [helper, '--repository', nested, '--print'], {
      encoding: 'utf8',
    });
    expect(outside.status).toBe(1);
    expect(outside.stderr).toContain('inside the repository');
  });
});

test.each([
  ['--print', '--check'],
  ['--target', 'other.md'],
  ['--skill-path', 'guess'],
  ['--unknown'],
])('rejects unsupported helper arguments %o', async (...flags) => {
  await withInstallation(async (_root, run) => expect(run(flags).status).toBe(1));
});

test('contained installation links work while unsafe command path text is rejected', async () => {
  await withInstallation(async (root) => {
    const original = join(root, '.agents', 'skills', 'moldea');
    const linked = join(root, 'installed-link');
    await symlink(original, linked, process.platform === 'win32' ? 'junction' : 'dir');
    const result = spawnSync(
      TEST_NODE_EXECUTABLE,
      [join(linked, 'scripts', 'managed-agents.mjs'), '--repository', root, '--print'],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('.agents/skills/moldea');
    const unsafe = join(root, 'unsafe path');
    await rename(original, unsafe);
    const rejected = spawnSync(
      TEST_NODE_EXECUTABLE,
      [join(unsafe, 'scripts', 'managed-agents.mjs'), '--repository', root, '--print'],
      { encoding: 'utf8' },
    );
    expect(rejected.status).toBe(1);
    expect(rejected.stderr).toContain('represented safely');
  });
});

test('the rendered command gates from nested cwd and remains valid after a repository move', async () => {
  await withInstallation(async (root, run) => {
    await mkdir(join(root, 'moldea'));
    await mkdir(join(root, 'nested'));
    await writeFile(join(root, 'moldea', 'project.md'), '# Project\n');
    await writeFile(
      join(root, 'moldea', 'moldea.yaml'),
      'version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/refund.js\n',
    );
    const printed = run(['--print']).stdout;
    expect(run().stdout).toBe('created\n');
    const gatePath = /^node "<repo-root>\/(.+)" --repository "<repo-root>" --path "<file>"/mu.exec(
      printed,
    )?.[1];
    expect(gatePath).toBeDefined();
    for (const cwd of [root, join(root, 'nested')]) {
      const result = spawnSync(
        TEST_NODE_EXECUTABLE,
        [join(root, gatePath!), '--repository', root, '--path', 'src/refund.js'],
        { encoding: 'utf8', cwd },
      );
      expect(result.status).toBe(0);
      expect(result.stdout).toBe('1\n');
    }
    const smoke = spawnSync(
      TEST_NODE_EXECUTABLE,
      [join(root, gatePath!), '--repository', root, '--diagnose', '--path', 'README.md'],
      { encoding: 'utf8' },
    );
    expect(smoke.status).toBe(0);
    expect(smoke.stdout).toBe('0\n');
    const moved = `${root}-moved`;
    await rename(root, moved);
    try {
      const check = spawnSync(
        TEST_NODE_EXECUTABLE,
        [
          join(moved, '.agents', 'skills', 'moldea', 'scripts', 'managed-agents.mjs'),
          '--repository',
          moved,
          '--check',
        ],
        { encoding: 'utf8' },
      );
      expect(check.status).toBe(0);
      expect(check.stdout).toBe('ready\n');
      expect(await readFile(join(moved, 'AGENTS.md'), 'utf8')).toBe(printed);
    } finally {
      await rename(moved, root);
    }
  });
});
