// @vitest-environment node
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import {
  copyFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { expect, test } from 'vitest';

import { readReleaseIdentity } from '../../release/index.ts';
import { collectProductionPackageRoots } from '../../semantic/workspace/index.ts';

const TEST_NODE_EXECUTABLE = process.env['MOLDEA_TEST_NODE'] ?? process.execPath;
const SOURCE = resolve(import.meta.dirname, '../../../moldea');
const withInstallation = async (
  operation: (root: string, run: (flags?: string[]) => SpawnSyncReturns<string>) => Promise<void>,
): Promise<void> => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'moldea-agents-')));
  try {
    // the writer asks Git how each instruction file is stored, as validation does
    spawnSync('git', ['init', '-q'], { cwd: root });
    const skill = join(root, '.agents', 'skills', 'moldea');
    await mkdir(join(skill, 'scripts'), { recursive: true });
    await mkdir(join(skill, 'assets'));
    await copyFile(
      join(SOURCE, 'assets', 'managed-agents-block.md'),
      join(skill, 'assets', 'managed-agents-block.md'),
    );
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

const prepareValidation = async (root: string): Promise<() => unknown> => {
  const packageRoot = resolve(SOURCE, '../node_modules');
  const { cliVersion } = readReleaseIdentity(resolve(SOURCE, '..'));
  for (const source of collectProductionPackageRoots(join(packageRoot, '@moldea.ai/cli')))
    await cp(source, join(root, 'node_modules', relative(packageRoot, source)), {
      recursive: true,
      filter: (path) =>
        !relative(source, path)
          .split(/[\\/]/u)
          .some((part) =>
            ['node_modules', '_archive', '_archives', '_backup', '_backups'].includes(part),
          ),
    });
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ devDependencies: { '@moldea.ai/cli': cliVersion } }),
  );
  await writeFile(join(root, '.gitignore'), '/node_modules/\n');
  await mkdir(join(root, 'moldea'));
  await writeFile(join(root, 'moldea/project.md'), '# Project\n');
  await writeFile(join(root, 'moldea/moldea.yaml'), 'version: 1\n');
  return () => {
    const result = spawnSync(
      TEST_NODE_EXECUTABLE,
      [
        join(root, '.agents/skills/moldea/scripts/moldea-cli.mjs'),
        '--repository',
        root,
        '--',
        'validate',
        '--json',
        '--max-output-bytes',
        '65536',
      ],
      { encoding: 'utf8', timeout: 30_000 },
    );
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr + result.stdout).toBe(0);
    expect(result.stderr).toBe('');
    const envelope: unknown = JSON.parse(result.stdout);
    expect(envelope).toMatchObject({
      cliVersion,
      schemaVersion: 7,
      command: 'validate',
      error: null,
      status: 'valid',
      result: { valid: true, errorCount: 0 },
    });
    return envelope;
  };
};

test('fresh rendered integration validates against the installed template without a warning', async () => {
  await withInstallation(async (root, run) => {
    const validate = await prepareValidation(root);
    const printed = run(['--print']);
    expect(printed.status).toBe(0);
    await expect(lstat(join(root, 'AGENTS.md'))).rejects.toThrow();
    expect(run().stdout).toBe('created\n');
    expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toBe(printed.stdout);
    expect(validate()).toMatchObject({ result: { warningCount: 0 } });
  });
});

test('upgraded templates preserve the old bridge until an exact idempotent refresh', async () => {
  await withInstallation(async (root, run) => {
    const validate = await prepareValidation(root);
    // the frozen 10.0.1 bridge is independent of the new template and generator.
    const oldBlock =
      '<!-- moldea:start -->\n\nWhen installed in this repository, moldea provides project context. Explicit moldea operations, planning, creating, reviewing, or changing agents or skills, changes to what an in-app model decides or says (including inline calls), and project-context work use only the exact <repo-root>/.agents/skills/moldea/SKILL.md. If it is missing, continue without moldea and without searching for another copy, installing, or initializing; for an explicit moldea operation, report the unavailable installation. Otherwise, first read it unless its complete unchanged instructions are available, then follow its routing before repository checks. For other repository planning, implementation, or review, once you know the involved files, check only the exact files <repo-root>/.agents/skills/moldea/SKILL.md and <repo-root>/.agents/skills/moldea/scripts/relevance-gate.mjs. If either is missing, skip this section silently without searching for another copy, installing, or initializing moldea. Otherwise, before editing or giving conclusions, run:\n\nnode "<repo-root>/.agents/skills/moldea/scripts/relevance-gate.mjs" --repository "<repo-root>" --path "<file>" [--path "<file>" ...]\n\n<repo-root> is the absolute repository root. Pass file paths relative to that root, even from a subdirectory. Use only already-known paths; do not scan or run Git for this. With no known paths, skip this precheck.\n\n- Output 1: read <repo-root>/.agents/skills/moldea/SKILL.md unless its complete unchanged instructions are already available; retain the checked paths and result.\n- Output 0 or an error: continue without moldea and do not mention it.\n\nIf the task involves new files later, check only that new batch once before acting. Reuse unchanged results.\n<!-- moldea:end -->\n';
    const target = join(root, 'AGENTS.md');
    const prefix = '\uFEFF# Host instructions\r\n\r\n';
    const suffix = '\r\nKeep these rules.\r\n';
    await writeFile(target, prefix + oldBlock.replaceAll('\n', '\r\n') + suffix);
    const before = await readFile(target);
    const installedAsset = join(root, '.agents/skills/moldea/assets/managed-agents-block.md');
    await copyFile(join(SOURCE, 'assets/managed-agents-block.md'), installedAsset);
    expect(await readFile(target)).toStrictEqual(before);
    const stale = validate();
    expect(stale).toMatchObject({ result: { warningCount: 1 } });
    expect(stale).toHaveProperty(
      'result.page.records',
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'diagnostic',
          code: 'MOLDEA_INTEGRATION_BLOCK_STALE',
          subject: '/AGENTS.md',
        }),
      ]),
    );
    const printed = run(['--print']);
    expect(printed.status).toBe(0);
    expect(await readFile(target)).toStrictEqual(before);
    expect(run().stdout).toBe('updated\n');
    const refreshed = await readFile(target);
    expect(refreshed.toString('utf8')).toBe(
      prefix + printed.stdout.replaceAll('\n', '\r\n') + suffix,
    );
    expect(validate()).toMatchObject({ result: { warningCount: 0 } });
    expect(run().stdout).toBe('unchanged\n');
    expect(await readFile(target)).toStrictEqual(refreshed);
  });
});

test('ignored local integration retains its working-tree diagnostic and ignore state', async () => {
  await withInstallation(async (root, run) => {
    const validate = await prepareValidation(root);
    const ignore = '/node_modules/\n/AGENTS.md\n';
    await writeFile(join(root, '.gitignore'), ignore);
    expect(run().stdout).toBe('created\n');
    const before = await readFile(join(root, 'AGENTS.md'));
    expect(validate()).toMatchObject({ result: { warningCount: 0 } });
    expect(await readFile(join(root, 'AGENTS.md'))).toStrictEqual(before);
    expect(await readFile(join(root, '.gitignore'), 'utf8')).toBe(ignore);
    const tracked = spawnSync('git', ['ls-files', '--', 'AGENTS.md'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10_000,
    });
    expect(tracked.status).toBe(0);
    expect(tracked.stdout).toBe('');
    const ignored = spawnSync('git', ['check-ignore', '--', 'AGENTS.md'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10_000,
    });
    expect(ignored.status).toBe(0);
    expect(ignored.stdout).toBe('AGENTS.md\n');
  });
});

test.each([
  ['/.claude/CLAUDE.md', '@../AGENTS.md\n'],
  ['/CLAUDE.local.md', '@AGENTS.md\n'],
] as const)(
  'validation selects %s without a root Claude file and the exact import clears its warning',
  async (subject, importLine) => {
    await withInstallation(async (root, run) => {
      const validate = await prepareValidation(root);
      expect(run().stdout).toBe('created\n');
      if (subject === '/.claude/CLAUDE.md') {
        await mkdir(join(root, '.claude'));
        // the local fallback must not override the present shared nested file.
        await writeFile(join(root, 'CLAUDE.local.md'), '# Local fallback\n');
      }
      const target = join(root, subject.slice(1));
      await writeFile(target, '# Claude instructions\n');
      await expect(lstat(join(root, 'CLAUDE.md'))).rejects.toThrow();
      const missingImport = validate();
      expect(missingImport).toMatchObject({ result: { warningCount: 1 } });
      expect(missingImport).toHaveProperty(
        'result.page.records',
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'diagnostic',
            code: 'MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING',
            subject,
          }),
        ]),
      );
      const printed = run(['--claude', subject, '--print']);
      expect(printed.status).toBe(0);
      expect(printed.stdout).toBe(importLine);
      expect(await readFile(target, 'utf8')).toBe('# Claude instructions\n');
      expect(run(['--claude', subject]).stdout).toBe('updated\n');
      expect(await readFile(target, 'utf8')).toBe('# Claude instructions\n' + importLine);
      expect(validate()).toMatchObject({ result: { warningCount: 0 } });
      expect(run(['--claude', subject]).stdout).toBe('unchanged\n');
      if (subject === '/.claude/CLAUDE.md')
        expect(await readFile(join(root, 'CLAUDE.local.md'), 'utf8')).toBe('# Local fallback\n');
      await expect(lstat(join(root, 'CLAUDE.md'))).rejects.toThrow();
    });
  },
);

test('print and write agree and preserve unrelated instruction bytes', async () => {
  await withInstallation(async (root, run) => {
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
    expect(run().stdout).toBe('unchanged\n');
    const prefix = '\uFEFF# Host instructions\r\n\r\n';
    const suffix = '\r\nKeep these rules.\r\n';
    await writeFile(
      target,
      `${prefix}<!-- moldea:start -->\r\nOld\r\n<!-- moldea:end -->\r\n${suffix}`,
    );
    expect(run().stdout).toBe('updated\n');
    expect(await readFile(target, 'utf8')).toBe(
      prefix + printed.stdout.replaceAll('\n', '\r\n') + suffix,
    );
    const before = await readFile(target);
    expect(run(['--print']).stdout).toBe(printed.stdout);
    expect(await readFile(target)).toStrictEqual(before);
    expect((await readdir(root)).some((name) => name.endsWith('.tmp'))).toBe(false);
  });
});

test.each(['append', 'replace'])(
  'bundled AGENTS writer preserves CRLF and outside bytes during %s and remains unchanged on repeat',
  async (operation) => {
    await withInstallation(async (root, run) => {
      const block = run(['--print']).stdout.replaceAll('\n', '\r\n');
      const prefix = '\uFEFF# Host rules\r\n';
      const suffix = '\r\nKeep these rules.\r\n';
      const target = join(root, 'AGENTS.md');
      await writeFile(
        target,
        operation === 'append'
          ? prefix
          : `${prefix}\r\n<!-- moldea:start -->\r\nStale\r\n<!-- moldea:end -->\r\n${suffix}`,
      );
      const updated = run();
      expect({
        status: updated.status,
        stdout: updated.stdout,
        stderr: updated.stderr,
      }).toStrictEqual({ status: 0, stdout: 'updated\n', stderr: '' });
      const expected = Buffer.from(
        prefix + '\r\n' + block + (operation === 'replace' ? suffix : ''),
      );
      expect(await readFile(target)).toStrictEqual(expected);
      const repeated = run();
      expect({
        status: repeated.status,
        stdout: repeated.stdout,
        stderr: repeated.stderr,
      }).toStrictEqual({ status: 0, stdout: 'unchanged\n', stderr: '' });
      expect(await readFile(target)).toStrictEqual(expected);
    });
  },
);

test.each(['link', 'directory', 'ambiguous', 'invalid-utf8', 'oversized'])(
  'unsafe AGENTS target %s refuses writes',
  async (condition) => {
    await withInstallation(async (root, run) => {
      const target = join(root, 'AGENTS.md');
      if (condition === 'link')
        await symlink('missing.md', target, process.platform === 'win32' ? 'file' : undefined);
      if (condition === 'directory') await mkdir(target);
      if (condition === 'ambiguous') await writeFile(target, '<!-- moldea:start -->\n');
      if (condition === 'invalid-utf8') await writeFile(target, Buffer.from([0xff]));
      if (condition === 'oversized') await writeFile(target, Buffer.alloc(2_097_153, 0x61));
      const before = await lstat(target);
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

test.each(['SKILL.md', 'scripts/relevance-gate.mjs'])(
  'rendering refuses an installation missing %s without writing instructions',
  async (missingFile) => {
    await withInstallation(async (root, run) => {
      await rm(join(root, '.agents', 'skills', 'moldea', missingFile));
      const result = run(['--print']);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain('ENOENT');
      expect(result.stderr).toContain(join(root, '.agents', 'skills', 'moldea', missingFile));
      await expect(lstat(join(root, 'AGENTS.md'))).rejects.toThrow();
    });
  },
);

test.each([['--target', 'other.md'], ['--skill-path', 'guess'], ['--unknown']])(
  'rejects unsupported helper arguments %o',
  async (...flags) => {
    await withInstallation(async (_root, run) => expect(run(flags).status).toBe(1));
  },
);

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
      const render = spawnSync(
        TEST_NODE_EXECUTABLE,
        [
          join(moved, '.agents', 'skills', 'moldea', 'scripts', 'managed-agents.mjs'),
          '--repository',
          moved,
          '--print',
        ],
        { encoding: 'utf8' },
      );
      expect(render.status).toBe(0);
      expect(render.stdout).toBe(printed);
      expect(await readFile(join(moved, 'AGENTS.md'), 'utf8')).toBe(printed);
    } finally {
      await rename(moved, root);
    }
  });
});

test('bundled helpers handle long paths within native process limits', async () => {
  await withInstallation(async (root) => {
    const packageRoot = resolve(SOURCE, '../node_modules');
    const { cliVersion } = readReleaseIdentity(resolve(SOURCE, '..'));
    for (const source of collectProductionPackageRoots(join(packageRoot, '@moldea.ai/cli'))) {
      await cp(source, join(root, 'node_modules', relative(packageRoot, source)), {
        recursive: true,
        filter: (path) =>
          !relative(source, path)
            .split(/[\\/]/u)
            .some((part) =>
              ['node_modules', '_archive', '_archives', '_backup', '_backups'].includes(part),
            ),
      });
    }
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ devDependencies: { '@moldea.ai/cli': cliVersion } }),
    );
    await writeFile(join(root, '.gitignore'), '/node_modules/\n');
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src/refund.js'), 'export const refund = true;\n');
    await mkdir(join(root, 'moldea'));
    await writeFile(join(root, 'moldea/project.md'), '# Project\n');
    await writeFile(
      join(root, 'moldea/moldea.yaml'),
      'version: 1\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/refund.js\n',
    );
    const git = (...args: string[]) => {
      const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 10_000 });
      expect(result.status, result.stderr).toBe(0);
    };
    git('init', '--quiet');
    git('config', 'core.longpaths', 'true');
    git(
      'add',
      '--',
      'moldea/project.md',
      'moldea/moldea.yaml',
      'package.json',
      '.gitignore',
      'src/refund.js',
    );
    git(
      '-c',
      'commit.gpgsign=false',
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.com',
      'commit',
      '--quiet',
      '-m',
      'Long-path fixture',
    );
    const parent = await mkdtemp(join(tmpdir(), 'moldea-long-'));
    const deep = join(
      parent,
      ...Array.from({ length: 6 }, (_, index) => `nested-${index}-` + 'directory-'.repeat(3)),
      'repository',
    );
    let isMoved = false;
    try {
      await mkdir(join(deep, '..'), { recursive: true });
      await rename(root, deep);
      isMoved = true;
      expect(deep.length).toBeGreaterThan(260);
      const run = (name: string, flags: string[] = []) =>
        spawnSync(
          TEST_NODE_EXECUTABLE,
          [join(deep, '.agents/skills/moldea/scripts', name), '--repository', deep, ...flags],
          { encoding: 'utf8', timeout: 30_000 },
        );
      expect(run('managed-agents.mjs').stdout).toBe('created\n');
      expect(run('managed-readme.mjs').stdout).toBe('created\n');
      expect(run('relevance-gate.mjs', ['--path', 'src/refund.js']).stdout).toBe('1\n');
      const inspection = run('initialization-inspection.mjs');
      expect(inspection.status, inspection.stderr).toBe(0);
      expect(JSON.parse(inspection.stdout)).toMatchObject({
        status: 'complete',
        mode: 'inventory',
      });
      const repair = run('repair-git.mjs', ['--', 'checkpoint']);
      if (process.platform === 'win32') {
        expect(repair.status, repair.stdout + repair.stderr).toBe(1);
        expect(JSON.parse(repair.stdout)).toMatchObject({
          status: 'unavailable',
          reasonCode: 'git-read',
          reason:
            "The repository path exceeds Windows' 260-character working-directory limit for Git; move or clone it to a shorter path.",
        });
      } else {
        expect(repair.status, repair.stdout + repair.stderr).toBe(0);
        expect(JSON.parse(repair.stdout)).toMatchObject({ status: 'available' });
      }
      for (const command of ['validate', 'inspect']) {
        const cli = run('moldea-cli.mjs', ['--', command, '--json', '--max-output-bytes', '65536']);
        if (process.platform === 'win32') {
          expect(cli.status, cli.stdout + cli.stderr).toBe(1);
          expect(cli.stdout).toBe('');
          expect(cli.stderr).toContain('Error: read ENOTCONN');
          expect(cli.stderr).toContain('at ChildProcess.spawn');
        } else {
          expect(cli.status, cli.stdout + cli.stderr).toBe(0);
          expect(JSON.parse(cli.stdout)).toMatchObject({ command, status: 'valid' });
        }
      }
    } finally {
      if (isMoved) await rename(deep, root);
      await rm(parent, { recursive: true, force: true });
    }
  });
});

const createOutsideDirectory = async (): Promise<string> =>
  realpath(await mkdtemp(join(tmpdir(), 'moldea-agents-outside-')));
const fileLinkType = process.platform === 'win32' ? 'file' : undefined;

test('bundled writer updates an inside AGENTS.md link target and keeps the link', async () => {
  await withInstallation(async (root, run) => {
    const block = run(['--print']).stdout;
    await mkdir(join(root, 'docs'));
    await writeFile(join(root, 'docs', 'AGENTS.md'), '# Shared rules\n');
    await symlink(join('docs', 'AGENTS.md'), join(root, 'AGENTS.md'), fileLinkType);

    expect(run().stdout).toBe('updated\n');
    expect((await lstat(join(root, 'AGENTS.md'))).isSymbolicLink()).toBe(true);
    expect(await readFile(join(root, 'AGENTS.md'), 'utf8')).toBe(`# Shared rules\n\n${block}`);
    expect(await readFile(join(root, 'docs', 'AGENTS.md'), 'utf8')).toBe(
      `# Shared rules\n\n${block}`,
    );
    expect(run().stdout).toBe('unchanged\n');
    expect((await readdir(join(root, 'docs'))).some((name) => name.endsWith('.tmp'))).toBe(false);
  });
});

test.each(['outside', 'broken', 'loop'])(
  'bundled writer refuses a %s AGENTS.md link and changes nothing',
  async (condition) => {
    const outside = await createOutsideDirectory();
    try {
      await withInstallation(async (root, run) => {
        await writeFile(join(outside, 'AGENTS.md'), '# Outside rules\n');
        if (condition === 'outside')
          await symlink(join(outside, 'AGENTS.md'), join(root, 'AGENTS.md'), fileLinkType);
        if (condition === 'broken')
          await symlink('missing.md', join(root, 'AGENTS.md'), fileLinkType);
        if (condition === 'loop') {
          await symlink('loop.md', join(root, 'AGENTS.md'), fileLinkType);
          await symlink('AGENTS.md', join(root, 'loop.md'), fileLinkType);
        }

        const refused = run();
        expect(refused.status).toBe(1);
        expect(refused.stdout).toBe('');
        expect(refused.stderr).toMatch(/^managed AGENTS update failed: AGENTS\.md (?:links|is)/u);
        expect(await readFile(join(outside, 'AGENTS.md'), 'utf8')).toBe('# Outside rules\n');
        expect((await lstat(join(root, 'AGENTS.md'))).isSymbolicLink()).toBe(true);
      });
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  },
);

test('bundled writer refuses .. after a directory link and writes neither candidate', async () => {
  for (const isOutside of [false, true]) {
    const outside = await createOutsideDirectory();
    try {
      await withInstallation(async (root, run) => {
        const nested = isOutside ? join(outside, 'nested') : join(root, 'deep', 'nested');
        await mkdir(nested, { recursive: true });
        await writeFile(join(nested, '..', 'shared.md'), '# Physical\n');
        await writeFile(join(root, 'shared.md'), '# Lexical\n');
        await symlink(
          nested,
          join(root, 'dir-link'),
          process.platform === 'win32' ? 'junction' : 'dir',
        );
        // join would collapse the `..`; the link must keep it after the folder
        await symlink(
          ['dir-link', '..', 'shared.md'].join(sep),
          join(root, 'AGENTS.md'),
          fileLinkType,
        );
        const result = run();

        expect(result.status).toBe(1);
        expect(result.stderr).toContain("AGENTS.md doesn't link straight to a file");
        expect(await readFile(join(nested, '..', 'shared.md'), 'utf8')).toBe('# Physical\n');
        expect(await readFile(join(root, 'shared.md'), 'utf8')).toBe('# Lexical\n');
      });
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  }
});

test('bundled Claude import prints, appends once, keeps CRLF, and never creates a file', async () => {
  await withInstallation(async (root, run) => {
    expect(run(['--claude', '/CLAUDE.md', '--print']).stdout).toBe('@AGENTS.md\n');
    expect(run(['--claude', '/CLAUDE.local.md', '--print']).stdout).toBe('@AGENTS.md\n');
    expect(run(['--claude', '/.claude/CLAUDE.md', '--print']).stdout).toBe('@../AGENTS.md\n');
    const missing = run(['--claude', '/CLAUDE.md']);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toBe(
      'Claude import update failed: CLAUDE.md does not exist, and Claude instruction files are never created\n',
    );
    await expect(lstat(join(root, 'CLAUDE.md'))).rejects.toThrow();
    await expect(lstat(join(root, '.claude'))).rejects.toThrow();

    await writeFile(join(root, 'CLAUDE.md'), '# Claude\r\nKeep these rules.\r\n');
    expect(run(['--claude', '/CLAUDE.md']).stdout).toBe('updated\n');
    expect(run(['--claude', '/CLAUDE.md']).stdout).toBe('unchanged\n');
    expect(await readFile(join(root, 'CLAUDE.md'), 'utf8')).toBe(
      '# Claude\r\nKeep these rules.\r\n@AGENTS.md\r\n',
    );

    await mkdir(join(root, '.claude'));
    await writeFile(join(root, '.claude', 'CLAUDE.md'), '# Nested\n');
    expect(run(['--claude', '/.claude/CLAUDE.md']).stdout).toBe('updated\n');
    expect(await readFile(join(root, '.claude', 'CLAUDE.md'), 'utf8')).toBe(
      '# Nested\n@../AGENTS.md\n',
    );
    await expect(lstat(join(root, 'AGENTS.md'))).rejects.toThrow();
  });
});

test.each([
  ['--claude'],
  ['--claude', 'CLAUDE.md'],
  ['--claude', '/README.md'],
  ['--claude', '/CLAUDE.md', '--print', '--print'],
  ['--print', '--claude', '/CLAUDE.md'],
])('rejects unsupported Claude import arguments %o', async (...flags) => {
  await withInstallation(async (root, run) => {
    const result = run(flags);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Usage: managed-agents.mjs');
    expect((await readdir(root)).sort()).toStrictEqual(['.agents', '.git']);
  });
});
