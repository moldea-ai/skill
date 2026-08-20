// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { ensureDirectory } from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import { inspectGitRepositoryState } from './inspector.ts';

describe('Git repository state inspection', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('scopes entries and dirty state to the selected repository directory', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-repository-state-'));
    const skillDirectory = path.join(temporaryRoot, 'moldea');
    const skillPath = path.join(skillDirectory, 'SKILL.md');
    const outsidePath = path.join(temporaryRoot, 'README.md');
    await ensureDirectory(skillDirectory);
    await Promise.all([
      writeFile(skillPath, '# Skill\n', 'utf8'),
      writeFile(outsidePath, '# Repository\n', 'utf8'),
    ]);
    await executeProcess({
      command: 'git',
      args: ['init', '--initial-branch=main'],
      cwd: temporaryRoot,
    });
    await executeProcess({ command: 'git', args: ['add', '-A'], cwd: temporaryRoot });
    await executeProcess({
      command: 'git',
      args: [
        '-c',
        'user.name=Moldea Qualification',
        '-c',
        'user.email=qualification@moldea.local',
        'commit',
        '-m',
        'test: establish repository fixture',
      ],
      cwd: temporaryRoot,
    });

    await writeFile(outsidePath, '# Changed repository\n', 'utf8');
    expect(await inspectGitRepositoryState(skillDirectory)).toMatchObject({
      isDirty: false,
      entries: [{ path: 'SKILL.md' }],
    });

    await writeFile(skillPath, '# Changed skill\n', 'utf8');
    expect(await inspectGitRepositoryState(skillDirectory)).toMatchObject({ isDirty: true });
  });
});
