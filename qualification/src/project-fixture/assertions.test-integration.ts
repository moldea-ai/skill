// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { calculateDirectoryFingerprint, ensureDirectory } from '../filesystem/index.ts';
import { MOUNTED_SKILL_RELATIVE_PATH } from './constants.ts';
import { assertQualificationProjectInputIntegrity } from './assertions.ts';
import type { IPreparedQualificationProject } from './types.ts';

describe('qualification project input integrity', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('rejects actor mutations to the mounted skill and runner-owned task before caching', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-project-integrity-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const internalDirectory = path.join(workspaceDirectory, '.moldea-qualification');
    const skillDirectory = path.join(workspaceDirectory, MOUNTED_SKILL_RELATIVE_PATH);
    const candidateDirectory = path.join(workspaceDirectory, 'node_modules');
    await Promise.all([
      ensureDirectory(internalDirectory),
      ensureDirectory(skillDirectory),
      ensureDirectory(candidateDirectory),
    ]);
    const taskPath = path.join(internalDirectory, 'task.md');
    const skillPath = path.join(skillDirectory, 'SKILL.md');
    await Promise.all([
      writeFile(taskPath, 'Original task\n', 'utf8'),
      writeFile(skillPath, '# Original skill\n', 'utf8'),
      writeFile(path.join(candidateDirectory, 'candidate.txt'), 'Candidate runtime\n', 'utf8'),
    ]);
    const project: IPreparedQualificationProject = {
      profileCase: {
        id: 'input-integrity',
        projectDirectory: 'projects/input-integrity',
        scenarioFile: 'scenario.yaml',
      },
      scenario: {
        version: 1,
        id: 'input-integrity',
        title: 'Input integrity',
        purpose: 'Verify runner-owned project inputs.',
        taskFile: 'task.md',
        seedDirectory: 'seed',
        removePaths: [],
        expectedRemovePaths: [],
        inspection: { before: 'valid', after: 'valid' },
        workspace: {
          expectation: 'unchanged',
          mustPreservePaths: [],
          mustChangePaths: [],
          mustExistPaths: [],
          mustNotExistPaths: [],
        },
        judgeRequirements: [
          { id: 'preserve-inputs', description: 'Runner-owned inputs remain unchanged.' },
        ],
      },
      scenarioDirectory: temporaryRoot,
      workspaceDirectory,
      taskPath,
      baselineCommit: 'fixture',
      beforeActorFiles: [],
      candidateRuntimeDigest: await calculateDirectoryFingerprint(candidateDirectory),
      internalDigest: await calculateDirectoryFingerprint(internalDirectory),
      skillDigest: await calculateDirectoryFingerprint(skillDirectory),
    };

    await writeFile(skillPath, '# Mutated skill\n', 'utf8');
    await expect(assertQualificationProjectInputIntegrity(project)).rejects.toThrow(
      'The installed candidate skill was modified after preparation.',
    );

    await writeFile(skillPath, '# Original skill\n', 'utf8');
    await writeFile(taskPath, 'Mutated task\n', 'utf8');
    await expect(assertQualificationProjectInputIntegrity(project)).rejects.toThrow(
      'The mounted qualification task was modified after preparation.',
    );
  });
});
