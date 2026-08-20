// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { FakeCodexHost } from '../codex-host/index.ts';
import type {
  ICandidateClosure,
  IDeterministicVerification,
  IJudgeOutput,
  IQualificationCaseScenario,
  IWorkspaceAssertionResult,
} from '../contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  ensureDirectory,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import type { IPreparedQualificationProject } from '../project-fixture/index.ts';
import {
  executeActorModelStage,
  executeJudgeModelStage,
  restoreJudgeModelStage,
} from './model-stages.ts';

const scenario = {
  version: 1,
  id: 'test-case',
  title: 'Test case',
  purpose: 'Exercise model-stage judge validation.',
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
  judgeRequirements: [{ id: 'required-check', description: 'The required check passes.' }],
} satisfies IQualificationCaseScenario;

const incompleteJudgeOutput: IJudgeOutput = {
  verdict: 'pass',
  summary: 'The incomplete decision claims to pass.',
  requirements: [],
  failures: [],
};

const deterministicAfter: IDeterministicVerification = {
  passed: true,
  inspectionStatus: 'valid',
  repositoryFilesystemValid: true,
  memoryRepositoryEquivalent: true,
  coreValid: true,
  cliCompatibilityValid: true,
  cliValidateStatus: 'valid',
  cliInspectStatus: 'valid',
  typecheckPassed: true,
  repositoryUnchanged: true,
  failures: [],
  durationMs: 0,
};

const workspaceAssertions: IWorkspaceAssertionResult = {
  passed: true,
  failures: [],
  before: [],
  after: [],
  changedPaths: [],
};

describe('qualification model stages', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('rejects incomplete judge requirements from fresh and restored evidence', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-model-stage-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const caseArtifactDirectory = path.join(temporaryRoot, 'artifacts');
    const runtimeDirectory = path.join(temporaryRoot, 'runtime');
    await Promise.all([
      ensureDirectory(workspaceDirectory),
      ensureDirectory(caseArtifactDirectory),
      ensureDirectory(runtimeDirectory),
    ]);
    await writeFile(path.join(workspaceDirectory, 'package.json'), '{}\n', 'utf8');
    const project: IPreparedQualificationProject = {
      profileCase: {
        id: scenario.id,
        projectDirectory: 'projects/test-case',
        scenarioFile: 'scenario.yaml',
      },
      scenario,
      scenarioDirectory: temporaryRoot,
      workspaceDirectory,
      taskPath: path.join(temporaryRoot, 'task.md'),
      baselineCommit: 'fixture',
      beforeActorFiles: [],
      candidateRuntimeDigest: '0'.repeat(64),
      internalDigest: 'a'.repeat(64),
      skillDigest: 'b'.repeat(64),
    };
    const candidate: ICandidateClosure = {
      fingerprint: 'c'.repeat(64),
      packages: [],
      runtimeDirectory,
    };
    const host = new FakeCodexHost({
      judge: async () =>
        Promise.resolve({
          output: incompleteJudgeOutput,
          usage: null,
          durationMs: 0,
          events: '',
        }),
    });

    await expect(
      executeJudgeModelStage({
        actorOutput: {
          outcome: 'completed',
          summary: 'Completed the task.',
          commands: [],
          changedFiles: [],
          observations: [],
          unresolved: [],
        },
        adapterId: 'custom',
        attemptId: 'attempt',
        candidate,
        caseArtifactDirectory,
        codexVersion: 'codex-cli test',
        deterministicAfter,
        host,
        implementationId: 'custom',
        isDryRun: true,
        packagesRepository: '/packages',
        profileDigest: 'd'.repeat(64),
        qualificationDigest: 'e'.repeat(64),
        project,
        skillDigest: 'f'.repeat(64),
        skillRepository: '/skill',
        task: 'Complete the test task.',
        useCache: false,
        workspaceAssertions,
      }),
    ).rejects.toThrow('missing declared requirement ids: required-check');

    await Promise.all([
      writeJsonFileAtomically(
        path.join(caseArtifactDirectory, 'judge-output.json'),
        incompleteJudgeOutput,
      ),
      writeJsonFileAtomically(path.join(caseArtifactDirectory, 'judge-evidence.json'), {
        role: 'judge',
        createdAt: '2026-08-20T00:00:00.000Z',
        durationMs: 0,
        usage: null,
        cacheKey: '0'.repeat(64),
        sourceAttemptId: 'attempt',
        cacheSourceAttemptId: null,
      }),
    ]);

    await expect(restoreJudgeModelStage({ caseArtifactDirectory, scenario })).rejects.toThrow(
      'missing declared requirement ids: required-check',
    );
  });

  test('rejects actor changes to the project-local candidate before accepting evidence', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-model-stage-'));
    const workspaceDirectory = path.join(temporaryRoot, 'workspace');
    const caseArtifactDirectory = path.join(temporaryRoot, 'artifacts');
    const runtimeDirectory = path.join(temporaryRoot, 'runtime');
    const candidateFile = path.join(workspaceDirectory, 'node_modules', 'candidate', 'index.js');
    await Promise.all([
      ensureDirectory(path.dirname(candidateFile)),
      ensureDirectory(caseArtifactDirectory),
      ensureDirectory(runtimeDirectory),
    ]);
    await writeFile(path.join(workspaceDirectory, 'package.json'), '{}\n', 'utf8');
    await writeFile(candidateFile, 'export const candidate = true;\n', 'utf8');
    const project: IPreparedQualificationProject = {
      profileCase: {
        id: scenario.id,
        projectDirectory: 'projects/test-case',
        scenarioFile: 'scenario.yaml',
      },
      scenario,
      scenarioDirectory: temporaryRoot,
      workspaceDirectory,
      taskPath: path.join(temporaryRoot, 'task.md'),
      baselineCommit: 'fixture',
      beforeActorFiles: [],
      candidateRuntimeDigest: await calculateDirectoryFingerprint(
        path.join(workspaceDirectory, 'node_modules'),
      ),
      internalDigest: 'a'.repeat(64),
      skillDigest: 'b'.repeat(64),
    };
    const candidate: ICandidateClosure = {
      fingerprint: 'c'.repeat(64),
      packages: [],
      runtimeDirectory,
    };
    const host = new FakeCodexHost({
      actor: async () => {
        await writeFile(candidateFile, 'export const candidate = false;\n', 'utf8');
        return {
          output: {
            outcome: 'completed',
            summary: 'Changed the candidate runtime.',
            commands: [],
            changedFiles: [],
            observations: [],
            unresolved: [],
          },
          usage: null,
          durationMs: 0,
          events: '',
        };
      },
    });

    await expect(
      executeActorModelStage({
        adapterId: 'custom',
        attemptId: 'attempt',
        candidate,
        caseArtifactDirectory,
        codexVersion: 'codex-cli test',
        host,
        implementationId: 'custom',
        isDryRun: false,
        packagesRepository: '/packages',
        profileDigest: 'd'.repeat(64),
        qualificationDigest: 'e'.repeat(64),
        project,
        skillDigest: 'f'.repeat(64),
        skillRepository: '/skill',
        snapshotDirectory: path.join(temporaryRoot, 'snapshot'),
        task: 'Complete the test task.',
        useCache: false,
      }),
    ).rejects.toThrow('The project-local candidate runtime was modified after preparation.');
  });
});
