// @vitest-environment node
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { DEFAULT_SKILL_REPOSITORY, QUALIFICATION_PROFILES_ROOT } from '../constants/index.ts';
import type { ICandidateClosure } from '../contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  calculateSha256,
  ensureDirectory,
} from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import { inspectGitRepositoryState, type IGitRepositoryState } from '../repository-state/index.ts';
import {
  applyExpectedDryRunState,
  inspectWorkspaceAssertions,
  prepareQualificationProject,
} from './index.ts';

const createCandidateFixture = async (temporaryRoot: string): Promise<ICandidateClosure> => {
  const runtimeDirectory = path.join(temporaryRoot, 'runtime');
  const cliDirectory = path.join(runtimeDirectory, 'node_modules', '@moldea.ai', 'cli');
  await ensureDirectory(cliDirectory);
  await writeFile(
    path.join(cliDirectory, 'package.json'),
    '{"name":"@moldea.ai/cli","version":"3.1.3"}\n',
    'utf8',
  );

  return {
    cliJsonSchemaVersion: 2,
    cliVersion: '3.1.3',
    fingerprint: 'a'.repeat(64),
    packages: [
      {
        name: '@moldea.ai/cli',
        version: '3.1.3',
        registryIntegrity: `sha512-${'a'.repeat(86)}`,
        registryShasum: 'c'.repeat(40),
        registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-3.1.3.tgz',
        tarballPath: path.join(temporaryRoot, 'cli.tgz'),
        tarballName: 'cli.tgz',
        sha256: 'b'.repeat(64),
      },
    ],
    runtimeDirectory,
  };
};

describe('qualification project fixtures', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('applies dirty state, expected changes, and preservation assertions independently', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-project-'));
    const skillRepository = path.join(temporaryRoot, 'skill');
    const candidate = await createCandidateFixture(temporaryRoot);
    await ensureDirectory(skillRepository);
    const skillContent = '# Moldea test skill\n\nUse the project-local Moldea CLI.\n';
    await writeFile(path.join(skillRepository, 'SKILL.md'), skillContent, 'utf8');
    const skillState: IGitRepositoryState = {
      commit: 'fixture',
      fingerprint: calculateSha256(skillContent),
      isDirty: false,
      entries: [
        {
          path: 'SKILL.md',
          kind: 'file',
          mode: 0o100644,
          sha256: calculateSha256(skillContent),
        },
      ],
    };
    const project = await prepareQualificationProject({
      attemptDirectory: path.join(temporaryRoot, 'attempt'),
      candidate,
      profileCase: {
        id: 'maintain-dirty-project',
        projectDirectory: 'projects/maintain-dirty-project',
        scenarioFile: 'scenario.yaml',
      },
      profileDirectory: path.join(QUALIFICATION_PROFILES_ROOT, 'custom', 'custom'),
      skillRepository,
      skillState,
    });

    expect(project.beforeActorFiles.map(({ path: relativePath }) => relativePath)).toContain(
      'notes/local-observation.md',
    );
    expect(project.beforeActorFiles.map(({ path: relativePath }) => relativePath)).toContain(
      '.agents/project-policy.md',
    );

    await applyExpectedDryRunState(project);
    const assertions = await inspectWorkspaceAssertions(project);

    expect(assertions.passed).toBe(true);
    expect(assertions.changedPaths).toStrictEqual([
      'moldea/agents/support/instruction.md',
      'moldea/context/billing.md',
      'moldea/moldea.yaml',
    ]);

    await writeFile(
      path.join(project.workspaceDirectory, '.agents', 'project-policy.md'),
      'modified policy\n',
      'utf8',
    );
    expect((await inspectWorkspaceAssertions(project)).failures).toContain(
      'Required preserved path changed: .agents/project-policy.md.',
    );
  });

  test('mounts only the default portable skill with SKILL.md at its root', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-project-'));
    const attemptDirectory = path.join(temporaryRoot, 'attempt');
    const candidate = await createCandidateFixture(temporaryRoot);
    const skillState = await inspectGitRepositoryState(DEFAULT_SKILL_REPOSITORY);
    const project = await prepareQualificationProject({
      attemptDirectory,
      candidate,
      profileCase: {
        id: 'evaluate-aligned-project',
        projectDirectory: 'projects/evaluate-aligned-project',
        scenarioFile: 'scenario.yaml',
      },
      profileDirectory: path.join(QUALIFICATION_PROFILES_ROOT, 'custom', 'custom'),
      skillRepository: DEFAULT_SKILL_REPOSITORY,
      skillState,
    });
    const mountedSkillRoot = path.join(project.workspaceDirectory, '.agents', 'skills', 'moldea');

    expect(await readFile(path.join(mountedSkillRoot, 'SKILL.md'), 'utf8')).toContain(
      'name: moldea',
    );
    await expect(access(path.join(mountedSkillRoot, 'qualification'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(
      JSON.parse(await readFile(path.join(project.workspaceDirectory, 'package.json'), 'utf8')),
    ).toMatchObject({ devDependencies: { '@moldea.ai/cli': '3.1.3' } });
    expect(
      JSON.parse(
        await readFile(
          path.join(
            project.workspaceDirectory,
            'node_modules',
            '@moldea.ai',
            'cli',
            'package.json',
          ),
          'utf8',
        ),
      ),
    ).toMatchObject({ name: '@moldea.ai/cli', version: '3.1.3' });
    expect(project.candidateRuntimeDigest).toBe(
      await calculateDirectoryFingerprint(path.join(project.workspaceDirectory, 'node_modules')),
    );
    const trackedFiles = (
      await executeProcess({
        command: 'git',
        args: ['ls-files'],
        cwd: project.workspaceDirectory,
      })
    ).stdout.split('\n');

    expect(trackedFiles).not.toContain('node_modules/@moldea.ai/cli/package.json');
    expect(trackedFiles).not.toContain('.agents/skills/moldea/SKILL.md');

    await writeFile(
      path.join(project.workspaceDirectory, 'node_modules', '@moldea.ai', 'cli', 'package.json'),
      '{"name":"@moldea.ai/cli","version":"modified"}\n',
      'utf8',
    );
    expect((await inspectWorkspaceAssertions(project)).failures).toContain(
      'The project-local candidate runtime was modified.',
    );
  });
});
