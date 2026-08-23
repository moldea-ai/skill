// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  calculateDirectoryFingerprint,
  collectDirectoryFingerprintEntries,
  ensureDirectory,
} from '../filesystem/index.ts';
import { MOUNTED_SKILL_RELATIVE_PATH } from './constants.ts';
import {
  assertQualificationProjectInputIntegrity,
  inspectWorkspaceAssertions,
} from './assertions.ts';
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
        deterministicEvidence: {
          before: {
            requiredDiagnosticCodes: [],
            forbiddenDiagnosticCodes: [],
            requiredEvidenceKinds: [],
            forbiddenEvidenceKinds: [],
          },
          after: {
            requiredDiagnosticCodes: [],
            forbiddenDiagnosticCodes: [],
            requiredEvidenceKinds: [],
            forbiddenEvidenceKinds: [],
          },
        },
        expectedActorOutcome: 'completed',
        workspace: {
          expectation: 'unchanged',
          mustPreservePaths: [],
          mustChangePaths: [],
          mustExistPaths: [],
          mustNotExistPaths: [],
          allowedChangePaths: [],
          allowedChangePathPatterns: [],
          mustChangePathPatterns: [],
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

  test('accepts one descriptive runtime-guidance path and rejects unrelated changes', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-path-assertions-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const internalDirectory = path.join(workspaceDirectory, '.moldea-qualification');
    const skillDirectory = path.join(workspaceDirectory, MOUNTED_SKILL_RELATIVE_PATH);
    const candidateDirectory = path.join(workspaceDirectory, 'node_modules');
    const manifestPath = path.join(workspaceDirectory, 'moldea', 'moldea.yaml');
    await Promise.all([
      ensureDirectory(internalDirectory),
      ensureDirectory(skillDirectory),
      ensureDirectory(candidateDirectory),
      ensureDirectory(path.dirname(manifestPath)),
    ]);
    await Promise.all([
      writeFile(path.join(internalDirectory, 'task.md'), 'Create the agent.\n', 'utf8'),
      writeFile(path.join(skillDirectory, 'SKILL.md'), '# Skill\n', 'utf8'),
      writeFile(path.join(candidateDirectory, 'candidate.txt'), 'Candidate\n', 'utf8'),
      writeFile(path.join(workspaceDirectory, 'package.json'), '{}\n', 'utf8'),
      writeFile(manifestPath, 'version: 1\n', 'utf8'),
    ]);
    const beforeActorFiles = await collectDirectoryFingerprintEntries(workspaceDirectory, {
      excludedDirectoryNames: new Set(['.git', '.moldea-qualification', 'node_modules']),
      excludedRelativePathPrefixes: [MOUNTED_SKILL_RELATIVE_PATH],
    });
    const project: IPreparedQualificationProject = {
      profileCase: {
        id: 'runtime-path',
        projectDirectory: 'projects/runtime-path',
        scenarioFile: 'scenario.yaml',
      },
      scenario: {
        version: 1,
        id: 'runtime-path',
        title: 'Runtime path',
        purpose: 'Verify descriptive runtime paths.',
        taskFile: 'task.md',
        seedDirectory: 'seed',
        removePaths: [],
        expectedRemovePaths: [],
        inspection: { before: 'valid', after: 'valid' },
        deterministicEvidence: {
          before: {
            requiredDiagnosticCodes: [],
            forbiddenDiagnosticCodes: [],
            requiredEvidenceKinds: [],
            forbiddenEvidenceKinds: [],
          },
          after: {
            requiredDiagnosticCodes: [],
            forbiddenDiagnosticCodes: [],
            requiredEvidenceKinds: [],
            forbiddenEvidenceKinds: [],
          },
        },
        expectedActorOutcome: 'completed',
        workspace: {
          expectation: 'changed',
          mustPreservePaths: ['package.json'],
          mustChangePaths: ['moldea/moldea.yaml'],
          mustExistPaths: [],
          mustNotExistPaths: [],
          allowedChangePaths: ['moldea/moldea.yaml'],
          allowedChangePathPatterns: ['moldea/runtimes/**/*.md'],
          mustChangePathPatterns: ['moldea/runtimes/**/*.md'],
        },
        judgeRequirements: [
          { id: 'runtime-guidance', description: 'Runtime guidance is grounded.' },
        ],
      },
      scenarioDirectory: temporaryRoot,
      workspaceDirectory,
      taskPath: path.join(internalDirectory, 'task.md'),
      baselineCommit: 'fixture',
      beforeActorFiles,
      candidateRuntimeDigest: await calculateDirectoryFingerprint(candidateDirectory),
      internalDigest: await calculateDirectoryFingerprint(internalDirectory),
      skillDigest: await calculateDirectoryFingerprint(skillDirectory),
    };
    const runtimePath = path.join(
      workspaceDirectory,
      'moldea',
      'runtimes',
      'custom-order-triage.md',
    );
    await ensureDirectory(path.dirname(runtimePath));
    await Promise.all([
      writeFile(
        manifestPath,
        'version: 1\nagents:\n  order-triage:\n    runtime:\n      id: custom\n      guidance: /moldea/runtimes/custom-order-triage.md\n',
        'utf8',
      ),
      writeFile(runtimePath, '# Custom order triage\n', 'utf8'),
    ]);
    const changedFiles = ['moldea/moldea.yaml', 'moldea/runtimes/custom-order-triage.md'];
    const actorOutput = {
      outcome: 'completed' as const,
      summary: 'Added descriptive runtime guidance.',
      commands: [],
      changedFiles,
      observations: [],
      unresolved: [],
    };

    expect(await inspectWorkspaceAssertions(project, actorOutput)).toMatchObject({
      passed: true,
      changedPaths: changedFiles,
      failures: [],
    });

    await writeFile(path.join(workspaceDirectory, 'src-unrelated.ts'), 'export {};\n', 'utf8');
    const assertions = await inspectWorkspaceAssertions(project, {
      ...actorOutput,
      changedFiles: [...changedFiles, 'src-unrelated.ts'],
    });

    expect(assertions.passed).toBe(false);
    expect(assertions.failures).toContain(
      'Changes escaped the declared allowlist: src-unrelated.ts.',
    );

    await Promise.all([rm(runtimePath), rm(path.join(workspaceDirectory, 'src-unrelated.ts'))]);
    const missingRuntimeAssertions = await inspectWorkspaceAssertions(project, {
      ...actorOutput,
      changedFiles: ['moldea/moldea.yaml'],
    });

    expect(missingRuntimeAssertions.passed).toBe(false);
    expect(missingRuntimeAssertions.failures).toContain(
      'Required mutation pattern was not observed: moldea/runtimes/**/*.md.',
    );
  });
});
