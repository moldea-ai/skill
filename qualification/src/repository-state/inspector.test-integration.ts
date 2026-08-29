// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES } from '../constants/index.ts';
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
    expect(
      await inspectGitRepositoryState(temporaryRoot, {
        includedRelativePathPrefixes: ['moldea'],
      }),
    ).toMatchObject({
      isDirty: false,
      entries: [{ path: 'moldea/SKILL.md' }],
    });

    await writeFile(skillPath, '# Changed skill\n', 'utf8');
    expect(await inspectGitRepositoryState(skillDirectory)).toMatchObject({ isDirty: true });
    expect(
      await inspectGitRepositoryState(temporaryRoot, {
        includedRelativePathPrefixes: ['moldea'],
      }),
    ).toMatchObject({ isDirty: true });
  });

  test('tracks root manifests as qualification engine source', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-source-state-'));
    const packageManifestPath = path.join(temporaryRoot, 'package.json');
    const packageLockPath = path.join(temporaryRoot, 'package-lock.json');
    const qualificationSourcePath = path.join(temporaryRoot, 'qualification/src/executor.ts');
    const unrelatedPath = path.join(temporaryRoot, 'README.md');
    await ensureDirectory(path.dirname(qualificationSourcePath));
    await Promise.all([
      writeFile(packageManifestPath, '{"devDependencies":{"semver":"7.8.5"}}\n', 'utf8'),
      writeFile(packageLockPath, '{"lockfileVersion":3}\n', 'utf8'),
      writeFile(qualificationSourcePath, 'export const executorVersion = 1;\n', 'utf8'),
      writeFile(unrelatedPath, '# Repository\n', 'utf8'),
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
        'test: establish qualification source fixture',
      ],
      cwd: temporaryRoot,
    });

    await writeFile(unrelatedPath, '# Changed repository\n', 'utf8');
    const cleanQualificationState = await inspectGitRepositoryState(temporaryRoot, {
      includedRelativePathPrefixes: QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES,
    });
    expect(cleanQualificationState).toMatchObject({
      isDirty: false,
      entries: [
        { path: 'package-lock.json' },
        { path: 'package.json' },
        { path: 'qualification/src/executor.ts' },
      ],
    });

    await writeFile(packageManifestPath, '{"devDependencies":{"semver":"7.9.0"}}\n', 'utf8');
    expect(
      await inspectGitRepositoryState(temporaryRoot, {
        includedRelativePathPrefixes: QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES,
      }),
    ).toMatchObject({ isDirty: true });
  });
});
