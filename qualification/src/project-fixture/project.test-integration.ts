// @vitest-environment node
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { DEFAULT_SKILL_REPOSITORY, QUALIFICATION_PROFILES_ROOT } from '../constants/index.ts';
import { calculateSha256, ensureDirectory } from '../filesystem/index.ts';
import { inspectGitRepositoryState, type IGitRepositoryState } from '../repository-state/index.ts';
import {
  applyExpectedDryRunState,
  inspectWorkspaceAssertions,
  prepareQualificationProject,
} from './index.ts';

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

    await applyExpectedDryRunState(project);
    const assertions = await inspectWorkspaceAssertions(project);

    expect(assertions.passed).toBe(true);
    expect(assertions.changedPaths).toStrictEqual([
      'moldea/agents/support/instruction.md',
      'moldea/context/billing.md',
      'moldea/moldea.yaml',
    ]);
  });

  test('mounts only the default portable skill with SKILL.md at its root', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-project-'));
    const attemptDirectory = path.join(temporaryRoot, 'attempt');
    const skillState = await inspectGitRepositoryState(DEFAULT_SKILL_REPOSITORY);
    const project = await prepareQualificationProject({
      attemptDirectory,
      profileCase: {
        id: 'evaluate-aligned-project',
        projectDirectory: 'projects/evaluate-aligned-project',
        scenarioFile: 'scenario.yaml',
      },
      profileDirectory: path.join(QUALIFICATION_PROFILES_ROOT, 'custom', 'custom'),
      skillRepository: DEFAULT_SKILL_REPOSITORY,
      skillState,
    });
    const mountedSkillRoot = path.join(
      project.workspaceDirectory,
      '.moldea-qualification',
      'skill',
    );

    expect(await readFile(path.join(mountedSkillRoot, 'SKILL.md'), 'utf8')).toContain(
      'name: moldea',
    );
    await expect(access(path.join(mountedSkillRoot, 'qualification'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });
});
